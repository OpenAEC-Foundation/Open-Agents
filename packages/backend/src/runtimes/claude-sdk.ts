import type {
  AgentRuntime,
  AgentEvent,
  RuntimeExecutionConfig,
} from "@open-agents/shared";
import { getApiKey } from "../key-store.js";

/**
 * Claude Agent SDK runtime adapter (D-015).
 * Wraps @anthropic-ai/claude-agent-sdk query() into the AgentRuntime interface.
 * API key is resolved from key-store (BYOK) with env var fallback.
 */
export class ClaudeSDKRuntime implements AgentRuntime {
  readonly name = "Claude Agent SDK";
  readonly provider = "anthropic";

  async *execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent> {
    const apiKey = getApiKey("anthropic");
    if (!apiKey) {
      yield {
        type: "error",
        nodeId: config.nodeId,
        data: "No Anthropic API key configured. Connect via Settings.",
        timestamp: new Date().toISOString(),
      };
      return;
    }

    // Set env var for SDK (it reads from ANTHROPIC_API_KEY)
    process.env.ANTHROPIC_API_KEY = apiKey;

    const { query } = await import("@anthropic-ai/claude-agent-sdk");

    const prompt = config.previousOutput
      ? `Previous agent output:\n\n${config.previousOutput}\n\nNow execute your task based on the above context.`
      : "Execute your task.";

    yield {
      type: "start",
      nodeId: config.nodeId,
      timestamp: new Date().toISOString(),
    };

    try {
      let result = "";

      for await (const message of query({
        prompt,
        options: {
          systemPrompt: config.agent.systemPrompt,
          allowedTools: config.agent.tools,
          model: config.agent.model,
          permissionMode: "bypassPermissions",
          allowDangerouslySkipPermissions: true,
          maxTurns: 20,
        },
      })) {
        if ("result" in message) {
          result = (message as { result: string }).result;
          yield {
            type: "output",
            nodeId: config.nodeId,
            data: result,
            timestamp: new Date().toISOString(),
          };
        }
      }

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
