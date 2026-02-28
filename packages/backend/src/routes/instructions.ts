import type { FastifyInstance } from "fastify";
import {
  getInstructions,
  setInstructions,
  getSection,
} from "../instructions-store.js";

export async function instructionRoutes(app: FastifyInstance) {
  // Get full instructions (parsed)
  app.get("/instructions", async () => {
    return getInstructions();
  });

  // Get a specific section
  app.get<{ Params: { section: string } }>(
    "/instructions/section/:section",
    async (request, reply) => {
      const content = await getSection(request.params.section);
      if (content === null) {
        reply.code(404);
        return { error: `Section "${request.params.section}" not found` };
      }
      return { section: request.params.section, content };
    },
  );

  // Update full instructions
  app.put<{ Body: { content: string } }>("/instructions", async (request, reply) => {
    const { content } = request.body;
    if (typeof content !== "string") {
      reply.code(400);
      return { error: "Body must contain 'content' string" };
    }
    await setInstructions(content);
    return { ok: true };
  });
}
