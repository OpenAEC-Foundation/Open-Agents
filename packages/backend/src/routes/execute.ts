import type { FastifyInstance } from "fastify";
import type { CanvasConfig, SSEEvent } from "@open-agents/shared";
import * as engine from "../execution-engine.js";
import { getApiKey } from "../key-store.js";

export async function executeRoutes(app: FastifyInstance) {
  // Start execution of a canvas configuration
  app.post<{ Body: CanvasConfig }>("/execute", async (request, reply) => {
    const config = request.body;

    // Validate: must have nodes array
    if (!config.nodes || !Array.isArray(config.nodes) || config.nodes.length === 0) {
      reply.code(400);
      return { error: "Config must contain at least one node" };
    }

    // Validate: each node needs id and systemPrompt
    for (const node of config.nodes) {
      if (!node.id || !node.data?.systemPrompt) {
        reply.code(400);
        return {
          error: `Node ${node.id ?? "(missing id)"} requires id and data.systemPrompt`,
        };
      }
    }

    // Validate: edges reference existing nodes
    if (config.edges && Array.isArray(config.edges)) {
      const nodeIds = new Set(config.nodes.map((n) => n.id));
      for (const edge of config.edges) {
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
          reply.code(400);
          return { error: `Edge references unknown node: ${edge.source} → ${edge.target}` };
        }
      }
    }

    // Check that at least one provider key is available for the models in this config
    const providers = new Set(config.nodes.map((n) => n.data.model.split("/")[0]));
    for (const provider of providers) {
      const key = getApiKey(provider as "anthropic" | "openai" | "mistral" | "ollama");
      if (!key && provider !== "ollama") {
        reply.code(400);
        return { error: `No API key configured for provider "${provider}". Connect via Settings first.` };
      }
    }

    const run = engine.startRun(config);
    reply.code(202);
    return run;
  });

  // Stream execution status via Server-Sent Events
  app.get<{ Params: { id: string } }>(
    "/execute/:id/status",
    async (request, reply) => {
      const run = engine.getRun(request.params.id);
      if (!run) {
        reply.code(404);
        return { error: "Run not found" };
      }

      // Hijack the response for SSE streaming
      reply.hijack();

      const raw = reply.raw;
      raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      });

      // Send buffered events (catch-up for late-connecting clients)
      const buffered = engine.getEvents(request.params.id);
      for (const event of buffered) {
        raw.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // If run is already finished, close immediately
      if (run.status === "completed" || run.status === "error") {
        raw.end();
        return;
      }

      // Subscribe to new events
      const unsubscribe = engine.subscribe(request.params.id, (event) => {
        raw.write(`data: ${JSON.stringify(event)}\n\n`);

        if (event.type === "run:complete") {
          clearTimeout(timeout);
          raw.end();
          unsubscribe();
        }
      });

      // Timeout after 5 minutes
      const timeout = setTimeout(() => {
        unsubscribe();
        const timeoutEvent: SSEEvent = {
          type: "run:complete",
          runId: request.params.id,
          data: "Execution timed out after 5 minutes",
          timestamp: new Date().toISOString(),
        };
        raw.write(`data: ${JSON.stringify(timeoutEvent)}\n\n`);
        raw.end();
      }, 5 * 60 * 1000);

      // Handle client disconnect
      request.raw.on("close", () => {
        clearTimeout(timeout);
        unsubscribe();
      });
    },
  );

  // Get run status as JSON (non-streaming alternative)
  app.get<{ Params: { id: string } }>(
    "/execute/:id",
    async (request, reply) => {
      const run = engine.getRun(request.params.id);
      if (!run) {
        reply.code(404);
        return { error: "Run not found" };
      }
      return run;
    },
  );
}
