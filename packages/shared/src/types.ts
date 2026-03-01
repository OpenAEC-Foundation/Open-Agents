// =============================================
// Open-Agents Shared Types
// Canvas, Agent, and Execution types
// =============================================

/** Supported model providers */
export type ModelProvider = "anthropic" | "openai" | "mistral" | "ollama" | "cli";

/** Provider-specific model identifiers */
export type AnthropicModel = "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-6";
export type OpenAIModel = "gpt-4o" | "gpt-4o-mini" | "o3" | "o4-mini" | "codex-mini";
export type MistralModel = "mistral-large" | "mistral-small" | "codestral" | "mistral-nemo";
export type OllamaModel = string; // user-installed models, not enumerable

/**
 * Model identifier in "provider/model" format.
 * Examples: "anthropic/claude-sonnet-4-6", "mistral/mistral-large", "openai/o3"
 */
/** CLI-based model (runs via VS Code bridge terminal) */
export type CLIModel = "claude";

export type ModelId =
  | `anthropic/${AnthropicModel}`
  | `openai/${OpenAIModel}`
  | `mistral/${MistralModel}`
  | `ollama/${OllamaModel}`
  | `cli/${CLIModel}`;

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

/** Agent maturity level — describes how autonomous the agent is (D-042) */
export type AgentMaturity = "prompt-template" | "tool-capable" | "autonomous";

/** Derive maturity level from tools array when not explicitly set */
export function deriveMaturity(tools: AgentTool[]): AgentMaturity {
  return tools.length === 0 ? "prompt-template" : "tool-capable";
}

/** Runtime config for a node on the canvas. Minimal data needed for execution. See also AgentDefinition (library record) and AgentPreset (preset loader). */
export interface AgentNodeData {
  name: string;
  description?: string;
  model: ModelId;
  maxTokens?: number;
  systemPrompt: string;
  tools: AgentTool[];
  maturity?: AgentMaturity;
}

/**
 * Node types supported by the canvas.
 * Current PoC: agent, dispatcher, aggregator.
 * Planned (D-023): teammate, skill, connector, gate.
 * "aggregator" is a PoC utility type for merging parallel outputs (not in D-023 taxonomy).
 */
export type NodeType = "agent" | "dispatcher" | "aggregator";

/** Dispatcher node data — routes tasks to specialist agents */
export interface DispatcherNodeData {
  name: string;
  description?: string;
  routingPrompt: string;
  routingModel: ModelId;
  maxParallel: number;
  timeoutMs: number;
}

/** Aggregator node data — merges parallel agent outputs */
export interface AggregatorNodeData {
  name: string;
  description?: string;
  aggregationStrategy: "concatenate" | "synthesize";
  aggregationModel?: ModelId;
  aggregationPrompt?: string;
}

/** Union of all node data types */
export type CanvasNodeData = AgentNodeData | DispatcherNodeData | AggregatorNodeData;

/** A node on the canvas */
export interface CanvasNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: CanvasNodeData;
}

