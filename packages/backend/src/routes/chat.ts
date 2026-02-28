import type { FastifyInstance } from "fastify";
import type { AgentNodeData, ChatEvent } from "@open-agents/shared";
import { getApiKey } from "../key-store.js";

interface ChatBody {
  message: string;
  agent: AgentNodeData;
  sessionId?: string;
}

function sseWrite(raw: import("http").ServerResponse, event: ChatEvent): void {
  raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

export async function chatRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatBody }>("/chat", async (request, reply) => {
    const { message, agent, sessionId } = request.body;

    // Validate input
    if (!message || typeof message !== "string") {
      reply.code(400);
      return { error: "message is required" };
    }
    if (!agent?.systemPrompt) {
      reply.code(400);
      return { error: "agent.systemPrompt is required" };
    }
    if (!agent?.model) {
      reply.code(400);
      return { error: "agent.model is required" };
    }

    // Check API key for the agent's provider
    // Note: Anthropic provider uses Agent SDK which authenticates via Claude Code OAuth
    // (stored in ~/.claude/.credentials.json) — no explicit API key needed.
    const provider = agent.model.split("/")[0] as "anthropic" | "openai" | "mistral" | "ollama";
    const apiKey = getApiKey(provider);
    if (!apiKey && provider !== "ollama" && provider !== "anthropic") {
      reply.code(400);
      return { error: `No API key configured for provider "${provider}". Connect via Settings first.` };
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
      // Set API key in env for Agent SDK
      if (apiKey) {
        process.env.ANTHROPIC_API_KEY = apiKey;
      }

      const { query } = await import("@anthropic-ai/claude-agent-sdk");

      // Build query options
      // Strip provider prefix: "anthropic/claude-sonnet-4-6" → "claude-sonnet-4-6"
      const modelId = agent.model.includes("/") ? agent.model.split("/")[1] : agent.model;
      const options: Record<string, unknown> = {
        systemPrompt: agent.systemPrompt,
        allowedTools: agent.tools,
        model: modelId,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: 10,
      };

      // Resume existing session for multi-turn
      if (sessionId) {
        options.resume = sessionId;
      }

      let result = "";

      for await (const msg of query({ prompt: message, options })) {
        // Capture session ID from init message
        if (
          typeof msg === "object" &&
          msg !== null &&
          "type" in msg &&
          (msg as Record<string, unknown>).type === "system" &&
          "subtype" in msg &&
          (msg as Record<string, unknown>).subtype === "init" &&
          "session_id" in msg
        ) {
          sseWrite(raw, {
            type: "chat:session",
            sessionId: (msg as Record<string, unknown>).session_id as string,
            timestamp: new Date().toISOString(),
          });
        }

        // Capture result
        if ("result" in (msg as Record<string, unknown>)) {
          result = (msg as { result: string }).result;
        }
      }

      // Send final result
      sseWrite(raw, {
        type: "chat:complete",
        content: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      sseWrite(raw, {
        type: "chat:error",
        error: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      raw.end();
    }
  });
}
