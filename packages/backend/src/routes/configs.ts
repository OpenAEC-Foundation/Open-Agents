import type { FastifyInstance } from "fastify";
import type { CanvasConfig } from "@open-agents/shared";
import { nanoid } from "nanoid";

// In-memory store for PoC (replace with database later)
const configs = new Map<string, CanvasConfig>();

export async function configRoutes(app: FastifyInstance) {
  // Save a canvas configuration
  app.post<{ Body: CanvasConfig }>("/configs", async (request, reply) => {
    const config: CanvasConfig = {
      ...request.body,
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
}
