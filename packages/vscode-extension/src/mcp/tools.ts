import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as handlers from "./handlers";

export function registerTools(server: McpServer) {
  server.tool(
    "get_canvas_state",
    "Get the current canvas configuration (all nodes and edges) as JSON",
    {},
    handlers.getCanvasState,
  );

  server.tool(
    "get_agent_configs",
    "Get all agent node configurations currently on the canvas",
    {},
    handlers.getAgentConfigs,
  );

  server.tool(
    "create_agent",
    "Create a new agent node on the canvas",
    {
      name: z.string().describe("Agent name"),
      model: z
        .string()
        .default("anthropic/claude-sonnet-4-6")
        .describe("Model ID (e.g. anthropic/claude-sonnet-4-6, openai/gpt-4o)"),
      systemPrompt: z.string().describe("System prompt for the agent"),
      tools: z
        .array(z.string())
        .default(["Read", "Glob", "Grep"])
        .describe("Tool names: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch"),
      x: z.number().default(200).describe("X position on canvas"),
      y: z.number().default(200).describe("Y position on canvas"),
    },
    handlers.createAgent,
  );

  server.tool(
    "update_canvas",
    "Update the canvas: add or remove edges between agent nodes",
    {
      action: z
        .enum(["addEdge", "removeEdge", "removeNode"])
        .describe("Action to perform"),
      nodeId: z
        .string()
        .optional()
        .describe("Node ID (for removeNode)"),
      sourceId: z
        .string()
        .optional()
        .describe("Source node ID (for edge operations)"),
      targetId: z
        .string()
        .optional()
        .describe("Target node ID (for edge operations)"),
    },
    handlers.updateCanvas,
  );

  server.tool(
    "list_templates",
    "List available agent preset templates that can be added to the canvas",
    {},
    handlers.listTemplates,
  );

  server.tool(
    "run_flow",
    "Execute the current canvas configuration through the backend",
    {
      configId: z
        .string()
        .optional()
        .describe("Config ID to execute. If omitted, executes the most recent config."),
    },
    handlers.runFlow,
  );
}
