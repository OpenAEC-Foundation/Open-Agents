// =============================================
// Assembly Step 3: Graph Generation (D-017)
// Uses Sonnet to generate a concrete CanvasConfig from intent + pattern.
// =============================================

import type {
  TaskIntent,
  RoutingPattern,
  CanvasConfig,
  CanvasNode,
  CanvasEdge,
  AgentNodeData,
  AgentTool,
  ModelId,
  ModelProfile,
} from "@open-agents/shared";
import { getAnthropicAuthHeaders } from "../anthropic-auth.js";

const VALID_TOOLS: AgentTool[] = [
  "Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebSearch", "WebFetch",
];

const VALID_MODEL_IDS: ModelId[] = [
  "anthropic/claude-haiku-4-5",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-opus-4-6",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/o3",
  "mistral/mistral-large",
  "mistral/mistral-small",
  "mistral/codestral",
];

function buildSystemPrompt(
  intent: TaskIntent,
  pattern: RoutingPattern,
  modelProfiles: ModelProfile[],
): string {
  const modelList = modelProfiles
    .map((m) => `- ${m.id} (${m.displayName}): $${m.costPer1kInput}/$${m.costPer1kOutput} per 1k tokens, ${m.latencyTier} latency, capabilities: ${m.capabilities.join(", ")}`)
    .join("\n");

  const nodeTemplateDescriptions = pattern.nodeTemplates
    .map((t, i) => `  ${i + 1}. Role: ${t.role}, Suggested model: ${t.modelHint}, Tools: [${t.tools.join(", ")}]`)
    .join("\n");

  return `You are an agent graph generator for Open-Agents, a visual agent orchestration platform.
Generate a concrete agent graph configuration based on the provided intent and pattern.

PATTERN: ${pattern.name} (${pattern.category})
${pattern.description}

DIAGRAM:
${pattern.diagram}

EDGE FLOW:
${pattern.edgeFlow}

NODE TEMPLATES (from pattern):
${nodeTemplateDescriptions}

AVAILABLE MODELS:
${modelList}

AVAILABLE TOOLS: ${VALID_TOOLS.join(", ")}

RULES:
- Generate meaningful agent names (e.g., "Security Auditor" not "specialist-1")
- Write focused system prompts (50-200 words each) tailored to the specific task
- Choose the lightest model that can handle each agent's role (Haiku for simple routing, Sonnet for analysis)
- Only assign tools each agent actually needs
- Follow the pattern's edge flow structure exactly
- Node count should be between ${pattern.minNodes} and ${pattern.maxNodes}

Respond with ONLY a valid JSON object (no markdown, no backticks):
{
  "nodes": [
    {
      "id": "node-1",
      "type": "agent",
      "data": {
        "name": "Agent Name",
        "description": "What this agent does",
        "model": "provider/model-id",
        "systemPrompt": "The system prompt...",
        "tools": ["Read", "Grep"]
      }
    }
  ],
  "edges": [
    { "source": "node-1", "target": "node-2" }
  ]
}`;
}

/**
 * Generate a concrete CanvasConfig from an intent and matched pattern using Sonnet (D-017).
 */
export async function generateGraph(
  description: string,
  intent: TaskIntent,
  pattern: RoutingPattern,
  modelProfiles: ModelProfile[],
): Promise<CanvasConfig> {
  const authHeaders = getAnthropicAuthHeaders();
  if (!authHeaders) {
    throw new Error("No Anthropic authentication available. Connect an API key in Settings or run inside Claude Code.");
  }

  const systemPrompt = buildSystemPrompt(intent, pattern, modelProfiles);
  const userMessage = `Generate an agent graph for this task:

"${description}"

Intent: ${intent.taskType} (${intent.complexity} complexity)
Domain: ${intent.domain}
Keywords: ${intent.keywords.join(", ")}
Needs parallel: ${intent.needsParallel}
Needs validation: ${intent.needsValidation}
${intent.constraints.length > 0 ? `Constraints: ${intent.constraints.join(", ")}` : ""}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      ...authHeaders,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({})) as Record<string, Record<string, unknown>>;
    const msg = errorBody?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Sonnet graph generation failed: ${msg}`);
  }

  const body = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = body.content?.find((c) => c.type === "text")?.text;
  if (!text) {
    throw new Error("Empty response from Sonnet");
  }

  // Parse JSON
  let jsonText = text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Failed to parse Sonnet response as JSON: ${text.slice(0, 500)}`);
  }

  return validateAndBuildConfig(parsed, description);
}

/** Validate and build a proper CanvasConfig from LLM output */
function validateAndBuildConfig(
  raw: Record<string, unknown>,
  description: string,
): CanvasConfig {
  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];

  const nodes: CanvasNode[] = rawNodes.map((n: Record<string, unknown>, i: number) => {
    const id = typeof n.id === "string" ? n.id : `node-${i + 1}`;
    const data = (n.data ?? n) as Record<string, unknown>;

    const name = typeof data.name === "string" ? data.name : `Agent ${i + 1}`;
    const nodeDescription = typeof data.description === "string" ? data.description : "";
    const systemPrompt = typeof data.systemPrompt === "string" ? data.systemPrompt : "";

    // Validate model
    let model: ModelId = "anthropic/claude-sonnet-4-6";
    if (typeof data.model === "string" && VALID_MODEL_IDS.includes(data.model as ModelId)) {
      model = data.model as ModelId;
    }

    // Validate tools
    let tools: AgentTool[] = ["Read", "Glob", "Grep"];
    if (Array.isArray(data.tools)) {
      const validTools = data.tools.filter(
        (t: unknown): t is AgentTool => typeof t === "string" && VALID_TOOLS.includes(t as AgentTool),
      );
      if (validTools.length > 0) tools = validTools;
    }

    const agentData: AgentNodeData = {
      name,
      description: nodeDescription,
      model,
      systemPrompt,
      tools,
    };

    return {
      id,
      type: "agent" as const,
      position: { x: 0, y: 0 }, // Will be set by auto-layout
      data: agentData,
    };
  });

  const nodeIds = new Set(nodes.map((n) => n.id));
  let edgeCounter = 0;

  const edges: CanvasEdge[] = rawEdges
    .filter((e: Record<string, unknown>) => {
      const source = typeof e.source === "string" ? e.source : "";
      const target = typeof e.target === "string" ? e.target : "";
      return nodeIds.has(source) && nodeIds.has(target) && source !== target;
    })
    .map((e: Record<string, unknown>) => {
      edgeCounter++;
      return {
        id: typeof e.id === "string" ? e.id : `edge-${edgeCounter}`,
        source: e.source as string,
        target: e.target as string,
      };
    });

  return {
    name: description.slice(0, 100),
    nodes,
    edges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
