// =============================================
// Assistant API Routes (Sprint 6c — FR-18, FR-19)
// POST /api/assistant/chat — SSE streaming
// POST /api/assistant/suggestions — Non-streaming
// =============================================

import type { FastifyInstance } from "fastify";
import type { AssistantChatRequest } from "@open-agents/shared";
import { streamAssistantChat, generateQuickSuggestions } from "../assistant-engine.js";
import { SSE_HEADERS, sseWrite } from "../sse.js";

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
    raw.writeHead(200, SSE_HEADERS);

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
