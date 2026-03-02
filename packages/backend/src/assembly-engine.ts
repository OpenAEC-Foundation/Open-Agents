// =============================================
// Assembly Engine — NL → Intent → Patterns → Graph → Cost + Validate
// Sprint 6b (FR-17, D-022)
// =============================================

import type {
  TaskIntent,
  PatternMatch,
  AssemblyResult,
  AssemblyRequest,
  CanvasConfig,
  CanvasNode,
  CanvasEdge,
  RoutingPattern,
  ModelId,
  AgentTool,
  AgentNodeData,
} from "@open-agents/shared";
import {
  KnowledgeRegistry,
  getModelProfile,
  getModelProfiles,
  estimateCost,
  validateGraph,
} from "@open-agents/knowledge";
import { getAnthropicAuthHeaders } from "./anthropic-auth.js";

// =============================================
// Singleton knowledge registry
// =============================================

let registry: KnowledgeRegistry | null = null;

async function getRegistry(): Promise<KnowledgeRegistry> {
  if (!registry) {
    registry = new KnowledgeRegistry();
    await registry.initialize();
  }
  return registry;
}

// =============================================
// Step 1: classifyIntent — Haiku (D-017)
// =============================================

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for an agent orchestration platform. Given a natural language description of a task, classify it into a structured intent.

Available task types: code-review, code-generation, data-analysis, research, content-creation, testing, devops, security, documentation, general

Respond with ONLY a valid JSON object (no markdown, no backticks):
{
  "taskType": "one of the task types above",
  "domain": "short domain label, e.g. software, data, business, content",
  "complexity": "simple | moderate | complex",
  "estimatedAgentCount": number between 1-10,
  "needsParallel": true/false,
  "needsValidation": true/false,
  "keywords": ["key", "terms", "from", "description"],
  "constraints": ["any mentioned constraints like budget, speed, model preference"]
}

Guidelines:
- "simple" = 1-2 agents, single step or linear chain
- "moderate" = 2-4 agents, may need branching or validation
- "complex" = 4+ agents, parallel execution, multiple validation gates
- needsParallel = true when the task involves multiple independent sub-tasks
- needsValidation = true when quality, security, or correctness checking is mentioned`;

export async function classifyIntent(description: string): Promise<TaskIntent> {
  const authHeaders = getAnthropicAuthHeaders();
  if (!authHeaders) {
    throw new Error("No Anthropic authentication available. Connect an API key in Settings or run inside Claude Code.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      ...authHeaders,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20241022",
      max_tokens: 512,
      system: INTENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: description }],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as Record<string, Record<string, unknown>>)?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Intent classification failed: ${msg}`);
  }

  const body = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = body.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Empty response from intent classifier");

  let jsonText = text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonText) as TaskIntent;

  // Sanitize
  return {
    taskType: parsed.taskType ?? "general",
    domain: parsed.domain ?? "general",
    complexity: parsed.complexity ?? "moderate",
    estimatedAgentCount: Math.max(1, Math.min(10, parsed.estimatedAgentCount ?? 2)),
    needsParallel: Boolean(parsed.needsParallel),
    needsValidation: Boolean(parsed.needsValidation),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 10) : [],
    constraints: Array.isArray(parsed.constraints) ? parsed.constraints.slice(0, 5) : [],
  };
}

// =============================================
// Step 2: matchPatterns — Pure TypeScript (D-022)
// =============================================

/** Map task types to pattern categories */
const TASK_TYPE_TO_CATEGORY: Record<string, string[]> = {
  "code-review": ["parallel", "validation", "specialist"],
  "code-generation": ["linear", "iterative"],
  "data-analysis": ["parallel", "linear", "pyramid"],
  "research": ["parallel", "iterative", "pyramid"],
  "content-creation": ["linear", "iterative"],
  "testing": ["parallel", "validation"],
  "devops": ["linear", "efficiency"],
  "security": ["parallel", "validation", "specialist"],
  "documentation": ["linear", "pyramid"],
  "general": ["linear", "parallel"],
};

