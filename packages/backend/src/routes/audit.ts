import type { FastifyInstance } from "fastify";
import type { AuditFilter } from "@open-agents/shared";
import { getRuns, getRunSummary, getEntries, queryEntries } from "../audit-store.js";
import { getEvents } from "../execution-engine.js";

export async function auditRoutes(app: FastifyInstance) {
  // List all runs
  app.get("/runs", async () => {
    return getRuns();
  });

  // Get summary for a specific run
  app.get<{ Params: { id: string } }>(
    "/runs/:id",
    async (request, reply) => {
      const summary = getRunSummary(request.params.id);
      if (!summary) {
        reply.code(404);
        return { error: "Run not found" };
      }
      return summary;
    },
  );

  // Query audit entries with filters
  app.get<{
    Querystring: {
      runId?: string;
      nodeId?: string;
      agentName?: string;
      tool?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    };
  }>("/audit", async (request) => {
    const { runId, nodeId, agentName, tool, status, fromDate, toDate } =
      request.query;

    const filter: AuditFilter = {
      ...(runId && { runId }),
      ...(nodeId && { nodeId }),
      ...(agentName && { agentName }),
      ...(tool && { tool }),
      ...(status && { status: status as AuditFilter["status"] }),
      ...(fromDate && { fromDate }),
      ...(toDate && { toDate }),
    };

    return queryEntries(filter);
  });

  // Replay SSE events for a run
  app.get<{ Params: { id: string } }>(
    "/audit/replay/:id",
    async (request) => {
      return getEvents(request.params.id);
    },
  );
}
