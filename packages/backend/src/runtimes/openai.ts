import type {
  AgentRuntime,
  AgentEvent,
  RuntimeExecutionConfig,
} from "@open-agents/shared";
import { getApiKey } from "../key-store.js";

/**
 * OpenAI runtime adapter (D-032).
 * Uses raw fetch against the chat completions API — no SDK dependency.
 * Text-in/text-out only for PoC (no function calling / tool use).
 */
export class OpenAIRuntime implements AgentRuntime {
  readonly name = "OpenAI";
  readonly provider = "openai";

  async *execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent> {
    const apiKey = getApiKey("openai");
    if (!apiKey) {
      yield {
        type: "error",
        nodeId: config.nodeId,
        data: "No OpenAI API key configured. Connect via Settings.",
        timestamp: new Date().toISOString(),
      };
      return;
    }

    yield {
      type: "start",
      nodeId: config.nodeId,
      timestamp: new Date().toISOString(),
    };

    try {
      const messages: Array<{ role: string; content: string }> = [];

      if (config.agent.systemPrompt) {
        messages.push({ role: "system", content: config.agent.systemPrompt });
      }

      const userContent = config.previousOutput
        ? `Previous agent output:\n\n${config.previousOutput}\n\nNow execute your task based on the above context.`
        : "Execute your task.";
      messages.push({ role: "user", content: userContent });

      // Extract model name from "openai/gpt-4o" → "gpt-4o"
      const model = config.agent.model.split("/")[1];

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: config.agent.maxTokens ?? 4096,
        }),
        signal: config.abortSignal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenAI API error: ${res.status} ${body}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const result = data.choices?.[0]?.message?.content ?? "";

      yield {
        type: "output",
        nodeId: config.nodeId,
        data: result,
        timestamp: new Date().toISOString(),
      };

      yield {
        type: "complete",
        nodeId: config.nodeId,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      yield {
        type: "error",
        nodeId: config.nodeId,
        data: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }
}
