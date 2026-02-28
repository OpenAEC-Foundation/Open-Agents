import type { FastifyInstance } from "fastify";
import type { AgentTool, ModelId } from "@open-agents/shared";
import { getApiKey } from "../key-store.js";

// Valid tools and models for validation
const VALID_TOOLS: AgentTool[] = [
  "Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebSearch", "WebFetch",
];

const VALID_MODELS: ModelId[] = [
  "anthropic/claude-haiku-4-5",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-opus-4-6",
  "openai/gpt-4o",
  "openai/o3",
  "mistral/mistral-large",
];

const GENERATOR_SYSTEM_PROMPT = `You are an Open-Agents asset generator. You generate agent definitions according to platform standards.

Rules:
- Agent vs skill lakmoestest: if the task can be done in a single LLM call, it's a skill, not an agent. Agents are for multi-step autonomous work.
- Choose the lightest model that can handle the task. Use Haiku for simple lookups, Sonnet for standard work, Opus only for complex analysis.
- Keep system prompts concise and focused (under 200 words). Be specific about the agent's role, expertise, and output format.
- Choose tools conservatively — only include tools the agent actually needs.

Available models (use exact IDs):
- anthropic/claude-haiku-4-5 — Fast & cheap, for simple tasks
- anthropic/claude-sonnet-4-6 — Balanced, for most coding/analysis tasks
- anthropic/claude-opus-4-6 — Most capable, for complex reasoning
- openai/gpt-4o — OpenAI's fast multimodal model
- openai/o3 — OpenAI's reasoning model
- mistral/mistral-large — Mistral's flagship model

Available tools:
- Read — Read files and documents
- Write — Create new files
- Edit — Modify existing files
- Bash — Execute shell commands
- Glob — Find files by pattern
- Grep — Search file contents with regex
- WebSearch — Search the web
- WebFetch — Fetch URL content

Available categories: general, code, review, data, devops, security, documentation, research

You MUST respond with ONLY a valid JSON object (no markdown, no backticks, no explanation). The JSON must have these exact fields:
{
  "name": "string — concise agent name",
  "description": "string — one sentence describing what this agent does",
  "model": "string — one of the model IDs above",
  "systemPrompt": "string — the system prompt for the agent",
  "tools": ["array of tool names from the list above"],
  "category": "string — one of the categories above",
  "tags": ["array of relevant tags, 2-5 tags"]
}`;

interface GenerateRequest {
  description: string;
  assetType?: string;
  existingDraft?: {
    name?: string;
    description?: string;
    model?: string;
    systemPrompt?: string;
    tools?: string[];
    category?: string;
    tags?: string[];
  };
  refinementPrompt?: string;
}

interface GenerateDraft {
  name: string;
  description: string;
  model: ModelId;
  systemPrompt: string;
  tools: AgentTool[];
  category: string;
  tags: string[];
}

export async function generateRoutes(app: FastifyInstance) {
  app.post<{ Body: GenerateRequest }>("/generate", async (request, reply) => {
    const { description, existingDraft, refinementPrompt } = request.body;

    if (!description?.trim()) {
      reply.code(400);
      return { error: "description is required" };
    }

    // Get Anthropic API key (generate always uses Anthropic)
    const apiKey = getApiKey("anthropic");
    if (!apiKey) {
      reply.code(400);
      return { error: "Anthropic API key not configured. Connect your Anthropic key in Settings first." };
    }

    // Build user message
    let userMessage: string;
    if (existingDraft && refinementPrompt) {
      // Refinement mode
      userMessage = `Here is an existing agent definition:\n${JSON.stringify(existingDraft, null, 2)}\n\nUser wants to refine it: "${refinementPrompt}"\n\nGenerate an updated version.`;
    } else {
      // Conversational mode — generate from description
      userMessage = `Generate an agent for this request: "${description}"`;
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6-20250514",
          max_tokens: 1024,
          system: GENERATOR_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const msg = (errorBody as Record<string, Record<string, unknown>>)?.error?.message ?? `HTTP ${res.status}`;
        reply.code(502);
        return { error: `LLM API error: ${msg}` };
      }

      const body = (await res.json()) as {
        content: Array<{ type: string; text?: string }>;
      };

      const text = body.content?.find((c) => c.type === "text")?.text;
      if (!text) {
        reply.code(502);
        return { error: "Empty response from LLM" };
      }

      // Parse JSON from response (handle potential markdown wrapping)
      let jsonText = text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        reply.code(502);
        return { error: "Failed to parse LLM response as JSON", raw: text };
      }

      // Validate and sanitize the draft
      const draft = validateDraft(parsed);

      return { draft };
    } catch (err) {
      reply.code(500);
      return { error: err instanceof Error ? err.message : "Internal server error" };
    }
  });
}

/** Validate and sanitize a parsed LLM response into a proper draft */
function validateDraft(raw: Record<string, unknown>): GenerateDraft {
  const name = typeof raw.name === "string" ? raw.name.trim() : "Untitled Agent";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const systemPrompt = typeof raw.systemPrompt === "string" ? raw.systemPrompt.trim() : "";
  const category = typeof raw.category === "string" ? raw.category.trim() : "general";

  // Validate model
  let model: ModelId = "anthropic/claude-sonnet-4-6";
  if (typeof raw.model === "string" && VALID_MODELS.includes(raw.model as ModelId)) {
    model = raw.model as ModelId;
  }

  // Validate tools
  let tools: AgentTool[] = ["Read", "Glob", "Grep"];
  if (Array.isArray(raw.tools)) {
    const validTools = raw.tools.filter(
      (t): t is AgentTool => typeof t === "string" && VALID_TOOLS.includes(t as AgentTool),
    );
    if (validTools.length > 0) tools = validTools;
  }

  // Validate tags
  let tags: string[] = [];
  if (Array.isArray(raw.tags)) {
    tags = raw.tags.filter((t): t is string => typeof t === "string").slice(0, 10);
  }

  return { name, description, model, systemPrompt, tools, category, tags };
}
