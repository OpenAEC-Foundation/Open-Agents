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

/** Health check response */
export interface HealthResponse {
  status: "ok";
  version: string;
  uptime: number;
}
