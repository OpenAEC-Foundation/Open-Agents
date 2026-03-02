import * as vscode from "vscode";
import * as path from "path";
import type {
  AgentInfo,
  AgentStatus,
  SpawnAgentRequest,
  SpawnAgentResponse,
  AgentStatusResponse,
  AgentResultResponse,
  ListAgentsResponse,
  VSCodeEvent,
} from "../shared";

// In-memory agent registry
const agents = new Map<string, AgentInfo & { terminal: vscode.Terminal }>();

// Broadcast function, set by httpServer when orchestrator is initialized
let broadcastFn: ((event: VSCodeEvent) => void) | undefined;

export function setBroadcast(fn: (event: VSCodeEvent) => void): void {
  broadcastFn = fn;
}

const AGENT_CLAUDE_MD = `# Agent Instructies

Je bent een gespecialiseerde agent met EEN taak.

## Protocol
1. Lees \`task.md\` in deze directory voor je opdracht
2. Als er een \`context.md\` is, lees die ook
3. Voer de opdracht uit
4. Schrijf je resultaat in \`result.md\`
5. Update \`status.json\`: \`{ "status": "done", "summary": "korte samenvatting" }\`

## Regels
- Werk ALLEEN binnen deze directory (tenzij task.md anders zegt)
- Schrijf ALTIJD result.md als je klaar bent
- Houd result.md beknopt en gestructureerd (max ~500 regels)
- Als je vastloopt, zet status.json op \`{ "status": "error", "summary": "uitleg" }\`
- Begin NIET met vragen stellen — voer de taak direct uit
`;

async function writeFileToUri(filePath: string, content: string): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"));
}

async function readFileFromUri(filePath: string): Promise<string | null> {
  try {
    const uri = vscode.Uri.file(filePath);
    const data = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(data).toString("utf-8");
  } catch {
    return null;
  }
}

export async function spawnAgent(body: unknown): Promise<SpawnAgentResponse> {
  const req = body as SpawnAgentRequest;

  if (agents.has(req.agentId)) {
    throw new Error(`Agent '${req.agentId}' already exists`);
  }

  // Create sandbox directory
  const sandboxUri = vscode.Uri.file(req.sandboxDir);
  await vscode.workspace.fs.createDirectory(sandboxUri);

  // Write task file
  await writeFileToUri(path.join(req.sandboxDir, "task.md"), req.task);

  // Write CLAUDE.md with bridge context + agent instructions
  await writeFileToUri(path.join(req.sandboxDir, "CLAUDE.md"), AGENT_CLAUDE_MD);

  // Write initial status
  await writeFileToUri(
    path.join(req.sandboxDir, "status.json"),
    JSON.stringify({ status: "spawning", summary: "Agent starting up" }, null, 2),
  );

  // Write optional context
  if (req.context) {
    await writeFileToUri(path.join(req.sandboxDir, "context.md"), req.context);
  }

  // Build terminal environment — pass API key if configured so agents don't need interactive auth
  const terminalEnv: Record<string, string> = {};
  const apiKey = vscode.workspace.getConfiguration("open-agents.bridge").get<string>("anthropicApiKey");
  if (apiKey) {
    terminalEnv.ANTHROPIC_API_KEY = apiKey;
  }

  // Create terminal for the agent
  const terminal = vscode.window.createTerminal({
    name: `Agent: ${req.agentId}`,
    cwd: req.sandboxDir,
    env: terminalEnv,
    location: vscode.TerminalLocation.Editor, // Opens as editor tab, not in bottom panel
  });
  terminal.show(false); // Show terminal but don't steal focus

  const terminalId = (await terminal.processId) ?? 0;

  // Write .claude/settings.json to allow autonomous file operations in sandbox
  const claudeSettingsDir = path.join(req.sandboxDir, ".claude");
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(claudeSettingsDir));
  await writeFileToUri(
    path.join(claudeSettingsDir, "settings.json"),
    JSON.stringify({
      permissions: {
        allow: ["Read", "Write", "Edit", "Bash(*)"],
        deny: [],
      },
    }, null, 2),
  );

  // Build Claude command — interactive mode so user can watch the agent work live
  const claudeArgs = req.claudeArgs ?? [];
  const initialPrompt = "Read task.md and execute the task. Write your result to result.md. Update status.json when done.";
  const claudeCmd = [
    "claude",
    `"${initialPrompt}"`,
    "--allowedTools", "Edit,Write,Read,Bash",
    ...claudeArgs,
  ].join(" ");

  // Send the Claude command to the terminal — starts interactive Claude Code session
  terminal.sendText(claudeCmd);

  // Update status to working
  await writeFileToUri(
    path.join(req.sandboxDir, "status.json"),
    JSON.stringify({ status: "working", summary: "Agent is working on task" }, null, 2),
  );

  // Register agent
  const agentInfo: AgentInfo & { terminal: vscode.Terminal } = {
    agentId: req.agentId,
    sandboxDir: req.sandboxDir,
    terminalId,
    status: "working",
    spawnedAt: Date.now(),
    terminal,
  };
  agents.set(req.agentId, agentInfo);

  // Broadcast event
  broadcastFn?.({
    type: "agent.spawned",
    agentId: req.agentId,
    sandboxDir: req.sandboxDir,
  });

  // Watch for terminal close → agent done
  const disposable = vscode.window.onDidCloseTerminal(async (t) => {
    const pid = await t.processId;
    if (pid === terminalId) {
      disposable.dispose();
      await checkAgentCompletion(req.agentId);
    }
  });

  return {
    agentId: req.agentId,
    sandboxDir: req.sandboxDir,
    terminalId,
  };
}

