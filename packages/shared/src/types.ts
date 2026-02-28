// =============================================
// Open-Agents Shared Types
// Canvas, Agent, and Execution types
// =============================================

/** Supported model providers */
export type ModelProvider = "anthropic" | "openai" | "mistral" | "ollama";

/** Provider-specific model identifiers */
export type AnthropicModel = "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-6";
export type OpenAIModel = "gpt-4o" | "gpt-4o-mini" | "o3" | "o4-mini" | "codex-mini";
export type MistralModel = "mistral-large" | "mistral-small" | "codestral" | "mistral-nemo";
export type OllamaModel = string; // user-installed models, not enumerable

/**
 * Model identifier in "provider/model" format.
 * Examples: "anthropic/claude-sonnet-4-6", "mistral/mistral-large", "openai/o3"
 */
export type ModelId =
  | `anthropic/${AnthropicModel}`
  | `openai/${OpenAIModel}`
  | `mistral/${MistralModel}`
  | `ollama/${OllamaModel}`;

/** Tools that an agent can use */
export type AgentTool =
  | "Read"
  | "Write"
  | "Edit"
  | "Bash"
  | "Glob"
  | "Grep"
  | "WebSearch"
  | "WebFetch";

/** Agent node data as stored in canvas */
export interface AgentNodeData {
  name: string;
  description?: string;
  model: ModelId;
  maxTokens?: number;
  systemPrompt: string;
  tools: AgentTool[];
}

/** Node types supported by the canvas */
export type NodeType = "agent" | "dispatcher" | "aggregator";

/** A node on the canvas */
export interface CanvasNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: AgentNodeData;
}

/** An edge (connection) between two nodes */
export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

/** Complete canvas configuration (export format) */
export interface CanvasConfig {
  id?: string;
  name?: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  createdAt?: string;
  updatedAt?: string;
}

/** Execution status for a node or run */
export type ExecutionStatus = "idle" | "running" | "completed" | "error";

