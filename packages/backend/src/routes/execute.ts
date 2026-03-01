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

    // Validate: each node needs id and type-specific required fields
    for (const node of config.nodes) {
      if (!node.id) {
        reply.code(400);
        return { error: `Node is missing required 'id' field` };
      }
      const d = node.data as unknown as Record<string, unknown>;
      const nodeType = node.type ?? "agent";
      if (nodeType === "agent" && !d.systemPrompt) {
        reply.code(400);
        return { error: `Agent node "${node.id}" requires data.systemPrompt` };
      }
      if (nodeType === "dispatcher" && !d.routingPrompt) {
        reply.code(400);
        return { error: `Dispatcher node "${node.id}" requires data.routingPrompt` };
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

    // Check that provider keys are available for nodes that use a model
    const modelFields = config.nodes
      .map((n) => {
        const d = n.data as unknown as Record<string, unknown>;
        return (d.model ?? d.routingModel) as string | undefined;
      })
      .filter(Boolean) as string[];
    const providers = new Set(modelFields.map((m) => m.split("/")[0]));
    for (const provider of providers) {
      const key = getApiKey(provider as "anthropic" | "openai" | "mistral" | "ollama");
      if (!key && provider !== "ollama" && provider !== "anthropic") {
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
      if (run.status === "completed" || run.status === "error" || run.status === "cancelled") {
        raw.end();
        return;
      }

      // Subscribe to new events
      const unsubscribe = engine.subscribe(request.params.id, (event) => {
        raw.write(`data: ${JSON.stringify(event)}\n\n`);

        // Close SSE stream on terminal events
        if (
          event.type === "run:complete" ||
          event.type === "run:paused" ||
          event.type === "run:cancelled"
        ) {
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

  // =========================================================================
  // Sprint 3: Execution Control Endpoints
  // =========================================================================

  // Pause a running execution after the current step
  app.post<{ Params: { id: string } }>(
    "/execute/:id/pause",
    async (request, reply) => {
      const ok = engine.pauseRun(request.params.id);
      if (!ok) {
        reply.code(409);
        return { error: "Run is not in a pauseable state" };
      }
      return { ok: true };
    },
  );

  // Resume a paused execution
  app.post<{ Params: { id: string } }>(
    "/execute/:id/resume",
    async (request, reply) => {
      const ok = engine.resumeRun(request.params.id);
      if (!ok) {
        reply.code(409);
        return { error: "Run is not paused" };
      }
      return { ok: true };
    },
  );

  // Cancel a running or paused execution
  app.post<{ Params: { id: string } }>(
    "/execute/:id/cancel",
    async (request, reply) => {
      const ok = engine.cancelRun(request.params.id);
      if (!ok) {
        reply.code(409);
        return { error: "Run cannot be cancelled" };
      }
      return { ok: true };
    },
  );

  // Submit an error decision (retry/skip/abort) for a failed step
  app.post<{
    Params: { id: string };
    Body: { decision: "retry" | "skip" | "abort" };
  }>(
    "/execute/:id/decision",
    async (request, reply) => {
      const { decision } = request.body;
      if (!decision || !["retry", "skip", "abort"].includes(decision)) {
        reply.code(400);
        return { error: "Invalid decision. Must be 'retry', 'skip', or 'abort'." };
      }
      const ok = engine.submitErrorDecision(request.params.id, decision);
      if (!ok) {
        reply.code(409);
        return { error: "No pending decision for this run" };
      }
      return { ok: true };
    },
  );
}
