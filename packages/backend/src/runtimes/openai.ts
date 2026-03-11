import type {
  AgentRuntime,
  AgentEvent,
  RuntimeExecutionConfig,
  AgentTool,
} from "@open-agents/shared";
import { getApiKey } from "../key-store.js";

/**
 * OpenAI runtime adapter (D-032).
 * Uses raw fetch against the chat completions API — no SDK dependency.
 * Supports function calling / tool use with multi-turn loop.
 */

/** OpenAI function calling tool definition */
interface OpenAIToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** OpenAI chat message types */
interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

/** OpenAI API response */
interface OpenAIResponse {
  choices?: Array<{
    message?: OpenAIMessage;
    finish_reason?: string;
  }>;
}

/** Map AgentTool names to OpenAI function definitions */
function mapToolsToOpenAI(tools: AgentTool[]): OpenAIToolDef[] {
  const toolDefs: Record<AgentTool, OpenAIToolDef> = {
    Read: {
      type: "function",
      function: {
        name: "Read",
        description: "Read a file from the filesystem. Returns the file contents.",
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
        description: "Write content to a file, creating it if needed.",
        parameters: {
          type: "object",
          properties: {
            file_path: { type: "string", description: "Absolute path to the file to write" },
            content: { type: "string", description: "Content to write" },
          },
          required: ["file_path", "content"],
        },
      },
    },
    Edit: {
      type: "function",
      function: {
        name: "Edit",
        description: "Edit a file by replacing old_string with new_string.",
        parameters: {
          type: "object",
          properties: {
            file_path: { type: "string", description: "Absolute path to the file" },
            old_string: { type: "string", description: "Text to find and replace" },
            new_string: { type: "string", description: "Replacement text" },
          },
          required: ["file_path", "old_string", "new_string"],
        },
      },
    },
    Bash: {
      type: "function",
      function: {
        name: "Bash",
        description: "Execute a bash command and return its output.",
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
        description: "Find files matching a glob pattern.",
        parameters: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Glob pattern (e.g. **/*.ts)" },
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
        description: "Search file contents using a regex pattern.",
        parameters: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Regex pattern to search for" },
            path: { type: "string", description: "File or directory to search" },
          },
          required: ["pattern"],
        },
      },
    },
    WebSearch: {
      type: "function",
      function: {
        name: "WebSearch",
        description: "Search the web for information.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
    },
    WebFetch: {
      type: "function",
      function: {
        name: "WebFetch",
        description: "Fetch content from a URL.",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to fetch" },
          },
          required: ["url"],
        },
      },
    },
  };

  return tools.map((t) => toolDefs[t]).filter(Boolean);
}

/** Simulate tool execution — returns a placeholder result.
 *  Real tool execution is handled by the execution engine / safety layer.
 *  For non-Claude runtimes, tools are LLM-side only (the model can reason
 *  about tools but actual execution is not yet wired). */
function simulateToolCall(name: string, args: string): string {
  return `[Tool ${name} called with args: ${args}] — Tool execution for non-Claude runtimes is simulated. The model can plan tool usage but actual execution requires the Docker runtime (D-040).`;
}

/** Maximum number of tool-use turns before forcing a final response */
const MAX_TOOL_TURNS = 10;

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
      const messages: OpenAIMessage[] = [];

      if (config.agent.systemPrompt) {
        messages.push({ role: "system", content: config.agent.systemPrompt });
      }

      const userContent = config.previousOutput
        ? `Previous agent output:\n\n${config.previousOutput}\n\nNow execute your task based on the above context.`
        : "Execute your task.";
      messages.push({ role: "user", content: userContent });

      // Extract model name from "openai/gpt-4o" → "gpt-4o"
      const model = config.agent.model.split("/")[1];

      // Build tool definitions if agent has tools configured
      const tools = config.agent.tools.length > 0
        ? mapToolsToOpenAI(config.agent.tools)
        : undefined;

      // Multi-turn tool use loop
      let turnCount = 0;
      let finalResult = "";

      while (turnCount < MAX_TOOL_TURNS) {
        if (config.abortSignal?.aborted) break;
        turnCount++;

        const body: Record<string, unknown> = {
          model,
          messages,
          max_tokens: config.agent.maxTokens ?? 4096,
        };

        if (tools && tools.length > 0 && turnCount < MAX_TOOL_TURNS) {
          body.tools = tools;
        }

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: config.abortSignal,
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`OpenAI API error: ${res.status} ${errBody}`);
        }

        const data = (await res.json()) as OpenAIResponse;
        const choice = data.choices?.[0];
        const assistantMessage = choice?.message;

        if (!assistantMessage) {
          throw new Error("No response from OpenAI API");
        }

        // Check if the model wants to call tools
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          // Add assistant message with tool_calls to conversation
          messages.push({
            role: "assistant",
            content: assistantMessage.content,
            tool_calls: assistantMessage.tool_calls,
          });

          // Process each tool call
          for (const toolCall of assistantMessage.tool_calls) {
            const toolResult = simulateToolCall(
              toolCall.function.name,
              toolCall.function.arguments,
            );

            messages.push({
              role: "tool",
              content: toolResult,
              tool_call_id: toolCall.id,
            });
          }

          // Continue the loop for the model to process tool results
          continue;
        }

        // No tool calls — this is the final response
        finalResult = assistantMessage.content ?? "";
        break;
      }

      yield {
        type: "output",
        nodeId: config.nodeId,
        data: finalResult,
        timestamp: new Date().toISOString(),
      };

      yield {
        type: "complete",
        nodeId: config.nodeId,
        data: finalResult,
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