/** Type guards for canvas node discrimination */
export function isAgentNode(node: CanvasNode): node is CanvasNode & { type: "agent"; data: AgentNodeData } {
  return node.type === "agent";
}
export function isDispatcherNode(node: CanvasNode): node is CanvasNode & { type: "dispatcher"; data: DispatcherNodeData } {
  return node.type === "dispatcher";
}
export function isAggregatorNode(node: CanvasNode): node is CanvasNode & { type: "aggregator"; data: AggregatorNodeData } {
  return node.type === "aggregator";
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
export type ExecutionStatus = "idle" | "running" | "paused" | "cancelled" | "completed" | "error";

/** A single step in an execution run */
export interface ExecutionStep {
  nodeId: string;
  status: ExecutionStatus;
  output?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  elapsedMs?: number;
}

/** A complete execution run */
export interface ExecutionRun {
  id: string;
  configId: string;
  status: ExecutionStatus;
  steps: ExecutionStep[];
  startedAt: string;
  completedAt?: string;
  pausedAt?: string;
}

/** SSE event types sent during execution */
export type SSEEventType =
  | "step:start"
  | "step:output"
  | "step:complete"
  | "step:error"
  | "step:skipped"
  | "step:timing"
  | "pool:start"
  | "pool:complete"
  | "run:complete"
  | "run:paused"
  | "run:cancelled"
  | "run:error:awaiting-decision"
  | "safety:violation";

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

// =============================================
// Maturity Display Metadata (D-042)
// =============================================

export interface MaturityDisplayInfo {
  id: AgentMaturity;
  label: string;
  tooltip: string;
  color: string;
}

export const MATURITY_DISPLAY: Record<SkillLevel, Record<AgentMaturity, MaturityDisplayInfo>> = {
  beginner: {
    "prompt-template": { id: "prompt-template", label: "Text only", tooltip: "Takes text in, gives text out", color: "bg-zinc-500" },
    "tool-capable":    { id: "tool-capable",    label: "Has tools", tooltip: "Can use tools like reading files", color: "bg-blue-500" },
    autonomous:        { id: "autonomous",      label: "Autonomous", tooltip: "Makes its own decisions", color: "bg-purple-500" },
  },
  intermediate: {
    "prompt-template": { id: "prompt-template", label: "Template",    tooltip: "Single-turn prompt template", color: "bg-zinc-500" },
    "tool-capable":    { id: "tool-capable",    label: "Tool-capable", tooltip: "Has tools, single-purpose", color: "bg-blue-500" },
    autonomous:        { id: "autonomous",      label: "Autonomous",  tooltip: "Multi-turn with own decisions", color: "bg-purple-500" },
  },
  advanced: {
    "prompt-template": { id: "prompt-template", label: "prompt-template", tooltip: "No tools, single-turn, text in/out", color: "bg-zinc-500" },
    "tool-capable":    { id: "tool-capable",    label: "tool-capable",    tooltip: "Tools + single-purpose + limited autonomy", color: "bg-blue-500" },
    autonomous:        { id: "autonomous",      label: "autonomous",      tooltip: "Tools + multi-turn loop + own decisions + skills", color: "bg-purple-500" },
  },
};

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

/**
 * A preset agent loaded from agents/presets/*.json.
 * Wraps AgentNodeData inside an `agent` field with display metadata (name, description, category, tags).
 * See also AgentDefinition (library record) and AgentNodeData (canvas runtime).
 */
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
  /** Agent maturity level (D-042) */
  maturity?: AgentMaturity;
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

// =============================================
// Model Metadata (centralized — was duplicated in Sidebar + AgentNode)
// =============================================

export interface ModelMeta {
  id: ModelId;
  provider: ModelProvider;
  labels: Record<SkillLevel, string>;
  color: string;
}

/** All supported models with display metadata */
export const MODEL_CATALOG: ModelMeta[] = [
  { id: "anthropic/claude-haiku-4-5", provider: "anthropic", labels: { beginner: "Fast & cheap", intermediate: "Haiku", advanced: "Haiku" }, color: "bg-emerald-500" },
  { id: "anthropic/claude-sonnet-4-6", provider: "anthropic", labels: { beginner: "Balanced", intermediate: "Sonnet", advanced: "Sonnet" }, color: "bg-blue-500" },
  { id: "anthropic/claude-opus-4-6", provider: "anthropic", labels: { beginner: "Most capable", intermediate: "Opus", advanced: "Opus" }, color: "bg-purple-500" },
  { id: "openai/gpt-4o", provider: "openai", labels: { beginner: "GPT (fast)", intermediate: "GPT-4o", advanced: "GPT-4o" }, color: "bg-teal-500" },
  { id: "openai/o3", provider: "openai", labels: { beginner: "GPT (reasoning)", intermediate: "o3", advanced: "o3" }, color: "bg-teal-500" },
  { id: "mistral/mistral-large", provider: "mistral", labels: { beginner: "Mistral (large)", intermediate: "Mistral L", advanced: "Mistral L" }, color: "bg-orange-500" },
];

/** Lookup model metadata by id. Falls back to a generic entry. */
export function getModelMeta(id: string): ModelMeta {
  const found = MODEL_CATALOG.find((m) => m.id === id);
  if (found) return found;
  const provider = (id.split("/")[0] ?? "anthropic") as ModelProvider;
  const shortName = id.split("/").pop() ?? id;
  return {
    id: id as ModelId,
    provider,
    labels: { beginner: shortName, intermediate: shortName, advanced: shortName },
    color: "bg-zinc-500",
  };
}

// =============================================
// App Navigation
// =============================================

/** Tab identifiers for main app navigation */
export type AppTab = "canvas" | "runs" | "factory" | "library" | "settings";

// =============================================
// Agent Definitions (Sprint 2 — Factory-created agents)
// =============================================

/**
 * Library record for a user-created or generated agent.
 * Extends AgentNodeData with storage metadata (id, timestamps, category, tags).
 * See also AgentNodeData (canvas runtime) and AgentPreset (preset loader).
 */
export interface AgentDefinition extends AgentNodeData {
  id: string;
  /** Required in library records (narrowed from optional in AgentNodeData). */
  description: string;
  category?: string;
  tags?: string[];
  source?: "preset" | "library" | "user" | "generated";
  readonly?: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Safety Rules (Sprint 5 — D-034)
// =============================================

/** Permission mode for an agent */
export type PermissionMode = "read-only" | "edit" | "full-access";

/** Safety rules applied to a single agent node */
export interface AgentSafetyRules {
  /** Which tools are allowed (subset of AgentTool). Empty = all blocked. */
  allowedTools: AgentTool[];
  /** Regex patterns for blocked bash commands */
  bashBlacklist: string[];
  /** Glob patterns for allowed file access. Empty array = no restriction. */
  fileWhitelist: string[];
  /** Overall permission mode */
  permissionMode: PermissionMode;
}

/** Global safety rules that apply to all agents */
export interface GlobalSafetyRules {
  /** Tools blocked globally (applied before per-agent rules) */
  blockedTools: AgentTool[];
  /** Bash patterns blocked globally */
  bashBlacklist: string[];
  /** File access patterns enforced globally */
  fileWhitelist: string[];
  /** Default permission mode for agents without explicit rules */
  defaultPermissionMode: PermissionMode;
}

/** Complete safety configuration */
export interface SafetyConfig {
  global: GlobalSafetyRules;
  /** Per-node overrides, keyed by node ID */
  perNode: Record<string, AgentSafetyRules>;
}

/** Result of testing a command against safety rules */
export interface SafetyTestResult {
  allowed: boolean;
  reason?: string;
  matchedRule?: string;
}

// =============================================
// Audit Trail (Sprint 5 — D-035)
// =============================================

/** Status of an audit entry */
export type AuditStatus = "success" | "error" | "blocked";

/** A single audit entry logged during execution */
export interface AuditEntry {
  id: string;
  runId: string;
  nodeId: string;
  agentName: string;
  tool: string;
  input: string;
  output: string;
  status: AuditStatus;
  timestamp: string;
  durationMs: number;
}

/** Summary of an execution run for the runs list */
export interface RunSummary {
  id: string;
  configId: string;
  configName?: string;
  status: ExecutionStatus;
  nodeCount: number;
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  entryCounts: { success: number; error: number; blocked: number };
}

/** Filters for querying audit entries */
export interface AuditFilter {
  runId?: string;
  nodeId?: string;
  agentName?: string;
  tool?: string;
  status?: AuditStatus;
  fromDate?: string;
  toDate?: string;
}

// =============================================
// Flow Templates (Sprint 3 — D-003)
// =============================================

/** A reusable flow or pool template */
export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  type?: "flow" | "pool";
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
