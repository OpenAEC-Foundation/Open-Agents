import type {
  AgentRuntime,
  AgentEvent,
  RuntimeExecutionConfig,
} from "@open-agents/shared";
import { getApiKey } from "../key-store.js";

/**
 * Mistral AI runtime adapter (D-032).
 * Uses raw fetch against the Mistral chat completions API (OpenAI-compatible).
 * Text-in/text-out only for PoC.
 */
export class MistralRuntime implements AgentRuntime {
  readonly name = "Mistral AI";
  readonly provider = "mistral";

  async *execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent> {
    const apiKey = getApiKey("mistral");
    if (!apiKey) {
      yield {
        type: "error",
        nodeId: config.nodeId,
        data: "No Mistral API key configured. Connect via Settings.",
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

      // Extract model name from "mistral/mistral-large" → "mistral-large"
      const model = config.agent.model.split("/")[1];

      const res = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
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
        },
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Mistral API error: ${res.status} ${body}`);
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
