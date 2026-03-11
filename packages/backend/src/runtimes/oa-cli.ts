import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  AgentRuntime,
  AgentEvent,
  RuntimeExecutionConfig,
  OaAgentRecord,
} from "@open-agents/shared";

const OA_BIN = join(homedir(), ".local", "bin", "oa");
const AGENTS_JSON = join(homedir(), ".oa", "agents.json");

/**
 * oa-cli (tmux) runtime adapter — Sprint 15.
 * Executes agents via `oa run` in tmux sessions managed by oa-cli.
 *
 * Architecture:
 *   Open-Agents backend → child_process → oa run → tmux → claude CLI
 *
 * Unlike ClaudeCLIRuntime (VS Code bridge), this runtime:
 * - Uses oa-cli's tmux-based agent management
 * - Reads status from ~/.oa/agents.json
 * - Supports the full oa-cli lifecycle (spawn, poll, kill, collect)
 */
export class OaCLIRuntime implements AgentRuntime {
  readonly name = "Tmux (oa-cli)";
  readonly provider = "tmux";

  /** Check if oa-cli and tmux are available */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(OA_BIN, ["status", "--json"], { timeout: 5000 }, (err) => {
        resolve(!err);
      });
    });
  }

  async *execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent> {
    const agentName = `canvas-${config.nodeId}-${Date.now()}`;

    yield {
      type: "start",
      nodeId: config.nodeId,
      timestamp: new Date().toISOString(),
    };

    try {
      const task = this.buildTask(config);
      const model = this.resolveModel(config.agent.model);

      // Spawn agent via oa run
      await this.spawnAgent(agentName, task, model);

      // Poll until done
      const result = await this.pollUntilDone(
        agentName,
        config.abortSignal,
      );

      yield {
        type: "output",
        nodeId: config.nodeId,
        data: result,
        timestamp: new Date().toISOString(),
      };

      yield {
        type: "complete",
        nodeId: config.nodeId,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      this.killAgent(agentName).catch(() => {});

      yield {
        type: "error",
        nodeId: config.nodeId,
        data: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /** Map tmux/claude → claude/sonnet, tmux/ollama → ollama model */
  private resolveModel(modelId: string): string {
    const suffix = modelId.split("/")[1] ?? "claude";
    if (suffix === "claude") return "claude/sonnet";
    if (suffix === "ollama") return "ollama/llama3";
    return `claude/${suffix}`;
  }

  /** Build task description from agent config */
  private buildTask(config: RuntimeExecutionConfig): string {
    const lines: string[] = [];
    lines.push(`# Task: ${config.agent.name}`);
    lines.push("");

    if (config.agent.description) {
      lines.push(config.agent.description);
      lines.push("");
    }

    lines.push("## Instructions");
    lines.push("");
    lines.push(config.agent.systemPrompt);

    if (config.previousOutput) {
      lines.push("");
      lines.push("## Previous Agent Output");
      lines.push("");
      lines.push(config.previousOutput);
    }

    return lines.join("\n");
  }

  /** Spawn an agent via oa run */
  private spawnAgent(
    name: string,
    task: string,
    model: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(
        OA_BIN,
        ["run", task, "--name", name, "--model", model, "--direct"],
        { timeout: 30_000 },
        (err, _stdout, stderr) => {
          if (err) {
            reject(
              new Error(
                `oa run failed: ${stderr || err.message}`,
              ),
            );
          } else {
            resolve();
          }
        },
      );
    });
  }

  /** Read ~/.oa/agents.json and find agent by name */
  private async getAgentRecord(
    name: string,
  ): Promise<OaAgentRecord | undefined> {
    try {
      const raw = await readFile(AGENTS_JSON, "utf-8");
      const agents: OaAgentRecord[] = JSON.parse(raw);
      return agents.find((a) => a.name === name);
    } catch {
      return undefined;
    }
  }

  /** Poll agent status until done or error */
  private async pollUntilDone(
    name: string,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    const pollInterval = 3000;
    const maxWait = 10 * 60 * 1000; // 10 minutes
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      if (abortSignal?.aborted) {
        await this.killAgent(name);
        throw new Error("Execution cancelled");
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const record = await this.getAgentRecord(name);
      if (!record) continue;

      if (record.status === "done") {
        return await this.getResult(name, record.workspace);
      }

      if (record.status === "error" || record.status === "killed") {
        throw new Error(`Agent ${name} ended with status: ${record.status}`);
      }
    }

    await this.killAgent(name);
    throw new Error("Agent timed out after 10 minutes");
  }

  /** Read agent result via oa collect or from workspace */
  private async getResult(
    name: string,
    workspace?: string,
  ): Promise<string> {
    // Try reading result.md from workspace first
    if (workspace) {
      try {
        const resultPath = join(workspace, "output", "result.md");
        return await readFile(resultPath, "utf-8");
      } catch {
        // Fall through to oa collect
      }
    }

    // Fallback: use oa collect
    return new Promise((resolve, reject) => {
      execFile(
        OA_BIN,
        ["collect", name],
        { timeout: 10_000 },
        (err, stdout, stderr) => {
          if (err) {
            reject(
              new Error(
                `oa collect failed: ${stderr || err.message}`,
              ),
            );
          } else {
            resolve(stdout || "(no result)");
          }
        },
      );
    });
  }

  /** Kill agent via oa kill */
  private killAgent(name: string): Promise<void> {
    return new Promise((resolve) => {
      execFile(
        OA_BIN,
        ["kill", name],
        { timeout: 10_000 },
        () => resolve(),
      );
    });
  }
}