/** A single step in an execution run */
export interface ExecutionStep {
  nodeId: string;
  status: ExecutionStatus;
  output?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

/** A complete execution run */
export interface ExecutionRun {
  id: string;
  configId: string;
  status: ExecutionStatus;
  steps: ExecutionStep[];
  startedAt: string;
  completedAt?: string;
}

/** SSE event types sent during execution */
export type SSEEventType = "step:start" | "step:output" | "step:complete" | "step:error" | "run:complete";

/** SSE event payload */
export interface SSEEvent {
  type: SSEEventType;
  runId: string;
  nodeId?: string;
  data?: string;
  timestamp: string;
}

/** UI skill level — controls how technical the interface appears */
export type SkillLevel = "beginner" | "intermediate" | "advanced";

/** Tool display info per skill level */
export interface ToolDisplayInfo {
  /** Internal tool name (always used for data) */
  id: AgentTool;
  /** Label shown in the UI */
  label: string;
  /** Short description shown as tooltip */
  tooltip: string;
}

/**
 * Friendly tool labels and descriptions per skill level.
 * Beginner: plain language describing what it does.
 * Intermediate: short technical name.
 * Advanced: exact tool name.
 */
export const TOOL_DISPLAY: Record<SkillLevel, Record<AgentTool, ToolDisplayInfo>> = {
  beginner: {
    Read:      { id: "Read",      label: "Read files",      tooltip: "Can read files and documents" },
    Write:     { id: "Write",     label: "Create files",    tooltip: "Can create new files" },
    Edit:      { id: "Edit",      label: "Edit files",      tooltip: "Can modify existing files" },
    Bash:      { id: "Bash",      label: "Run commands",    tooltip: "Can execute system commands" },
    Glob:      { id: "Glob",      label: "Find files",      tooltip: "Can search for files by name" },
    Grep:      { id: "Grep",      label: "Search in files", tooltip: "Can search for text inside files" },
    WebSearch: { id: "WebSearch", label: "Web search",      tooltip: "Can search the internet" },
    WebFetch:  { id: "WebFetch",  label: "Fetch webpage",   tooltip: "Can read a webpage" },
  },
  intermediate: {
    Read:      { id: "Read",      label: "Read",       tooltip: "Read files" },
    Write:     { id: "Write",     label: "Write",      tooltip: "Write new files" },
    Edit:      { id: "Edit",      label: "Edit",       tooltip: "Edit existing files" },
    Bash:      { id: "Bash",      label: "Terminal",   tooltip: "Run shell commands" },
    Glob:      { id: "Glob",      label: "File search", tooltip: "Find files by pattern" },
    Grep:      { id: "Grep",      label: "Text search", tooltip: "Search file contents" },
    WebSearch: { id: "WebSearch", label: "Web search", tooltip: "Search the web" },
    WebFetch:  { id: "WebFetch",  label: "Fetch URL",  tooltip: "Fetch a URL" },
  },
  advanced: {
    Read:      { id: "Read",      label: "Read",      tooltip: "Read tool — read file contents" },
    Write:     { id: "Write",     label: "Write",     tooltip: "Write tool — create/overwrite files" },
    Edit:      { id: "Edit",      label: "Edit",      tooltip: "Edit tool — string replacement in files" },
    Bash:      { id: "Bash",      label: "Bash",      tooltip: "Bash tool — execute shell commands" },
    Glob:      { id: "Glob",      label: "Glob",      tooltip: "Glob tool — file pattern matching" },
    Grep:      { id: "Grep",      label: "Grep",      tooltip: "Grep tool — regex content search" },
    WebSearch: { id: "WebSearch", label: "WebSearch", tooltip: "WebSearch tool — web search" },
    WebFetch:  { id: "WebFetch",  label: "WebFetch",  tooltip: "WebFetch tool — fetch URL content" },
  },
};

/** Model display info per skill level */
export interface ModelDisplayInfo {
  id: ModelId;
  label: string;
  tooltip: string;
}

/** LLM provider connection status */
export type ConnectionStatus = "disconnected" | "validating" | "connected" | "error";

/** Request to validate an API key */
export interface ConnectRequest {
  provider: ModelProvider;
  apiKey: string;
}

/** Response from key validation */
export interface ConnectResponse {
  status: "ok" | "error";
  provider: ModelProvider;
  /** Which models are available with this key */
  availableModels?: string[];
  error?: string;
}

/** Current connection state per provider */
export interface ProviderConnection {
  provider: ModelProvider;
  status: ConnectionStatus;
  /** Masked key for display (e.g. "sk-ant-...xyz") */
  maskedKey?: string;
  connectedAt?: string;
}

// =============================================
// Chat Types
// =============================================

/** A single chat message */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/** Chat session state (tracked per node) */
export interface ChatSession {
  nodeId: string;
  sessionId?: string;
  messages: ChatMessage[];
}

/** SSE events streamed during chat */
export type ChatEventType = "chat:session" | "chat:delta" | "chat:complete" | "chat:error";

export interface ChatEvent {
  type: ChatEventType;
  sessionId?: string;
  delta?: string;
  content?: string;
  error?: string;
  timestamp: string;
}

// =============================================
// Agent Presets (D-033)
// =============================================

/** Agent preset loaded from agents/presets/*.json */
export interface AgentPreset {
  /** Unique identifier derived from filename (e.g., "code-reviewer") */
  id: string;
  /** Display name */
  name: string;
  /** What this agent does */
  description: string;
  /** Category for sidebar grouping */
  category?: string;
  /** Tags for filtering */
  tags?: string[];
  /** Full agent configuration for the canvas */
  agent: AgentNodeData;
}

/** Health check response */
export interface HealthResponse {
  status: "ok";
  version: string;
  uptime: number;
  /** Which providers have valid API keys */
  providers?: ProviderConnection[];
}
