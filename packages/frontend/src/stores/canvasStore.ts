import { create } from "zustand";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import type { AgentNodeData, CanvasConfig } from "@open-agents/shared";

// Initial demo nodes
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

interface CanvasState {
  // Canvas data
  nodes: Node[];
  edges: Edge[];
  nodeIdCounter: number;

  // React Flow change handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Actions
  addNode: (data: AgentNodeData, position: { x: number; y: number }) => string;
  updateNodeData: (nodeId: string, patch: Partial<AgentNodeData>) => void;
  removeNode: (nodeId: string) => void;

  // Export
  getCanvasConfig: () => CanvasConfig;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: initialNodes,
  edges: [],
  nodeIdCounter: 3,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },

  addNode: (data, position) => {
    const counter = get().nodeIdCounter;
    const id = `agent-${counter}`;
    const newNode: Node = { id, type: "agent", position, data: data as unknown as Record<string, unknown> };
    set({
      nodes: [...get().nodes, newNode],
      nodeIdCounter: counter + 1,
    });
    return id;
  },

  updateNodeData: (nodeId, patch) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      ),
    });
  },

  getCanvasConfig: () => {
    const { nodes, edges } = get();
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.type ?? "agent") as CanvasConfig["nodes"][number]["type"],
        position: n.position,
        data: n.data as unknown as AgentNodeData,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
  },
}));
