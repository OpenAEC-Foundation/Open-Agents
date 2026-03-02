// =============================================
// AI Assembly Assistant Types (Sprint 6c — FR-18, FR-19)
// =============================================

import type { AgentNodeData, CanvasConfig } from "./types.js";

/** Context mode for the assistant — influences system prompt expertise */
export type AssistantContext =
  | "neutral"
  | "code-review"
  | "security"
  | "erpnext"
  | "custom";

/** A single message in the assistant conversation */
export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  /** Canvas actions suggested by the assistant (inline in response) */
  actions?: CanvasAction[];
}

/** Discriminated union of canvas manipulation actions */
export type CanvasAction =
  | { type: "add-node"; data: AgentNodeData; position?: { x: number; y: number } }
  | { type: "remove-node"; nodeId: string }
  | { type: "update-node"; nodeId: string; patch: Partial<AgentNodeData> }
  | { type: "add-edge"; source: string; target: string }
  | { type: "replace-all"; config: CanvasConfig };

/** SSE event types streamed during assistant chat */
export type AssistantEventType =
  | "assistant:delta"
  | "assistant:action"
  | "assistant:complete"
  | "assistant:error";

/** SSE event payload for assistant streaming */
export interface AssistantEvent {
  type: AssistantEventType;
  /** Incremental text chunk */
  delta?: string;
  /** Complete response text */
  content?: string;
  /** Parsed canvas action from assistant response */
  action?: CanvasAction;
  /** Error message */
  error?: string;
  timestamp: string;
}

/** Request body for POST /api/assistant/chat */
export interface AssistantChatRequest {
  message: string;
  canvasConfig: CanvasConfig;
  context: AssistantContext;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

/** A smart suggestion for improving the canvas */
export interface AssistantSuggestion {
  label: string;
  description: string;
  action: CanvasAction;
}

/** Response from POST /api/assistant/suggestions */
export interface AssistantSuggestionsResponse {
  suggestions: AssistantSuggestion[];
}
