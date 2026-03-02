import type {
  AgentRuntime,
  AgentEvent,
  RuntimeExecutionConfig,
} from "@open-agents/shared";

/**
 * Claude CLI runtime adapter.
 * Executes agents via the VS Code bridge (Open-VSCode-Controller).
 * Each agent spawns as a real `claude` CLI session in a VS Code terminal.
 *
 * Architecture:
 *   Open-Agents backend → HTTP → VS Code bridge (:7483) → terminal → claude CLI
 *
 * Unlike ClaudeSDKRuntime (API calls), this runtime:
 * - Runs real Claude Code sessions with full tool access (Read/Write/Edit/Bash)
 * - Works on the user's filesystem via VS Code
 * - Uses the user's Claude subscription (no API key needed)
 */
export class ClaudeCLIRuntime implements AgentRuntime {
  readonly name = "Claude CLI (VS Code Bridge)";
  readonly provider = "cli";

  private bridgeUrl: string;

  constructor(bridgeUrl = "http://localhost:7483") {
    this.bridgeUrl = bridgeUrl.replace(/\/$/, "");
  }

  /** Check if the VS Code bridge is reachable */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.bridgeUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async *execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent> {
    const agentId = `oa-${config.nodeId}-${Date.now()}`;
    const sandboxDir = `C:/tmp/open-agents/${agentId}`;

    yield {
      type: "start",
      nodeId: config.nodeId,
      timestamp: new Date().toISOString(),
    };

    try {
      // Build task description from agent config
      const task = this.buildTask(config);

      // 1. Spawn agent via bridge
      const spawnRes = await fetch(`${this.bridgeUrl}/orchestrator/spawn-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          sandboxDir,
          task,
          context: config.previousOutput
            ? `## Previous Agent Output\n\n${config.previousOutput}`
            : undefined,
        }),
        signal: config.abortSignal,
      });

      if (!spawnRes.ok) {
        const body = await spawnRes.text();
        throw new Error(`Bridge spawn failed: ${spawnRes.status} ${body}`);
      }

      // 2. Poll for completion
      const result = await this.pollUntilDone(agentId, config.abortSignal);

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
      // Attempt cleanup on error
      this.killAgent(agentId).catch(() => {});

      yield {
        type: "error",
        nodeId: config.nodeId,
        data: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /** Build task.md content from the agent node configuration */
  private buildTask(config: RuntimeExecutionConfig): string {
    const lines: string[] = [];
    lines.push(`# Task: ${config.agent.name}`);
    lines.push("");

    if (config.agent.description) {
      lines.push(config.agent.description);
      lines.push("");
    }

    lines.push("## Instructions");
    lines.push("");
    lines.push(config.agent.systemPrompt);
    lines.push("");

    if (config.agent.tools.length > 0) {
      lines.push(`## Allowed Tools`);
      lines.push("");
      lines.push(config.agent.tools.map((t) => `- ${t}`).join("\n"));
      lines.push("");
    }

    return lines.join("\n");
  }

  /** Poll agent status until done or error, return result */
  private async pollUntilDone(
    agentId: string,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    const pollInterval = 3000; // 3 seconds
    const maxWait = 10 * 60 * 1000; // 10 minutes
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      if (abortSignal?.aborted) {
        await this.killAgent(agentId);
        throw new Error("Execution cancelled");
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusRes = await fetch(
        `${this.bridgeUrl}/orchestrator/agent-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId }),
          signal: abortSignal,
        },
      );

      if (!statusRes.ok) continue;

      const status = (await statusRes.json()) as {
        status: string;
        summary?: string;
      };

      if (status.status === "done") {
        return await this.getResult(agentId);
      }

      if (status.status === "error") {
        throw new Error(status.summary ?? "Agent reported error");
      }
    }

    await this.killAgent(agentId);
    throw new Error("Agent timed out after 10 minutes");
  }

  /** Read agent result from bridge */
  private async getResult(agentId: string): Promise<string> {
    const res = await fetch(`${this.bridgeUrl}/orchestrator/agent-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });

    if (!res.ok) {
      throw new Error(`Failed to get agent result: ${res.status}`);
    }

    const data = (await res.json()) as { result?: string | null };
    return data.result ?? "(no result)";
  }

  /** Kill agent and cleanup */
  private async killAgent(agentId: string): Promise<void> {
    await fetch(`${this.bridgeUrl}/orchestrator/kill-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, cleanup: true }),
    }).catch(() => {});
  }
}
