// =============================================
// Assistant Service — SSE client for AI Assembly Assistant (Sprint 6c)
// =============================================

import type {
  AssistantEvent,
  AssistantContext,
  CanvasConfig,
  CanvasAction,
} from "@open-agents/shared";
import { getApiBase } from "./apiConfig";

/** Typed stream events yielded by streamAssistantChat */
export type AssistantStreamEvent =
  | { type: "delta"; delta: string }
  | { type: "action"; action: CanvasAction }
  | { type: "complete"; content: string }
  | { type: "error"; error: string };

/** Stream assistant chat messages from the backend as an async generator */
export async function* streamAssistantChat(
  message: string,
  canvasConfig: CanvasConfig,
  context: AssistantContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): AsyncGenerator<AssistantStreamEvent> {
  const res = await fetch(`${getApiBase()}/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, canvasConfig, context, history }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as { error: string };
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

      const event = JSON.parse(json) as AssistantEvent;

      if (event.type === "assistant:delta" && event.delta) {
        yield { type: "delta", delta: event.delta };
      } else if (event.type === "assistant:action" && event.action) {
        yield { type: "action", action: event.action };
      } else if (event.type === "assistant:complete") {
        yield { type: "complete", content: event.content ?? "" };
      } else if (event.type === "assistant:error") {
        yield { type: "error", error: event.error ?? "Assistant error" };
      }
    }
  }
}

/** Fetch quick suggestions for the current canvas (non-streaming) */
export async function fetchSuggestions(canvasConfig: CanvasConfig): Promise<string[]> {
  const res = await fetch(`${getApiBase()}/assistant/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ canvasConfig }),
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { suggestions: string[] };
  return data.suggestions ?? [];
}
