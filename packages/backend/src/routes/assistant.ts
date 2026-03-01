// =============================================
// Assistant API Routes (Sprint 6c — FR-18, FR-19)
// POST /api/assistant/chat — SSE streaming
// POST /api/assistant/suggestions — Non-streaming
// =============================================

import type { FastifyInstance } from "fastify";
import type { AssistantChatRequest, AssistantEvent } from "@open-agents/shared";
import { streamAssistantChat, generateQuickSuggestions } from "../assistant-engine.js";

function sseWrite(raw: import("http").ServerResponse, event: AssistantEvent): void {
  raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

export async function assistantRoutes(app: FastifyInstance) {
  // =============================================
  // POST /api/assistant/chat — SSE streaming
  // =============================================
  app.post<{ Body: AssistantChatRequest }>("/assistant/chat", async (request, reply) => {
    const { message, canvasConfig, context, history } = request.body;

    if (!message || typeof message !== "string") {
      reply.code(400);
      return { error: "message is required" };
    }

    if (!canvasConfig) {
      reply.code(400);
      return { error: "canvasConfig is required" };
    }

    // Hijack response for SSE streaming
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });

    try {
      for await (const event of streamAssistantChat(
        message,
        canvasConfig,
        context ?? "neutral",
        history ?? [],
      )) {
        sseWrite(raw, event);
      }
    } catch (err: unknown) {
      sseWrite(raw, {
        type: "assistant:error",
        error: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      raw.end();
    }
  });

  // =============================================
  // POST /api/assistant/suggestions — Non-streaming
  // =============================================
  app.post<{ Body: { canvasConfig: unknown } }>("/assistant/suggestions", async (request, reply) => {
    const { canvasConfig } = request.body;

    if (!canvasConfig) {
      reply.code(400);
      return { error: "canvasConfig is required" };
    }

    const suggestions = generateQuickSuggestions(
      canvasConfig as import("@open-agents/shared").CanvasConfig,
    );

    return { suggestions };
  });
}
