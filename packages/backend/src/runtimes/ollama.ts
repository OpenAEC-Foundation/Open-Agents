import type {
  AgentRuntime,
  AgentEvent,
  RuntimeExecutionConfig,
  AgentTool,
} from "@open-agents/shared";

// =============================================
// OpenAI-compatible type definitions for Ollama /v1/chat/completions
// =============================================

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/** SSE streaming chunk from /v1/chat/completions */
interface StreamDelta {
  id?: string;
  choices?: Array<{
    delta?: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
}

/** Non-streaming response from /v1/chat/completions */
interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason?: string | null;
  }>;
}

/** Ollama /api/tags response */
interface OllamaTagsResponse {
  models?: Array<{
    name: string;
    size: number;
    modified_at: string;
  }>;
}

// =============================================
// Tool definitions for OpenAI function calling format
// =============================================

const TOOL_DEFINITIONS: Record<AgentTool, ToolDefinition> = {
  Read: {
    type: "function",
    function: {
      name: "Read",
      description: "Read the contents of a file at the given path",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Absolute path to the file to read" },
        },
        required: ["file_path"],
      },
    },
  },
  Write: {
    type: "function",
    function: {
      name: "Write",
      description: "Write content to a file, creating it if it does not exist",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Absolute path to the file to write" },
          content: { type: "string", description: "Content to write to the file" },
        },
        required: ["file_path", "content"],
      },
    },
  },
  Edit: {
    type: "function",
    function: {
      name: "Edit",
      description: "Edit a file by replacing an exact string match with new content",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Absolute path to the file to edit" },
          old_string: { type: "string", description: "The exact string to find and replace" },
          new_string: { type: "string", description: "The replacement string" },
        },
        required: ["file_path", "old_string", "new_string"],
      },
    },
  },
  Bash: {
    type: "function",
    function: {
      name: "Bash",
      description: "Execute a bash command and return its output",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The bash command to execute" },
        },
        required: ["command"],
      },
    },
  },
  Glob: {
    type: "function",
    function: {
      name: "Glob",
      description: "Find files matching a glob pattern",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Glob pattern to match files (e.g. '**/*.ts')" },
          path: { type: "string", description: "Directory to search in" },
        },
        required: ["pattern"],
      },
    },
  },
  Grep: {
    type: "function",
    function: {
      name: "Grep",
      description: "Search for a regex pattern in file contents",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Regex pattern to search for" },
          path: { type: "string", description: "File or directory to search in" },
        },
        required: ["pattern"],
      },
    },
  },
  WebSearch: {
    type: "function",
    function: {
      name: "WebSearch",
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
        },
        required: ["query"],
      },
    },
  },
  WebFetch: {
    type: "function",
    function: {
      name: "WebFetch",
      description: "Fetch content from a URL",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to fetch content from" },
          prompt: { type: "string", description: "What to extract from the page" },
        },
        required: ["url"],
      },
    },
  },
};

/**
 * Ollama runtime adapter — upgraded to OpenAI-compatible API (D-032, Phase 1).
 * Uses /v1/chat/completions for tool calling and streaming support.
 * Connects to a local Ollama instance — no API key required.
 */
export class OllamaRuntime implements AgentRuntime {
  readonly name = "Ollama (local)";
  readonly provider = "ollama";

  private baseUrl =
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  /**
   * Check if Ollama is running and return available models.
   * Uses the Ollama-native /api/tags endpoint.
   */
  async isAvailable(): Promise<{ ok: boolean; models: string[] }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return { ok: false, models: [] };
      const data = (await res.json()) as OllamaTagsResponse;
      const models = data.models?.map((m) => m.name) ?? [];
      return { ok: true, models };
    } catch {
      return { ok: false, models: [] };
    }
  }

  async *execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent> {
    yield {
      type: "start",
      nodeId: config.nodeId,
      timestamp: new Date().toISOString(),
    };

    try {
      // Extract model name from "ollama/llama3" → "llama3"
      const model = config.agent.model.split("/")[1];

      // Build chat messages (OpenAI format)
      const messages = this.buildMessages(config);

      // Build tool definitions if agent has tools
      const tools = config.agent.tools?.length
        ? this.buildToolDefinitions(config.agent.tools)
        : undefined;

      // Use streaming for real-time output
      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          tools,
          stream: true,
          max_tokens: config.agent.maxTokens ?? 4096,
        }),
        signal: config.abortSignal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(
          `Ollama error: ${res.status} ${body}. Is Ollama running on ${this.baseUrl}?`,
        );
      }

      // Parse SSE stream
      const result = await this.parseStream(res, config.nodeId);

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

  // ---------------------------------------------------------------------------
  // Message building
  // ---------------------------------------------------------------------------

  private buildMessages(config: RuntimeExecutionConfig): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (config.agent.systemPrompt) {
      messages.push({ role: "system", content: config.agent.systemPrompt });
    }

    const userContent = config.previousOutput
      ? `Previous agent output:\n\n${config.previousOutput}\n\nNow execute your task based on the above context.`
      : "Execute your task.";

    messages.push({ role: "user", content: userContent });

    return messages;
  }

  // ---------------------------------------------------------------------------
  // Tool definitions
  // ---------------------------------------------------------------------------

  private buildToolDefinitions(tools: AgentTool[]): ToolDefinition[] {
    return tools
      .map((tool) => TOOL_DEFINITIONS[tool])
      .filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // SSE stream parsing
  // ---------------------------------------------------------------------------

  /**
   * Parse an SSE stream from /v1/chat/completions.
   * Accumulates content text and tool_calls, returning the combined result.
   */
  private async parseStream(
    res: Response,
    _nodeId: string,
  ): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body from Ollama");

    const decoder = new TextDecoder();
    let buffer = "";
    let contentResult = "";

    // Accumulate tool calls across chunks
    const toolCalls = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6); // strip "data: "
          if (payload === "[DONE]") continue;

          try {
            const chunk = JSON.parse(payload) as StreamDelta;
            const choice = chunk.choices?.[0];
            if (!choice) continue;

            // Accumulate content
            if (choice.delta?.content) {
              contentResult += choice.delta.content;
            }

            // Accumulate tool calls (streamed incrementally)
            if (choice.delta?.tool_calls) {
              for (const tc of choice.delta.tool_calls) {
                const existing = toolCalls.get(tc.index);
                if (existing) {
                  // Append incremental arguments
                  if (tc.function?.arguments) {
                    existing.arguments += tc.function.arguments;
                  }
                } else {
                  // New tool call
                  toolCalls.set(tc.index, {
                    id: tc.id ?? `call_${tc.index}`,
                    name: tc.function?.name ?? "unknown",
                    arguments: tc.function?.arguments ?? "",
                  });
                }
              }
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // If the model returned tool calls, format them as structured output
    if (toolCalls.size > 0) {
      const toolCallResults = [...toolCalls.values()].map((tc) => {
        let args: unknown;
        try {
          args = JSON.parse(tc.arguments);
        } catch {
          args = tc.arguments;
        }
        return `[Tool Call] ${tc.name}(${JSON.stringify(args)})`;
      });

      // Combine content (if any) with tool call descriptions
      const parts = [];
      if (contentResult) parts.push(contentResult);
      parts.push(...toolCallResults);
      return parts.join("\n\n");
    }

    return contentResult;
  }
}
