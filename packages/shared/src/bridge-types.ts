// ============================================
// VS Code Bridge Types
// HTTP bridge contract between Open-Agents and VS Code Extension Host
// Migrated from Open-VSCode-Controller
// ============================================

// ---- CONSTANTS ----

export const BRIDGE_PORT = 7483;
export const BRIDGE_HOST = "localhost";
export const BRIDGE_BASE_URL = `http://${BRIDGE_HOST}:${BRIDGE_PORT}`;
export const BRIDGE_WS_URL = `ws://${BRIDGE_HOST}:${BRIDGE_PORT}`;
export const BRIDGE_EXTENSION_ID = "open-agents.vscode-bridge";

// ---- HEALTH & STATUS ----

export interface BridgeHealthResponse {
  status: "ok";
  version: string;
  uptime: number;
  workspaceCount: number;
  port: number;
}

// ---- WORKSPACE / WINDOW ----

export interface BridgeWorkspaceFolder {
  name: string;
  uri: string;
  index: number;
}

export interface BridgeWorkspaceStateResponse {
  name: string | undefined;
  rootPath: string | undefined;
  folders: BridgeWorkspaceFolder[];
}

export interface BridgeWindowStateResponse {
  focused: boolean;
  activeViewColumn: number;
}

// ---- EDITOR ----

export interface BridgeCursorPosition {
  line: number;
  character: number;
}

export interface BridgeSelection {
  anchor: BridgeCursorPosition;
  active: BridgeCursorPosition;
  text: string;
}

export interface BridgeActiveEditorResponse {
  filePath: string | null;
  languageId: string | null;
  cursor: BridgeCursorPosition | null;
  selection: BridgeSelection | null;
  isDirty: boolean;
  lineCount: number;
  viewColumn: number | null;
}

export interface BridgeOpenFilesResponse {
  files: Array<{
    filePath: string;
    languageId: string;
    isDirty: boolean;
    isPinned: boolean;
    viewColumn: number;
  }>;
}

export interface BridgeOpenFileRequest {
  path: string;
  line?: number;
  character?: number;
  preview?: boolean;
  viewColumn?: number;
}

export interface BridgeOpenFileResponse {
  success: boolean;
  filePath: string;
}

export interface BridgeGetTextRequest {
  path?: string;
  startLine?: number;
  endLine?: number;
}

export interface BridgeGetTextResponse {
  text: string;
  filePath: string;
  startLine: number;
  endLine: number;
}

export interface BridgeInsertTextRequest {
  path?: string;
  line: number;
  text: string;
}

export interface BridgeReplaceTextRequest {
  path?: string;
  startLine: number;
  endLine: number;
  text: string;
}

export interface BridgeSetCursorRequest {
  line: number;
  character?: number;
}

export interface BridgeCloseEditorRequest {
  path?: string;
  all?: boolean;
}

// ---- FILES ----

export interface BridgeFileExistsResponse {
  exists: boolean;
  isDirectory: boolean;
  path: string;
}

export interface BridgeReadFileRequest {
  path: string;
  encoding?: "utf8" | "base64";
}

export interface BridgeReadFileResponse {
  content: string;
  encoding: "utf8" | "base64";
  path: string;
}

export interface BridgeWriteFileRequest {
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
  createDirectories?: boolean;
}

export interface BridgeDeleteFileRequest {
  path: string;
  recursive?: boolean;
  useTrash?: boolean;
}

export interface BridgeRenameFileRequest {
  oldPath: string;
  newPath: string;
  overwrite?: boolean;
}

export interface BridgeCreateDirectoryRequest {
  path: string;
}

export interface BridgeListDirectoryRequest {
  path: string;
  recursive?: boolean;
}

export interface BridgeListDirectoryResponse {
  entries: Array<{
    name: string;
    path: string;
    type: "file" | "directory" | "symlink";
    size?: number;
  }>;
}

// ---- TERMINAL ----

export interface BridgeTerminalInfo {
  id: number;
  name: string;
  processId: number | undefined;
  isActive: boolean;
}

export interface BridgeListTerminalsResponse {
  terminals: BridgeTerminalInfo[];
}