async function checkAgentCompletion(agentId: string): Promise<void> {
  const agent = agents.get(agentId);
  if (!agent) return;

  const statusJson = await readFileFromUri(
    path.join(agent.sandboxDir, "status.json"),
  );

  if (statusJson) {
    try {
      const parsed = JSON.parse(statusJson) as { status: AgentStatus; summary?: string };
      agent.status = parsed.status;
      agent.summary = parsed.summary;
    } catch {
      agent.status = "error";
      agent.summary = "Failed to parse status.json";
    }
  } else {
    // Terminal closed but no status update — check if result.md exists
    const result = await readFileFromUri(
      path.join(agent.sandboxDir, "result.md"),
    );
    agent.status = result ? "done" : "error";
    agent.summary = result ? "Completed (status.json not updated)" : "Terminal closed without result";
  }

  // Broadcast completion
  const resultPreview = await readFileFromUri(
    path.join(agent.sandboxDir, "result.md"),
  );
  broadcastFn?.({
    type: "agent.completed",
    agentId,
    resultPreview: resultPreview?.slice(0, 200) ?? "(no result)",
  });
}

export async function getAgentStatus(body: unknown): Promise<AgentStatusResponse> {
  const req = body as { agentId: string };
  const agent = agents.get(req.agentId);

  if (!agent) {
    throw new Error(`Agent '${req.agentId}' not found`);
  }

  // Re-read status.json for live updates
  const statusJson = await readFileFromUri(
    path.join(agent.sandboxDir, "status.json"),
  );
  if (statusJson) {
    try {
      const parsed = JSON.parse(statusJson) as { status: AgentStatus; summary?: string };
      agent.status = parsed.status;
      agent.summary = parsed.summary;

      // If agent just completed, broadcast
      if (parsed.status === "done" || parsed.status === "error") {
        broadcastFn?.({
          type: "agent.status",
          agentId: req.agentId,
          status: parsed.status,
          summary: parsed.summary,
        });
      }
    } catch {
      // ignore parse errors
    }
  }

  return {
    agentId: req.agentId,
    status: agent.status,
    summary: agent.summary,
  };
}

export async function getAgentResult(body: unknown): Promise<AgentResultResponse> {
  const req = body as { agentId: string };
  const agent = agents.get(req.agentId);

  if (!agent) {
    throw new Error(`Agent '${req.agentId}' not found`);
  }

  const result = await readFileFromUri(
    path.join(agent.sandboxDir, "result.md"),
  );

  // Also refresh status
  const statusJson = await readFileFromUri(
    path.join(agent.sandboxDir, "status.json"),
  );
  if (statusJson) {
    try {
      const parsed = JSON.parse(statusJson) as { status: AgentStatus; summary?: string };
      agent.status = parsed.status;
      agent.summary = parsed.summary;
    } catch {
      // ignore
    }
  }

  return {
    agentId: req.agentId,
    status: agent.status,
    result,
    summary: agent.summary,
  };
}

export async function killAgent(body: unknown): Promise<{ success: boolean }> {
  const req = body as { agentId: string; cleanup?: boolean };
  const agent = agents.get(req.agentId);

  if (!agent) {
    throw new Error(`Agent '${req.agentId}' not found`);
  }

  // Kill terminal
  agent.terminal.dispose();

  // Optional: cleanup sandbox
  if (req.cleanup) {
    try {
      await vscode.workspace.fs.delete(vscode.Uri.file(agent.sandboxDir), {
        recursive: true,
        useTrash: false,
      });
    } catch {
      // ignore cleanup errors
    }
  }

  agents.delete(req.agentId);
  return { success: true };
}

export async function listAgents(): Promise<ListAgentsResponse> {
  const agentList: AgentInfo[] = [];

  for (const [, agent] of agents) {
    // Refresh status from disk
    const statusJson = await readFileFromUri(
      path.join(agent.sandboxDir, "status.json"),
    );
    if (statusJson) {
      try {
        const parsed = JSON.parse(statusJson) as { status: AgentStatus; summary?: string };
        agent.status = parsed.status;
        agent.summary = parsed.summary;
      } catch {
        // ignore
      }
    }

    agentList.push({
      agentId: agent.agentId,
      sandboxDir: agent.sandboxDir,
      terminalId: agent.terminalId,
      status: agent.status,
      summary: agent.summary,
      spawnedAt: agent.spawnedAt,
    });
  }

  return { agents: agentList };
}