export async function matchPatterns(
  intent: TaskIntent,
  budgetSensitive: boolean = false,
): Promise<PatternMatch[]> {
  const reg = await getRegistry();
  const patterns = reg.getPatterns();

  const scored: PatternMatch[] = [];
  const expectedCategories = TASK_TYPE_TO_CATEGORY[intent.taskType] ?? ["linear"];

  for (const pattern of patterns) {
    let score = 0;
    const reasons: string[] = [];

    // +0.3 category match
    if (expectedCategories.includes(pattern.category)) {
      score += 0.3;
      reasons.push(`Category "${pattern.category}" matches task type "${intent.taskType}"`);
    }

    // +0.2 node count range match
    if (
      intent.estimatedAgentCount >= pattern.minNodes &&
      intent.estimatedAgentCount <= pattern.maxNodes
    ) {
      score += 0.2;
      reasons.push(`Agent count ${intent.estimatedAgentCount} within range [${pattern.minNodes}-${pattern.maxNodes}]`);
    }

    // +0.1 per matching tag (keywords vs pattern tags)
    for (const keyword of intent.keywords) {
      const lower = keyword.toLowerCase();
      if (pattern.tags.some((t) => t.toLowerCase().includes(lower) || lower.includes(t.toLowerCase()))) {
        score += 0.1;
        reasons.push(`Keyword "${keyword}" matches pattern tag`);
      }
    }

    // +0.2 if needsValidation and pattern is in validation category
    if (intent.needsValidation && pattern.category === "validation") {
      score += 0.2;
      reasons.push("Task needs validation and pattern is validation-type");
    }

    // +0.15 if needsParallel and pattern is parallel
    if (intent.needsParallel && pattern.category === "parallel") {
      score += 0.15;
      reasons.push("Task needs parallel execution and pattern supports it");
    }

    // -0.2 if budget-sensitive and pattern is expensive
    if (budgetSensitive && pattern.tokenProfile.costMultiplier > 3) {
      score -= 0.2;
      reasons.push(`Budget penalty: costMultiplier ${pattern.tokenProfile.costMultiplier} > 3`);
    }

    if (score > 0) {
      scored.push({ pattern, score: Math.min(score, 1.0), reasons });
    }
  }

  // Sort by score descending, return top 3
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

// =============================================
// Step 3: generateGraph — Sonnet (D-017)
// =============================================

const GRAPH_SYSTEM_PROMPT = `You are a graph generator for an agent orchestration platform. Given a task intent and a routing pattern, generate a concrete agent graph as a canvas configuration.

Rules:
- Give each agent a descriptive name (e.g. "Security Auditor", not "specialist-1")
- Write focused system prompts (50-150 words) tailored to the specific task
- Choose the lightest model that can handle each role:
  - anthropic/claude-haiku-4-5 — fast tasks, classification, simple transforms
  - anthropic/claude-sonnet-4-6 — standard coding, analysis, generation
  - anthropic/claude-opus-4-6 — complex reasoning only
  - openai/gpt-4o — alternative balanced model
  - mistral/mistral-large — alternative balanced model
- Choose tools conservatively from: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
- Include a brief model justification per node

Respond with ONLY a valid JSON object (no markdown, no backticks):
{
  "nodes": [
    {
      "name": "Agent Name",
      "role": "what this agent does in the pipeline",
      "model": "provider/model-id",
      "modelJustification": "why this model",
      "systemPrompt": "the system prompt for this agent",
      "tools": ["Tool1", "Tool2"]
    }
  ],
  "edges": [
    { "from": 0, "to": 1 }
  ]
}

The edges use numeric indices into the nodes array. Follow the pattern's edge structure.`;

interface GeneratedNodeData {
  name: string;
  role: string;
  model: string;
  modelJustification: string;
  systemPrompt: string;
  tools: string[];
}

interface GeneratedGraphData {
  nodes: GeneratedNodeData[];
  edges: Array<{ from: number; to: number }>;
}

const VALID_TOOLS: AgentTool[] = [
  "Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebSearch", "WebFetch",
];

const VALID_MODELS: ModelId[] = getModelProfiles().map((p) => p.id);

export async function generateGraph(
  description: string,
  intent: TaskIntent,
  pattern: RoutingPattern,
): Promise<CanvasConfig> {
  const authHeaders = getAnthropicAuthHeaders();
  if (!authHeaders) {
    throw new Error("No Anthropic authentication available. Connect an API key in Settings or run inside Claude Code.");
  }

  const userMessage = `Task description: "${description}"

Intent:
${JSON.stringify(intent, null, 2)}

Pattern to follow: "${pattern.name}" (${pattern.category})
- Description: ${pattern.description}
- Node templates: ${pattern.nodeTemplates.map((t) => t.role).join(", ")}
- Edge flow: ${pattern.edgeFlow}
- Min/max nodes: ${pattern.minNodes}-${pattern.maxNodes}

Generate a concrete agent graph for this task following the pattern structure.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      ...authHeaders,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 2048,
      system: GRAPH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as Record<string, Record<string, unknown>>)?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Graph generation failed: ${msg}`);
  }

  const body = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = body.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Empty response from graph generator");

  let jsonText = text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const generated = JSON.parse(jsonText) as GeneratedGraphData;

  // Convert to CanvasConfig
  const nodes: CanvasNode[] = generated.nodes.map((n, i) => ({
    id: `assembly-${i}`,
    type: "agent" as const,
    position: { x: 0, y: 0 }, // Will be laid out by dagre on frontend
    data: {
      name: n.name || `Agent ${i + 1}`,
      model: (VALID_MODELS.includes(n.model as ModelId) ? n.model : "anthropic/claude-sonnet-4-6") as ModelId,
      systemPrompt: n.systemPrompt || "",
      tools: (n.tools ?? []).filter((t): t is AgentTool =>
        VALID_TOOLS.includes(t as AgentTool),
      ),
    },
  }));

  // Ensure at least basic tools if none survived validation
  for (const node of nodes) {
    const agentData = node.data as AgentNodeData;
    if (agentData.tools.length === 0) {
      agentData.tools = ["Read", "Glob", "Grep"];
    }
  }

  const edges: CanvasEdge[] = (generated.edges ?? [])
    .filter((e) => e.from >= 0 && e.from < nodes.length && e.to >= 0 && e.to < nodes.length)
    .map((e, i) => ({
      id: `assembly-edge-${i}`,
      source: nodes[e.from].id,
      target: nodes[e.to].id,
    }));

  return {
    name: `Generated: ${description.slice(0, 60)}`,
    nodes,
    edges,
  };
}

// =============================================
// Full Pipeline: assemble()
// =============================================

export async function assemble(request: AssemblyRequest): Promise<AssemblyResult> {
  const { description, patternId, budgetSensitive } = request;

  // Step 1: Classify intent
  const intent = await classifyIntent(description);

  // Step 2: Match patterns
  let patternMatches = await matchPatterns(intent, budgetSensitive);

  // If caller forced a pattern, put it first
  if (patternId) {
    const reg = await getRegistry();
    const forced = reg.getPattern(patternId);
    if (forced) {
      patternMatches = [
        { pattern: forced, score: 1.0, reasons: ["Manually selected"] },
        ...patternMatches.filter((m) => m.pattern.id !== patternId),
      ];
    }
  }

  // Need at least one pattern
  if (patternMatches.length === 0) {
    return { description, intent, patternMatches };
  }

  const selectedPattern = patternMatches[0].pattern;

  // Step 3: Generate graph
  const config = await generateGraph(description, intent, selectedPattern);

  // Step 4: Estimate cost
  const costEstimate = estimateCost(config, getModelProfile);

  // Step 5: Validate graph
  const validation = validateGraph(config, getModelProfile);

  return {
    description,
    intent,
    patternMatches,
    config,
    costEstimate,
    validation,
  };
}
