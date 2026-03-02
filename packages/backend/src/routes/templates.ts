import type { FastifyInstance } from "fastify";
import { loadTemplates, getTemplate } from "../template-loader.js";

export async function templateRoutes(app: FastifyInstance) {
  // List all flow templates
  app.get("/templates", async () => {
    return await loadTemplates();
  });

  // Get a single template by ID
  app.get<{ Params: { id: string } }>(
    "/templates/:id",
    async (request, reply) => {
      // Ensure templates are loaded
      await loadTemplates();
      const template = getTemplate(request.params.id);
      if (!template) {
        reply.code(404);
        return { error: `Template "${request.params.id}" not found` };
      }
      return template;
    },
  );
}
