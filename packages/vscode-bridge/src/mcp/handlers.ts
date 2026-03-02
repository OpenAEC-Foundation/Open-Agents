import { BRIDGE_BASE_URL } from "../shared";

const baseUrl = process.env.VSCODE_CTRL_URL ?? BRIDGE_BASE_URL;

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || res.statusText);
  }
  return res.json();
}

async function post(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || res.statusText);
  }
  return res.json();
}

function text(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// Health & Status
export const getHealth = async () => text(await get("/health"));
export const getWorkspaceState = async () => text(await get("/workspace-state"));
export const getWindowState = async () => text(await get("/window-state"));

// Editor
export const getActiveEditor = async () => text(await get("/active-editor"));
export const getOpenFiles = async () => text(await get("/open-files"));
export const openFile = async (args: Record<string, unknown>) => text(await post("/open-file", args));
export const getText = async (args: Record<string, unknown>) => text(await post("/get-text", args));
export const insertText = async (args: Record<string, unknown>) => text(await post("/insert-text", args));
export const replaceText = async (args: Record<string, unknown>) => text(await post("/replace-text", args));
export const executeCommand = async (args: Record<string, unknown>) => text(await post("/execute-command", args));

// Terminal
export const listTerminals = async () => text(await get("/terminals"));
export const createTerminal = async (args: Record<string, unknown>) => text(await post("/create-terminal", args));
export const sendTerminalText = async (args: Record<string, unknown>) => text(await post("/send-text", args));

// Files
export const readFile = async (args: Record<string, unknown>) => text(await post("/read-file", args));
export const writeFile = async (args: Record<string, unknown>) => text(await post("/write-file", args));
export const listDirectory = async (args: Record<string, unknown>) => text(await post("/list-directory", args));

// SCM, Debug, Extensions, Tasks
export const getScmState = async () => text(await get("/scm-state"));
export const getDebugState = async () => text(await get("/debug-state"));
export const listExtensions = async () => text(await get("/extensions"));
export const listTasks = async () => text(await get("/tasks"));
export const runTask = async (args: Record<string, unknown>) => text(await post("/run-task", args));

// Orchestrator
export const spawnAgent = async (args: Record<string, unknown>) => text(await post("/orchestrator/spawn-agent", args));
export const getAgentStatus = async (args: Record<string, unknown>) => text(await post("/orchestrator/agent-status", args));
export const getAgentResult = async (args: Record<string, unknown>) => text(await post("/orchestrator/agent-result", args));
export const killAgent = async (args: Record<string, unknown>) => text(await post("/orchestrator/kill-agent", args));
export const listAgents = async () => text(await get("/orchestrator/agents"));
