import type {
  AgentRuntime,
  AgentEvent,
  RuntimeExecutionConfig,
} from "@open-agents/shared";

/**
 * Claude Agent SDK runtime adapter (D-015).
 * Wraps @anthropic-ai/claude-agent-sdk query() into the AgentRuntime interface.
 */
export class ClaudeSDKRuntime implements AgentRuntime {
  readonly name = "Claude Agent SDK";
  readonly provider = "anthropic";

  async *execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent> {
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
