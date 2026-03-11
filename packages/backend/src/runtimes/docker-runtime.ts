import type {
  AgentRuntime,
  AgentEvent,
  RuntimeExecutionConfig,
} from "@open-agents/shared";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile, readdir, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getApiKey } from "../key-store.js";

const execFileAsync = promisify(execFile);

/**
 * Docker-isolated runtime adapter (D-040, D-101).
 *
 * Runs each agent execution inside a Docker container with:
 * 1. Filesystem isolation — temp workspace as Docker volume mount
 * 2. Network policy — default no outbound; whitelist per agent config
 * 3. Secret injection — API keys as Docker env vars
 * 4. Resource limits — memory, CPU, timeout per container
 * 5. Output capture — artifacts copied from container after run
 * 6. Container image — configurable, defaults to node:20-slim
 */

/** Network policy configuration passed via agent description field (JSON) */
interface DockerNetworkPolicy {
  allowOutbound?: boolean;
  allowedHosts?: string[];
}

/** Parse network policy from agent description (optional JSON block) */
function parseNetworkPolicy(description?: string): DockerNetworkPolicy {
  if (!description) return {};
  const match = description.match(/\{[\s\S]*"netPolicy"[\s\S]*\}/);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[0]) as { netPolicy?: DockerNetworkPolicy };
    return parsed.netPolicy ?? {};
  } catch {
    return {};
  }
}

/** Container image to use — can be overridden via DOCKER_AGENT_IMAGE env var */
const DEFAULT_IMAGE = process.env.DOCKER_AGENT_IMAGE ?? "node:20-slim";

/** Resource limits */
const MEMORY_LIMIT = process.env.DOCKER_MEMORY_LIMIT ?? "2g";
const CPU_LIMIT = process.env.DOCKER_CPU_LIMIT ?? "1.0";
const TIMEOUT_SECONDS = Number(process.env.DOCKER_TIMEOUT_SECONDS ?? "300");

export class DockerRuntime implements AgentRuntime {
  readonly name = "Docker Isolated";
  readonly provider = "docker";

