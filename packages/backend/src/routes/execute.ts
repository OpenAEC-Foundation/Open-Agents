import type { FastifyInstance } from "fastify";
import type { CanvasConfig, ExecutionRun, SSEEvent } from "@open-agents/shared";
import { nanoid } from "nanoid";

// In-memory store for runs
const runs = new Map<string, ExecutionRun>();

export async function executeRoutes(app: FastifyInstance) {
  // Start execution of a canvas configuration
  app.post<{ Body: CanvasConfig }>("/execute", async (request, reply) => {
    const config = request.body;

    const run: ExecutionRun = {
      id: nanoid(),
      configId: config.id ?? "inline",
      status: "running",
      steps: config.nodes.map((node) => ({
        nodeId: node.id,
        status: "idle",
      })),
      startedAt: new Date().toISOString(),
    };

    runs.set(run.id, run);

    // TODO: Sprint 1.4 — integrate with Claude Agent SDK
    // For now, return the run immediately
    reply.code(202);
    return run;
  });

  // Get execution status (SSE streaming placeholder)
  app.get<{ Params: { id: string } }>(
    "/execute/:id/status",
    async (request, reply) => {
      const run = runs.get(request.params.id);
      if (!run) {
        reply.code(404);
        return { error: "Run not found" };
      }

      // TODO: Sprint 1.4 — implement SSE streaming
      // For now, return current status as JSON
      return run;
    },
  );
}
