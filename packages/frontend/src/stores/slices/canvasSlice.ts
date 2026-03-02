import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
} from "@xyflow/react";
import type { CanvasNodeData, CanvasConfig, NodeType } from "@open-agents/shared";
import type { SliceCreator, CanvasSlice } from "../types";

const initialNodes: Node[] = [
  {
    id: "agent-1",
    type: "agent",
    position: { x: 100, y: 100 },
    data: {
      name: "Analyst",
      model: "anthropic/claude-sonnet-4-6",
      systemPrompt: "Analyse the codebase and identify key patterns.",
      tools: ["Read", "Glob", "Grep"],
    },
  },
  {
    id: "agent-2",
    type: "agent",
    position: { x: 500, y: 100 },
    data: {
      name: "Reporter",
      model: "anthropic/claude-haiku-4-5",
      systemPrompt: "Write a concise summary based on the analysis.",
      tools: ["Read", "Write"],
    },
  },
];

export const createCanvasSlice: SliceCreator<CanvasSlice> = (set, get) => ({
  nodes: initialNodes,
  edges: [],
  nodeIdCounter: 3,

  onNodesChange: (changes) => {
    set((state) => {
      state.nodes = applyNodeChanges(changes, state.nodes);
    });

    // Push history only for significant changes (not during drag)
    const significant = changes.some(
      (c) => c.type !== "position" || !("dragging" in c && c.dragging),
    );
    if (significant && changes.some((c) => c.type === "position" || c.type === "remove")) {
      get().pushHistory("Node change");
    }
  },

  onEdgesChange: (changes) => {
    set((state) => {
      state.edges = applyEdgeChanges(changes, state.edges);
    });
    if (changes.some((c) => c.type === "remove")) {
      get().pushHistory("Edge removed");
    }
  },

  onConnect: (connection) => {
    set((state) => {
      state.edges = addEdge(connection, state.edges);
    });
    get().pushHistory("Edge added");
  },

  addNode: (data, position, type: NodeType = "agent") => {
    const counter = get().nodeIdCounter;
    const prefix = type === "dispatcher" ? "dispatcher" : type === "aggregator" ? "aggregator" : "agent";
    const id = `${prefix}-${counter}`;
    const newNode: Node = {
      id,
      type,
      position,
      data: data as unknown as Record<string, unknown>,
    };
    set((state) => {
      state.nodes.push(newNode);
      state.nodeIdCounter = counter + 1;
    });
    get().pushHistory(`Added ${data.name}`);
    return id;
  },

  updateNodeData: (nodeId, patch) => {
    set((state) => {
      const node = state.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.data = { ...node.data, ...patch };
      }
    });
  },

  removeNode: (nodeId) => {
    set((state) => {
      state.nodes = state.nodes.filter((n) => n.id !== nodeId);
      state.edges = state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      );
    });
    get().pushHistory("Node removed");
  },

  setCanvas: (nodes, edges) => {
    set((state) => {
      state.nodes = nodes;
      state.edges = edges;
    });
  },

  getCanvasConfig: () => {
    const { nodes, edges } = get();
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.type ?? "agent") as CanvasConfig["nodes"][number]["type"],
        position: n.position,
        data: n.data as unknown as CanvasNodeData,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
  },
});
