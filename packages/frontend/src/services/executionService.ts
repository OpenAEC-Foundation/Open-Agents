import type {
  ChatEvent,
  AgentNodeData,
  SSEEvent,
  CanvasConfig,
  ExecutionRun,
} from "@open-agents/shared";

const API_BASE = "/api";

/** Chat event types yielded by streamChat */
export type ChatStreamEvent =
  | { type: "session"; sessionId: string }
  | { type: "delta"; delta: string }
  | { type: "complete"; content: string }
  | { type: "error"; error: string };

/** Stream chat messages from the backend as an async generator */
export async function* streamChat(
  message: string,
  agent: AgentNodeData,
  sessionId?: string,
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, agent, sessionId }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json) continue;

      const event = JSON.parse(json) as ChatEvent;

      if (event.type === "chat:session" && event.sessionId) {
        yield { type: "session", sessionId: event.sessionId };
      } else if (event.type === "chat:delta" && event.delta) {
        yield { type: "delta", delta: event.delta };
      } else if (event.type === "chat:complete") {
        yield { type: "complete", content: event.content ?? "" };
      } else if (event.type === "chat:error") {
        yield { type: "error", error: event.error ?? "Chat error" };
      }
    }
  }
}

/** Execution event types yielded by streamExecution */
export type ExecutionStreamEvent = SSEEvent;

/** Start an execution run and return the run metadata */
export async function createExecutionRun(config: CanvasConfig): Promise<ExecutionRun> {
  const res = await fetch(`${API_BASE}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return (await res.json()) as ExecutionRun;
}

/** Stream execution SSE events for a given run */
export async function* streamExecution(runId: string): AsyncGenerator<SSEEvent> {
  const sseRes = await fetch(`${API_BASE}/execute/${runId}/status`);
  if (!sseRes.ok) {
    throw new Error(`SSE connection failed: HTTP ${sseRes.status}`);
  }

  const reader = sseRes.body?.getReader();
  if (!reader) throw new Error("No response body for SSE stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json) continue;

      yield JSON.parse(json) as SSEEvent;
    }
  }
}