export interface BridgeCreateTerminalRequest {
  name?: string;
  cwd?: string;
  env?: Record<string, string>;
  shellPath?: string;
  show?: boolean;
}

export interface BridgeCreateTerminalResponse {
  id: number;
  name: string;
}

export interface BridgeSendTextRequest {
  terminalId?: number;
  text: string;
  addNewLine?: boolean;
}

export interface BridgeKillTerminalRequest {
  terminalId?: number;
}

// ---- COMMANDS ----

export interface BridgeExecuteCommandRequest {
  command: string;
  args?: unknown[];
}

export interface BridgeExecuteCommandResponse {
  success: boolean;
  result?: unknown;
}

// ---- EXTENSIONS ----

export interface BridgeExtensionInfo {
  id: string;
  displayName: string;
  version: string;
  isActive: boolean;
  isBuiltin: boolean;
}

export interface BridgeListExtensionsResponse {
  extensions: BridgeExtensionInfo[];
}

// ---- DEBUG ----

export interface BridgeDebugSession {
  id: string;
  name: string;
  type: string;
}

export interface BridgeDebugStateResponse {
  activeSessions: BridgeDebugSession[];
  hasActiveSession: boolean;
}

export interface BridgeStartDebugRequest {
  configName?: string;
  workspaceFolder?: string;
}

// ---- SCM ----

export interface BridgeScmChange {
  uri: string;
  status:
    | "index_modified"
    | "index_added"
    | "index_deleted"
    | "index_renamed"
    | "modified"
    | "added"
    | "deleted"
    | "untracked"
    | "ignored"
    | "conflicting";
}

export interface BridgeScmStateResponse {
  changes: BridgeScmChange[];
  stagedChanges: BridgeScmChange[];
  mergeChanges: BridgeScmChange[];
  repositoryCount: number;
}

// ---- TASKS ----

export interface BridgeTaskDefinition {
  type: string;
  label: string;
  group?: string;
}

export interface BridgeListTasksResponse {
  tasks: BridgeTaskDefinition[];
}

export interface BridgeRunTaskRequest {
  label: string;
}

// ---- WEBSOCKET EVENTS (real-time) ----

export type BridgeEvent =
  | { type: "editor.changed"; filePath: string; languageId: string }
  | { type: "editor.saved"; filePath: string }
  | { type: "editor.closed"; filePath: string }
  | { type: "selection.changed"; filePath: string; selection: BridgeSelection }
  | { type: "file.created"; path: string }
  | { type: "file.deleted"; path: string }
  | { type: "file.changed"; path: string }
  | { type: "terminal.opened"; id: number; name: string }
  | { type: "terminal.closed"; id: number }
  | { type: "debug.started"; session: BridgeDebugSession }
  | { type: "debug.stopped"; sessionId: string }
  | { type: "window.focused" }
  | { type: "window.blurred" }
  | { type: "agent.spawned"; agentId: string; sandboxDir: string }
  | { type: "agent.status"; agentId: string; status: BridgeAgentStatus; summary?: string }
  | { type: "agent.completed"; agentId: string; resultPreview: string };

// ---- ORCHESTRATOR ----

export type BridgeAgentStatus = "spawning" | "working" | "done" | "error";

export interface BridgeSpawnAgentRequest {
  agentId: string;
  sandboxDir: string;
  task: string;
  context?: string;
  claudeArgs?: string[];
}

export interface BridgeSpawnAgentResponse {
  agentId: string;
  sandboxDir: string;
  terminalId: number;
}

export interface BridgeAgentInfo {
  agentId: string;
  sandboxDir: string;
  terminalId: number;
  status: BridgeAgentStatus;
  summary?: string;
  spawnedAt: number;
}

export interface BridgeAgentStatusResponse {
  agentId: string;
  status: BridgeAgentStatus;
  summary?: string;
}

export interface BridgeAgentResultResponse {
  agentId: string;
  status: BridgeAgentStatus;
  result: string | null;
  summary?: string;
}

export interface BridgeListAgentsResponse {
  agents: BridgeAgentInfo[];
}

// ---- GENERIC ERROR ----

export interface BridgeErrorResponse {
  error: string;
  code?: string;
}
