import type { ServerResponse } from "node:http";

/** Standard SSE response headers. */
export const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "Access-Control-Allow-Origin": "*",
  "X-Accel-Buffering": "no",
};

/** Write a single SSE event to the response stream. */
export function sseWrite<T extends { type: string }>(raw: ServerResponse, event: T): void {
  raw.write(`data: ${JSON.stringify(event)}\n\n`);
}
