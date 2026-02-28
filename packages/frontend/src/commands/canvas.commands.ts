import type { AgentNodeData, ModelId, AgentTool } from "@open-agents/shared";
import type { CommandDef } from "./types";
import { useAppStore } from "../stores/appStore";

/** Helper to get current store state */
const getState = () => useAppStore.getState();

export const addNodeCommand: CommandDef = {
  id: "canvas.addNode",
  label: "Add Node",
  description: "Add a new agent node to the canvas",
  params: {
    name: { type: "string", description: "Agent name", required: true },
    model: { type: "string", description: "Model ID (e.g. anthropic/claude-sonnet-4-6)", required: true },
    systemPrompt: { type: "string", description: "System prompt", required: false, default: "" },
    tools: { type: "object", description: "Array of tool names", required: false, default: [] },
    x: { type: "number", description: "X position", required: false, default: 200 },
    y: { type: "number", description: "Y position", required: false, default: 200 },
  },
  undoable: true,
  execute: (args) => {
    const data: AgentNodeData = {
      name: args.name as string,
      model: args.model as ModelId,
      systemPrompt: (args.systemPrompt as string) ?? "",
      tools: (args.tools as AgentTool[]) ?? [],
    };
    const position = {
      x: (args.x as number) ?? 200,
      y: (args.y as number) ?? 200,
    };

    const nodeId = getState().addNode(data, position);

    return {
      ok: true,
      data: { nodeId },
      undoState: {
        label: `Add ${data.name}`,
        undo: () => getState().removeNode(nodeId),
      },
    };
  },
};

export const removeNodeCommand: CommandDef = {
  id: "canvas.removeNode",
  label: "Remove Node",
  description: "Remove an agent node from the canvas",
  params: {
    nodeId: { type: "string", description: "Node ID to remove", required: true },
  },
  undoable: true,
  execute: (args) => {
    const nodeId = args.nodeId as string;
    const state = getState();
    const node = state.nodes.find((n) => n.id === nodeId);
    if (!node) return { ok: false, error: `Node not found: ${nodeId}` };

    const nodeData = node.data as unknown as AgentNodeData;
    const nodePosition = { ...node.position };

    state.removeNode(nodeId);

    return {
      ok: true,
      undoState: {
        label: `Remove ${nodeData.name}`,
        undo: () => {
          // Re-add the node at its original position
          getState().addNode(nodeData, nodePosition);
          // Note: edges are not restored — acceptable for PoC
        },
      },
    };
  },
};

export const updateNodeCommand: CommandDef = {
  id: "canvas.updateNode",
  label: "Update Node",
  description: "Update properties of an agent node",
  params: {
    nodeId: { type: "string", description: "Node ID to update", required: true },
    name: { type: "string", description: "New agent name", required: false },
    model: { type: "string", description: "New model ID", required: false },
    systemPrompt: { type: "string", description: "New system prompt", required: false },
    tools: { type: "object", description: "New tools array", required: false },
  },
  undoable: true,
  execute: (args) => {
    const nodeId = args.nodeId as string;
    const state = getState();
    const node = state.nodes.find((n) => n.id === nodeId);
    if (!node) return { ok: false, error: `Node not found: ${nodeId}` };

    const oldData = { ...(node.data as unknown as AgentNodeData) };
    const patch: Partial<AgentNodeData> = {};
    if (args.name !== undefined) patch.name = args.name as string;
    if (args.model !== undefined) patch.model = args.model as ModelId;
    if (args.systemPrompt !== undefined) patch.systemPrompt = args.systemPrompt as string;
    if (args.tools !== undefined) patch.tools = args.tools as AgentTool[];

    state.updateNodeData(nodeId, patch);

    return {
      ok: true,
      undoState: {
        label: `Update ${oldData.name}`,
        undo: () => getState().updateNodeData(nodeId, oldData),
      },
    };
  },
};

export const exportCanvasCommand: CommandDef = {
  id: "canvas.export",
  label: "Export Canvas",
  description: "Export the current canvas configuration as JSON",
  params: {},
  undoable: false,
  execute: () => {
    const config = getState().getCanvasConfig();
    return {
      ok: true,
      data: config,
    };
  },
};

/** All canvas commands */
export const canvasCommands: CommandDef[] = [
  addNodeCommand,
  removeNodeCommand,
  updateNodeCommand,
  exportCanvasCommand,
];
