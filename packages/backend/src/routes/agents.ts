import type { FastifyInstance } from "fastify";
import type { AgentDefinition, ModelId, AgentTool } from "@open-agents/shared";
import { nanoid } from "nanoid";
import { loadPresets } from "../preset-loader.js";

// In-memory store for PoC (replace with database later)
const agents = new Map<string, AgentDefinition>();

// Seed from presets at module load
loadPresets()
  .then((presets) => {
    for (const preset of presets) {
      const agent: AgentDefinition = {
        id: nanoid(),
        name: preset.name,
        description: preset.description,
        model: preset.agent.model,
        systemPrompt: preset.agent.systemPrompt,
        tools: preset.agent.tools,
        category: preset.category,
        tags: preset.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      agents.set(agent.id, agent);
    }
  })
  .catch((err) => {
    console.warn("Failed to seed agents from presets:", err);
  });

export async function agentRoutes(app: FastifyInstance) {
  // Create a new agent
  app.post<{ Body: Partial<AgentDefinition> }>("/agents", async (request, reply) => {
    const body = request.body;

    if (!body.name || !body.systemPrompt || !body.model || !body.tools) {
      reply.code(400);
      return { error: "Required fields: name, systemPrompt, model, tools" };
    }

    const agent: AgentDefinition = {
      id: nanoid(),
      name: body.name,
      description: body.description ?? "",
      model: body.model as ModelId,
      systemPrompt: body.systemPrompt,
      tools: body.tools as AgentTool[],
      category: body.category,
      tags: body.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    agents.set(agent.id, agent);
    reply.code(201);
    return agent;
  });

  // List all agents with optional filtering
  app.get<{ Querystring: { category?: string; search?: string } }>(
    "/agents",
    async (request) => {
      let result = Array.from(agents.values());

      const { category, search } = request.query;
      if (category) {
        result = result.filter((a) => a.category === category);
      }
      if (search) {
        const q = search.toLowerCase();
        result = result.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.tags?.some((t) => t.toLowerCase().includes(q)),
        );
      }

      return result.sort((a, b) => a.name.localeCompare(b.name));
    },
  );

  // Get agent by ID
  app.get<{ Params: { id: string } }>("/agents/:id", async (request, reply) => {
    const agent = agents.get(request.params.id);
    if (!agent) {
      reply.code(404);
      return { error: "Agent not found" };
    }
    return agent;
  });

  // Update an agent
  app.put<{ Params: { id: string }; Body: Partial<AgentDefinition> }>(
    "/agents/:id",
    async (request, reply) => {
      const existing = agents.get(request.params.id);
      if (!existing) {
        reply.code(404);
        return { error: "Agent not found" };
      }
      const updated: AgentDefinition = {
        ...existing,
        ...request.body,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      agents.set(existing.id, updated);
      return updated;
    },
  );

  // Delete an agent
  app.delete<{ Params: { id: string } }>(
    "/agents/:id",
    async (request, reply) => {
      if (!agents.has(request.params.id)) {
        reply.code(404);
        return { error: "Agent not found" };
      }
      agents.delete(request.params.id);
      reply.code(204);
    },
  );
}