  /** Check if Docker daemon is accessible */
  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync("docker", ["version", "--format", "{{.Server.Version}}"]);
      return true;
    } catch {
      return false;
    }
  }

  async *execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent> {
    const { nodeId, agent, previousOutput, abortSignal } = config;

    yield {
      type: "start",
      nodeId,
      timestamp: new Date().toISOString(),
    };

    // Create temp workspace
    const workspaceDir = await mkdtemp(join(tmpdir(), "oa-docker-"));
    const outputDir = join(workspaceDir, "output");
    await mkdir(outputDir, { recursive: true });

    try {
      // Write agent task script to workspace
      const taskPrompt = previousOutput
        ? `Previous agent output:\n\n${previousOutput}\n\nNow execute your task based on the above context.`
        : "Execute your task.";

      const taskScript = buildTaskScript(agent.systemPrompt, taskPrompt);
      await writeFile(join(workspaceDir, "task.js"), taskScript, "utf-8");

      // Build docker run arguments
      const dockerArgs = buildDockerArgs({
        workspaceDir,
        outputDir,
        image: DEFAULT_IMAGE,
        memoryLimit: MEMORY_LIMIT,
        cpuLimit: CPU_LIMIT,
        timeoutSeconds: TIMEOUT_SECONDS,
        networkPolicy: parseNetworkPolicy(agent.description),
        envVars: resolveSecrets(),
      });

      // Run container
      const result = await runContainer(dockerArgs, abortSignal);

      if (result.exitCode !== 0 && result.stderr) {
        yield {
          type: "error",
          nodeId,
          data: `Container exited with code ${result.exitCode}: ${result.stderr.slice(0, 1000)}`,
          timestamp: new Date().toISOString(),
        };
        return;
      }

      // Collect output artifacts
      const output = await collectOutput(outputDir, result.stdout);

      yield {
        type: "output",
        nodeId,
        data: output,
        timestamp: new Date().toISOString(),
      };

      yield {
        type: "complete",
        nodeId,
        data: output,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown Docker error";
      yield {
        type: "error",
        nodeId,
        data: message,
        timestamp: new Date().toISOString(),
      };
    } finally {
      // Cleanup workspace
      await rm(workspaceDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/** Build a Node.js script that executes the agent task inside the container */
function buildTaskScript(systemPrompt: string, taskPrompt: string): string {
  // Escape for template literal embedding
  const escapeForJS = (s: string): string =>
    s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");

  return `
const fs = require('fs');
const path = require('path');

const systemPrompt = \`${escapeForJS(systemPrompt)}\`;
const taskPrompt = \`${escapeForJS(taskPrompt)}\`;

async function main() {
  const outputDir = '/workspace/output';

  // If ANTHROPIC_API_KEY is available, use Claude API
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // No API key — write system prompt + task as output (dry run)
    const result = [
      '## System Prompt',
      systemPrompt,
      '',
      '## Task',
      taskPrompt,
      '',
      '## Note',
      'No API key available in container. This is a dry run output.',
    ].join('\\n');

    fs.writeFileSync(path.join(outputDir, 'result.txt'), result);
    console.log(result);
    return;
  }

  // Determine which API to call based on available key
  let result;
  if (process.env.ANTHROPIC_API_KEY) {
    result = await callAnthropicAPI(systemPrompt, taskPrompt, process.env.ANTHROPIC_API_KEY);
  } else if (process.env.OPENAI_API_KEY) {
    result = await callOpenAIAPI(systemPrompt, taskPrompt, process.env.OPENAI_API_KEY);
  }

  fs.writeFileSync(path.join(outputDir, 'result.txt'), result || 'No output');
  console.log(result || 'No output');
}

async function callAnthropicAPI(system, task, key) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: task }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? JSON.stringify(data);
}

async function callOpenAIAPI(system, task, key) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: task },
      ],
      max_tokens: 4096,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? JSON.stringify(data);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
`;
}

interface DockerRunArgs {
  workspaceDir: string;
  outputDir: string;
  image: string;
  memoryLimit: string;
  cpuLimit: string;
  timeoutSeconds: number;
  networkPolicy: DockerNetworkPolicy;
  envVars: Record<string, string>;
}

/** Build docker run CLI arguments */
function buildDockerArgs(opts: DockerRunArgs): string[] {
  const args: string[] = [
    "run",
    "--rm",
    // Resource limits
    `--memory=${opts.memoryLimit}`,
    `--cpus=${opts.cpuLimit}`,
    // Timeout via container stop
    `--stop-timeout=${opts.timeoutSeconds}`,
    // Security: drop all capabilities, no privilege escalation
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    // Read-only root filesystem (workspace is writable via mount)
    "--read-only",
    // Temp filesystem for Node.js needs
    "--tmpfs=/tmp:rw,noexec,nosuid,size=256m",
    // Mount workspace
    `-v=${opts.workspaceDir}:/workspace:rw`,
    // Working directory
    "-w=/workspace",
  ];

  // Network policy: default isolated (no network)
  if (!opts.networkPolicy.allowOutbound) {
    args.push("--network=none");
  }
  // If allowedHosts is specified, we still allow network but add DNS restriction info
  // (full iptables-based host filtering requires a custom Docker network — documented as future enhancement)

  // Inject env vars (secrets)
  for (const [key, value] of Object.entries(opts.envVars)) {
    args.push(`-e`, `${key}=${value}`);
  }

  // Image and command
  args.push(opts.image);
  args.push("node", "/workspace/task.js");

  return args;
}

/** Resolve API keys from key-store for injection into container */
function resolveSecrets(): Record<string, string> {
  const secrets: Record<string, string> = {};

  const anthropicKey = getApiKey("anthropic");
  if (anthropicKey) secrets["ANTHROPIC_API_KEY"] = anthropicKey;

  const openaiKey = getApiKey("openai");
  if (openaiKey) secrets["OPENAI_API_KEY"] = openaiKey;

  const mistralKey = getApiKey("mistral");
  if (mistralKey) secrets["MISTRAL_API_KEY"] = mistralKey;

  return secrets;
}

interface ContainerResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Run a Docker container and capture output */
function runContainer(
  dockerArgs: string[],
  abortSignal?: AbortSignal,
): Promise<ContainerResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn("docker", dockerArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    // Handle abort signal
    const onAbort = (): void => {
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 5000);
    };

    if (abortSignal) {
      if (abortSignal.aborted) {
        proc.kill("SIGTERM");
        reject(new Error("Aborted before container started"));
        return;
      }
      abortSignal.addEventListener("abort", onAbort, { once: true });
    }

    // Hard timeout as safety net
    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 5000);
    }, (TIMEOUT_SECONDS + 30) * 1000);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      abortSignal?.removeEventListener("abort", onAbort);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      abortSignal?.removeEventListener("abort", onAbort);
      reject(err);
    });
  });
}

/** Collect output from the container's output directory */
async function collectOutput(outputDir: string, stdout: string): Promise<string> {
  try {
    const files = await readdir(outputDir);
    if (files.length === 0) return stdout || "(no output)";

    const outputs: string[] = [];
    for (const file of files) {
      const content = await readFile(join(outputDir, file), "utf-8");
      outputs.push(`## ${file}\n\n${content}`);
    }
    return outputs.join("\n\n---\n\n");
  } catch {
    return stdout || "(no output)";
  }
}
