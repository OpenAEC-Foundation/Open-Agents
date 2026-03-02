import type { FastifyInstance } from "fastify";
import type { AgentDefinition, AgentPreset, ModelId, AgentTool } from "@open-agents/shared";
import { deriveMaturity } from "@open-agents/shared";
import { nanoid } from "nanoid";
import { loadPresets } from "../preset-loader.js";
import { loadLibrary } from "../library-loader.js";

// In-memory store for PoC (replace with database later)
const agents = new Map<string, AgentDefinition>();

function seedFromPresets(presets: AgentPreset[], source: "preset" | "library") {
  const readonly = source === "library" || source === "preset";
  for (const preset of presets) {
    const agent: AgentDefinition = {
      id: nanoid(),
      name: preset.name,
      description: preset.description,
      model: preset.agent.model,
      systemPrompt: preset.agent.systemPrompt,
      tools: preset.agent.tools,
      maturity: preset.maturity ?? preset.agent.maturity ?? deriveMaturity(preset.agent.tools),
      category: preset.category,
      tags: preset.tags,
      source,
      readonly,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    agents.set(agent.id, agent);
  }
}

// Seed from presets and library at module load
Promise.all([loadPresets(), loadLibrary()])
  .then(([presets, library]) => {
    seedFromPresets(presets, "preset");
    seedFromPresets(library, "library");
    console.log(`Seeded ${presets.length} presets + ${library.length} library agents`);
  })
  .catch((err) => {
    console.warn("Failed to seed agents:", err);
  });

export async function agentRoutes(app: FastifyInstance) {
  // Create a new agent
  app.post<{ Body: Partial<AgentDefinition> }>("/agents", async (request, reply) => {
    const body = request.body;

    if (!body.name || !body.systemPrompt || !body.model || !body.tools) {
      reply.code(400);
      return { error: "Required fields: name, systemPrompt, model, tools" };
    }

    const tools = body.tools as AgentTool[];
    const agent: AgentDefinition = {
      id: nanoid(),
      name: body.name,
      description: body.description ?? "",
      model: body.model as ModelId,
      systemPrompt: body.systemPrompt,
      tools,
      maturity: body.maturity ?? deriveMaturity(tools),
      category: body.category,
      tags: body.tags,
      source: "user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    agents.set(agent.id, agent);
    reply.code(201);
    return agent;
  });

  // List all agents with optional filtering
  app.get<{ Querystring: { category?: string; search?: string; source?: string; maturity?: string } }>(
    "/agents",
    async (request) => {
      let result = Array.from(agents.values());

      const { category, search, source, maturity } = request.query;
      if (category) {
        result = result.filter((a) => a.category === category);
      }
      if (source) {
        result = result.filter((a) => a.source === source);
      }
      if (maturity) {
        result = result.filter((a) => a.maturity === maturity);
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

  // Delete an agent (readonly agents cannot be deleted)
  app.delete<{ Params: { id: string } }>(
    "/agents/:id",
    async (request, reply) => {
      const agent = agents.get(request.params.id);
      if (!agent) {
        reply.code(404);
        return { error: "Agent not found" };
      }
      if (agent.readonly) {
        reply.code(403);
        return { error: "Cannot delete a read-only library agent" };
      }
      agents.delete(request.params.id);
      reply.code(204);
    },
  );
}
