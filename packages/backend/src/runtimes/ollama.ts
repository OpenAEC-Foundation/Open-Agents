import type {
  AgentRuntime,
  AgentEvent,
  RuntimeExecutionConfig,
} from "@open-agents/shared";

/**
 * Ollama runtime adapter (D-032).
 * Connects to a local Ollama instance — no API key required.
 * Text-in/text-out only for PoC.
 */
export class OllamaRuntime implements AgentRuntime {
  readonly name = "Ollama (local)";
  readonly provider = "ollama";

  private baseUrl =
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  async *execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent> {
    yield {
      type: "start",
      nodeId: config.nodeId,
      timestamp: new Date().toISOString(),
    };

    try {
      // Extract model name from "ollama/llama3" → "llama3"
      const model = config.agent.model.split("/")[1];

      let prompt = "";
      if (config.agent.systemPrompt) {
        prompt += `System: ${config.agent.systemPrompt}\n\n`;
      }
      if (config.previousOutput) {
        prompt += `Previous agent output:\n\n${config.previousOutput}\n\n`;
      }
      prompt += "Execute your task.";

      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        }),
        signal: config.abortSignal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(
          `Ollama error: ${res.status} ${body}. Is Ollama running on ${this.baseUrl}?`,
        );
      }

      const data = (await res.json()) as { response?: string };
      const result = data.response ?? "";

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
