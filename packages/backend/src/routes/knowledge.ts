import type { FastifyInstance } from "fastify";
import type { CanvasConfig } from "@open-agents/shared";
import {
  KnowledgeRegistry,
  getModelProfiles,
  getModelProfile,
  getToolProfiles,
  estimateCost,
  validateGraph,
} from "@open-agents/knowledge";

let registry: KnowledgeRegistry | null = null;

async function getRegistry(): Promise<KnowledgeRegistry> {
  if (!registry) {
    registry = new KnowledgeRegistry();
    await registry.initialize();
  }
  return registry;
}

export async function knowledgeRoutes(app: FastifyInstance) {
  // Patterns
  app.get("/knowledge/patterns", async () => {
    const reg = await getRegistry();
    return reg.getPatterns();
  });

  app.get<{ Params: { id: string } }>("/knowledge/patterns/:id", async (request, reply) => {
    const reg = await getRegistry();
    const pattern = reg.getPattern(request.params.id);
    if (!pattern) {
      reply.code(404);
      return { error: "Pattern not found" };
    }
    return pattern;
  });

  // Principles
  app.get("/knowledge/principles", async () => {
    const reg = await getRegistry();
    return reg.getPrinciples();
  });

  // Building blocks
  app.get("/knowledge/blocks", async () => {
    const reg = await getRegistry();
    return reg.getBlocks();
  });

  // Search across all knowledge types
  app.get<{ Querystring: { tags?: string; category?: string; q?: string; type?: string } }>(
    "/knowledge/search",
    async (request) => {
      const reg = await getRegistry();
      return reg.search({
        tags: request.query.tags?.split(","),
        category: request.query.category,
        type: request.query.type as "pattern" | "principle" | "block" | undefined,
        query: request.query.q,
      });
    },
  );

  // Model profiles
  app.get("/knowledge/models", async () => {
    return getModelProfiles();
  });

  // Tool profiles
  app.get("/knowledge/tools", async () => {
    return getToolProfiles();
  });

  // Cost estimation for a canvas config
  app.post<{ Body: CanvasConfig }>("/knowledge/estimate-cost", async (request) => {
    return estimateCost(request.body, getModelProfile);
  });

  // Graph validation for a canvas config
  app.post<{ Body: CanvasConfig }>("/knowledge/validate", async (request) => {
    return validateGraph(request.body, getModelProfile);
  });
}
