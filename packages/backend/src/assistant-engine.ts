// =============================================
// AI Assembly Assistant Engine (Sprint 6c — FR-18, FR-19)
// Context-aware streaming chat with canvas manipulation
// =============================================

import type {
  AssistantContext,
  AssistantEvent,
  CanvasConfig,
  CanvasAction,
} from "@open-agents/shared";
import { getAnthropicAuthHeaders } from "./anthropic-auth.js";

// =============================================
// System prompt builder
// =============================================

const BASE_SYSTEM_PROMPT = `You are the AI Assembly Assistant for Open-Agents, a visual agent orchestration platform. Users build agent graphs (canvas configurations) by connecting agent nodes with edges.

Your role is to help users understand, improve, and build agent graphs through conversation. You can:
1. Explain what the current canvas does and how agents interact
2. Suggest improvements (better models, missing validation, cost optimization)
3. Add, remove, or update agent nodes on the canvas
4. Connect agents with edges to create workflows

When suggesting canvas changes, emit them as JSON blocks wrapped in <canvas-action> tags. Each action must be valid JSON matching one of these types:

ADD NODE:
<canvas-action>{"type":"add-node","data":{"name":"Agent Name","model":"anthropic/claude-sonnet-4-6","systemPrompt":"The prompt","tools":["Read","Glob","Grep"]}}</canvas-action>

REMOVE NODE:
<canvas-action>{"type":"remove-node","nodeId":"node-id"}</canvas-action>

UPDATE NODE:
<canvas-action>{"type":"update-node","nodeId":"node-id","patch":{"name":"New Name"}}</canvas-action>

ADD EDGE:
<canvas-action>{"type":"add-edge","source":"source-node-id","target":"target-node-id"}</canvas-action>

Guidelines:
- Always explain what you're doing and why before emitting actions
- Choose the lightest model that fits: Haiku for simple tasks, Sonnet for standard work, Opus only for complex reasoning
- Be conservative with tools: only give agents the tools they actually need
- Keep system prompts focused (50-150 words)
- Available tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
- Available models: anthropic/claude-haiku-4-5, anthropic/claude-sonnet-4-6, anthropic/claude-opus-4-6, openai/gpt-4o, mistral/mistral-large`;

const CONTEXT_ADDITIONS: Record<AssistantContext, string> = {
  neutral: "",
  "code-review": `\n\nYou are specialized in code review workflows. Suggest review pipelines with linting, security scanning, and quality gates. Prefer multi-agent setups where different agents focus on different aspects (style, bugs, security, performance).`,
  security: `\n\nYou are specialized in security-focused agent graphs. Suggest security scanners, vulnerability checkers, and audit trails. Always recommend a validation agent at the end of the pipeline. Be cautious with Bash tool access.`,
  erpnext: `\n\nYou are specialized in ERPNext agent workflows. Help build agents for ERPNext tasks like financial processing, HR automation, inventory management, and reporting. Agents should use Read/Write/Edit for DocType manipulation and Bash for bench commands.`,
  custom: "",
};

function buildCanvasDescription(config: CanvasConfig): string {
  if (!config.nodes.length) {
    return "The canvas is currently empty — no agents or connections.";
  }

  const nodeDescs = config.nodes.map((n) => {
    const data = n.data as Record<string, unknown>;
    return `- ${data.name ?? n.id} (${n.type}, model: ${data.model ?? "unknown"}, tools: ${(data.tools as string[])?.join(", ") ?? "none"})`;
  });

  const edgeDescs = config.edges.map((e) => {
    const src = config.nodes.find((n) => n.id === e.source);
    const tgt = config.nodes.find((n) => n.id === e.target);
    const srcName = (src?.data as Record<string, unknown>)?.name ?? e.source;
    const tgtName = (tgt?.data as Record<string, unknown>)?.name ?? e.target;
    return `- ${srcName} → ${tgtName}`;
  });

  let desc = `Current canvas has ${config.nodes.length} node(s):\n${nodeDescs.join("\n")}`;
  if (edgeDescs.length > 0) {
    desc += `\n\nConnections:\n${edgeDescs.join("\n")}`;
  } else {
    desc += "\n\nNo connections between nodes yet.";
  }

  return desc;
}

export function buildSystemPrompt(
  canvasConfig: CanvasConfig,
  context: AssistantContext,
): string {
  let prompt = BASE_SYSTEM_PROMPT;
  prompt += CONTEXT_ADDITIONS[context] ?? "";
  prompt += `\n\n## Current Canvas State\n\n${buildCanvasDescription(canvasConfig)}`;
  return prompt;
}

