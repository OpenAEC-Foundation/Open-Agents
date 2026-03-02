/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as h from "./handlers";

// Wrapper to work around MCP SDK + Zod 3.25 type incompatibility.
// The runtime behavior is correct; only the TypeScript generics clash.
function tool(
  server: McpServer,
  name: string,
  description: string,
  schema: Record<string, any>,
  handler: (args: any, extra: any) => any,
): void {
  (server.tool as any)(name, description, schema, handler);
}

export function registerTools(server: McpServer): void {
  // Tools without parameters
  server.tool("get_health", "Check if VS Code bridge is running", {}, h.getHealth);
  server.tool("get_workspace_state", "Get workspace folders and name", {}, h.getWorkspaceState);
  server.tool("get_active_editor", "Get active editor info (file, cursor, selection)", {}, h.getActiveEditor);
  server.tool("get_open_files", "List all open files/tabs in VS Code", {}, h.getOpenFiles);
  server.tool("list_terminals", "List all open VS Code terminals", {}, h.listTerminals);
  server.tool("get_scm_state", "Get source control changes (git status)", {}, h.getScmState);
  server.tool("get_debug_state", "Get active debug sessions", {}, h.getDebugState);
  server.tool("list_extensions", "List installed VS Code extensions", {}, h.listExtensions);
  server.tool("list_tasks", "List available VS Code tasks", {}, h.listTasks);

  // Tools with parameters
  tool(server, "open_file", "Open a file in VS Code editor", {
    path: z.string(),
    line: z.number().optional(),
    character: z.number().optional(),
    preview: z.boolean().optional(),
  }, h.openFile);

  tool(server, "get_text", "Get text content from a file or active editor", {
    path: z.string().optional(),
    startLine: z.number().optional(),
    endLine: z.number().optional(),
  }, h.getText);

  tool(server, "insert_text", "Insert text at a specific line in a file", {
    path: z.string().optional(),
    line: z.number(),
    text: z.string(),
  }, h.insertText);

  tool(server, "replace_text", "Replace text in a line range with new text", {
    path: z.string().optional(),
    startLine: z.number(),
    endLine: z.number(),
    text: z.string(),
  }, h.replaceText);

  tool(server, "execute_command", "Execute any VS Code command by ID", {
    command: z.string(),
    args: z.array(z.unknown()).optional(),
  }, h.executeCommand);

  tool(server, "create_terminal", "Create a new VS Code terminal", {
    name: z.string().optional(),
    cwd: z.string().optional(),
    show: z.boolean().optional(),
  }, h.createTerminal);

  tool(server, "send_terminal_text", "Send text/command to a VS Code terminal", {
    text: z.string(),
    terminalId: z.number().optional(),
    addNewLine: z.boolean().optional(),
  }, h.sendTerminalText);

  tool(server, "read_file", "Read file contents via VS Code API", {
    path: z.string(),
  }, h.readFile);

  tool(server, "write_file", "Write file contents via VS Code API", {
    path: z.string(),
    content: z.string(),
    createDirectories: z.boolean().optional(),
  }, h.writeFile);

  tool(server, "list_directory", "List directory contents", {
    path: z.string(),
    recursive: z.boolean().optional(),
  }, h.listDirectory);

  tool(server, "run_task", "Run a VS Code task by label", {
    label: z.string(),
  }, h.runTask);

  // Orchestrator
  tool(server, "spawn_agent", "Spawn a sandboxed Claude Code agent with a task. Creates a sandbox directory with task.md and starts Claude in a terminal.", {
    agentId: z.string().describe("Unique identifier for this agent"),
    sandboxDir: z.string().describe("Absolute path for the agent's sandbox directory"),
    task: z.string().describe("The task description (written to task.md)"),
    context: z.string().optional().describe("Additional context (written to context.md)"),
    claudeArgs: z.array(z.string()).optional().describe("Extra CLI args for claude command"),
  }, h.spawnAgent);

  tool(server, "get_agent_status", "Check the status of a spawned agent (reads status.json from sandbox)", {
    agentId: z.string(),
  }, h.getAgentStatus);

  tool(server, "get_agent_result", "Get the result of a completed agent (reads result.md from sandbox)", {
    agentId: z.string(),
  }, h.getAgentResult);

  tool(server, "kill_agent", "Kill a running agent and optionally cleanup its sandbox directory", {
    agentId: z.string(),
    cleanup: z.boolean().optional().describe("Delete sandbox directory after killing"),
  }, h.killAgent);

  server.tool("list_agents", "List all spawned agents with their status", {}, h.listAgents);
}
