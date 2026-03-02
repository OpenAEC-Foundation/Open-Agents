import type { FastifyInstance } from "fastify";
import type { GlobalSafetyRules, AgentSafetyRules, AgentTool } from "@open-agents/shared";
import {
  getSafetyConfig,
  updateGlobalRules,
  setNodeRules,
  removeNodeRules,
  testCommand,
} from "../safety-store.js";

export async function safetyRoutes(app: FastifyInstance) {
  // Get full safety configuration
  app.get("/safety", async () => {
    return getSafetyConfig();
  });

  // Update global safety rules
  app.put<{ Body: Partial<GlobalSafetyRules> }>(
    "/safety/global",
    async (request) => {
      updateGlobalRules(request.body);
      return getSafetyConfig();
    },
  );

  // Set per-node safety rules
  app.put<{ Params: { id: string }; Body: AgentSafetyRules }>(
    "/safety/node/:id",
    async (request) => {
      setNodeRules(request.params.id, request.body);
      return getSafetyConfig();
    },
  );

  // Remove per-node safety rules
  app.delete<{ Params: { id: string } }>(
    "/safety/node/:id",
    async (request) => {
      removeNodeRules(request.params.id);
      return getSafetyConfig();
    },
  );

  // Test a command against safety rules
  app.post<{
    Body: { nodeId: string; command: string; agentTools: AgentTool[] };
  }>("/safety/test", async (request) => {
    const { nodeId, command, agentTools } = request.body;
    return testCommand(nodeId, command, agentTools);
  });
}
