// =============================================
// Open-Agents Runtime Adapter Interface (D-015)
// Abstracts agent execution from specific SDK implementations.
// PoC: ClaudeSDKRuntime. Later: PiAgentRuntime, OllamaRuntime, etc.
// =============================================

import type { AgentNodeData } from "./types.js";

/** Events emitted during agent execution */
export type AgentEventType = "start" | "output" | "complete" | "error";

export interface AgentEvent {
  type: AgentEventType;
  nodeId: string;
  data?: string;
  timestamp: string;
}

/** Configuration passed to a runtime for a single node execution */
export interface RuntimeExecutionConfig {
  nodeId: string;
  agent: AgentNodeData;
  previousOutput?: string;
  abortSignal?: AbortSignal;
  /** Resolved bash/file safety rules for post-hoc scanning (D-035) */
  safetyRules?: {
    bashBlacklist: string[];
    fileWhitelist: string[];
  };
}

/**
 * Runtime adapter interface.
 * Each LLM provider implements this to handle agent execution.
 * The execution engine works exclusively through this interface.
 */
export interface AgentRuntime {
  /** Human-readable name of this runtime (e.g. "Claude Agent SDK") */
  readonly name: string;

  /** Which model provider this runtime handles */
  readonly provider: string;

  /** Execute a single agent node, yielding events as they occur */
  execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent>;
}
