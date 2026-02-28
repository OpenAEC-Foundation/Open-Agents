// =============================================
// Assembly Step 1: Intent Classification (D-017)
// Uses Haiku to classify NL description into TaskIntent
// =============================================

import type { TaskIntent, TaskType, ComplexityTier } from "@open-agents/shared";
import { getAnthropicAuthHeaders } from "../anthropic-auth.js";

const TASK_TYPES: TaskType[] = [
  "code-review",
  "code-generation",
  "data-analysis",
  "research",
  "content-creation",
  "testing",
  "devops",
  "security",
  "documentation",
  "general",
];

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for an AI agent orchestration platform.
Given a natural language description of a desired AI agent team or workflow, classify the intent.

Available task types: ${TASK_TYPES.join(", ")}

Available orchestration patterns:
- linear: sequential pipelines (A→B→C), 2-5 nodes
- parallel: fan-out, map-reduce, race, consensus, 2-10 nodes
- pyramid: diamond, hierarchy, pyramid-up/down, 3-8 nodes
- iterative: feedback loops, debate, spiral, 2-4 nodes
- validation: dual-review, test-driven, pipeline-gate, 2-5 nodes
- efficiency: cached-retrieval, token-budget, lazy-escalation, 1-3 nodes
- specialist: domain-specific patterns (code-review, research), 3-6 nodes

Respond with ONLY a valid JSON object (no markdown, no backticks):
{
  "taskType": "one of the task types above",
  "domain": "brief domain description",
  "complexity": "simple|moderate|complex",
  "estimatedAgentCount": number (1-10),
  "needsParallel": boolean,
  "needsValidation": boolean,
  "keywords": ["extracted", "key", "terms"],
  "constraints": ["any budget/speed/quality constraints mentioned"]
}`;

/**
 * Classify a natural language description into a TaskIntent using Haiku (D-017).
 * Uses the Anthropic Messages API directly (not via runtime adapter — internal pipeline).
 */
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: INTENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: description }],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({})) as Record<string, Record<string, unknown>>;
    const msg = errorBody?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Haiku classification failed: ${msg}`);
  }

  const body = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = body.content?.find((c) => c.type === "text")?.text;
  if (!text) {
    throw new Error("Empty response from Haiku");
  }

  // Parse JSON (handle potential markdown wrapping)
  let jsonText = text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Failed to parse Haiku response as JSON: ${text}`);
  }

  return validateIntent(parsed);
}

/** Validate and sanitize parsed intent */
function validateIntent(raw: Record<string, unknown>): TaskIntent {
  const taskType: TaskType = TASK_TYPES.includes(raw.taskType as TaskType)
    ? (raw.taskType as TaskType)
    : "general";

  const domain = typeof raw.domain === "string" ? raw.domain : "general";

  const validComplexities: ComplexityTier[] = ["simple", "moderate", "complex"];
  const complexity: ComplexityTier = validComplexities.includes(raw.complexity as ComplexityTier)
    ? (raw.complexity as ComplexityTier)
    : "moderate";

  const estimatedAgentCount = typeof raw.estimatedAgentCount === "number"
    ? Math.max(1, Math.min(10, Math.round(raw.estimatedAgentCount)))
    : 3;

  const needsParallel = typeof raw.needsParallel === "boolean" ? raw.needsParallel : false;
  const needsValidation = typeof raw.needsValidation === "boolean" ? raw.needsValidation : false;

  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.filter((k): k is string => typeof k === "string").slice(0, 15)
    : [];

  const constraints = Array.isArray(raw.constraints)
    ? raw.constraints.filter((c): c is string => typeof c === "string").slice(0, 5)
    : [];

  return {
    taskType,
    domain,
    complexity,
    estimatedAgentCount,
    needsParallel,
    needsValidation,
    keywords,
    constraints,
  };
}
