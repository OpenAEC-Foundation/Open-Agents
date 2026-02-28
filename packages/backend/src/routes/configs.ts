import type { FastifyInstance } from "fastify";
import type { CanvasConfig } from "@open-agents/shared";
import { nanoid } from "nanoid";

// In-memory store for PoC (replace with database later)
const configs = new Map<string, CanvasConfig>();

export async function configRoutes(app: FastifyInstance) {
  // Save a canvas configuration
  app.post<{ Body: CanvasConfig }>("/configs", async (request, reply) => {
    const body = request.body;

    if (!body.nodes || !Array.isArray(body.nodes)) {
      reply.code(400);
      return { error: "Config must contain a nodes array" };
    }

    const config: CanvasConfig = {
      ...body,
      id: nanoid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    configs.set(config.id!, config);
    reply.code(201);
    return config;
  });

  // Get a configuration by ID
  app.get<{ Params: { id: string } }>("/configs/:id", async (request, reply) => {
    const config = configs.get(request.params.id);
    if (!config) {
      reply.code(404);
      return { error: "Config not found" };
    }
    return config;
  });

  // List all configurations
  app.get("/configs", async () => {
    return Array.from(configs.values());
  });

  // Update a configuration
  app.put<{ Params: { id: string }; Body: Partial<CanvasConfig> }>(
    "/configs/:id",
    async (request, reply) => {
      const existing = configs.get(request.params.id);
      if (!existing) {
        reply.code(404);
        return { error: "Config not found" };
      }
      const updated: CanvasConfig = {
        ...existing,
        ...request.body,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      configs.set(existing.id!, updated);
      return updated;
    },
  );

  // Delete a configuration
  app.delete<{ Params: { id: string } }>(
    "/configs/:id",
    async (request, reply) => {
      if (!configs.has(request.params.id)) {
        reply.code(404);
        return { error: "Config not found" };
      }
      configs.delete(request.params.id);
      reply.code(204);
    },
  );
}