// =============================================
// Streaming chat
// =============================================

/** Parse <canvas-action> blocks from accumulated text */
function parseCanvasActions(text: string): CanvasAction[] {
  const actions: CanvasAction[] = [];
  const regex = /<canvas-action>([\s\S]*?)<\/canvas-action>/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    try {
      const action = JSON.parse(match[1].trim()) as CanvasAction;
      if (action.type) {
        actions.push(action);
      }
    } catch {
      // Skip malformed action blocks
    }
  }

  return actions;
}

export async function* streamAssistantChat(
  message: string,
  canvasConfig: CanvasConfig,
  context: AssistantContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): AsyncGenerator<AssistantEvent> {
  const authHeaders = getAnthropicAuthHeaders();
  if (!authHeaders) {
    yield {
      type: "assistant:error",
      error: "No Anthropic authentication available. Connect an API key in Settings or run inside Claude Code.",
      timestamp: new Date().toISOString(),
    };
    return;
  }

  const systemPrompt = buildSystemPrompt(canvasConfig, context);

  // Build message history (keep last 20 messages to stay within context limits)
  const messages = [
    ...history.slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

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
      stream: true,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as Record<string, Record<string, unknown>>)?.error?.message ?? `HTTP ${res.status}`;
    yield {
      type: "assistant:error",
      error: `Assistant request failed: ${msg}`,
      timestamp: new Date().toISOString(),
    };
    return;
  }

  // Process SSE stream from Anthropic
  const reader = res.body?.getReader();
  if (!reader) {
    yield {
      type: "assistant:error",
      error: "No response body from Anthropic API",
      timestamp: new Date().toISOString(),
    };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let emittedActionCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]" || !json) continue;

        try {
          const event = JSON.parse(json) as Record<string, unknown>;

          if (event.type === "content_block_delta") {
            const delta = (event.delta as Record<string, unknown>)?.text as string | undefined;
            if (delta) {
              fullText += delta;

              yield {
                type: "assistant:delta",
                delta,
                timestamp: new Date().toISOString(),
              };

              // Check for newly completed canvas-action blocks
              const actions = parseCanvasActions(fullText);
              for (let i = emittedActionCount; i < actions.length; i++) {
                yield {
                  type: "assistant:action",
                  action: actions[i],
                  timestamp: new Date().toISOString(),
                };
              }
              emittedActionCount = actions.length;
            }
          }
        } catch {
          // Skip malformed SSE events
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield {
    type: "assistant:complete",
    content: fullText,
    timestamp: new Date().toISOString(),
  };
}

// =============================================
// Quick suggestions (non-streaming)
// =============================================

export function generateQuickSuggestions(config: CanvasConfig): string[] {
  const suggestions: string[] = [];

  if (config.nodes.length === 0) {
    suggestions.push("Add a code review agent to get started");
    suggestions.push("Build a research pipeline with multiple agents");
    suggestions.push("Create a security scanning workflow");
    return suggestions;
  }

  // Check for disconnected nodes
  const connectedNodeIds = new Set<string>();
  for (const edge of config.edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }
  const orphans = config.nodes.filter((n) => !connectedNodeIds.has(n.id));
  if (orphans.length > 0) {
    suggestions.push(`Connect orphan node "${(orphans[0].data as Record<string, unknown>).name}" to the pipeline`);
  }

  // Check for expensive models that could be cheaper
  const expensiveNodes = config.nodes.filter((n) => {
    const model = (n.data as Record<string, unknown>).model as string;
    return model?.includes("opus");
  });
  if (expensiveNodes.length > 0) {
    suggestions.push(`Consider downgrading "${(expensiveNodes[0].data as Record<string, unknown>).name}" from Opus to Sonnet for cost savings`);
  }

  // Suggest validation if not present
  const hasValidator = config.nodes.some((n) => {
    const name = ((n.data as Record<string, unknown>).name as string)?.toLowerCase() ?? "";
    return name.includes("valid") || name.includes("review") || name.includes("check");
  });
  if (!hasValidator && config.nodes.length >= 2) {
    suggestions.push("Add a validation agent at the end of the pipeline");
  }

  // Suggest more agents if only 1
  if (config.nodes.length === 1) {
    suggestions.push("Add a second agent to create a pipeline workflow");
  }

  return suggestions.slice(0, 3);
}
