import type { StateCreator } from "zustand";
import type {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from "@xyflow/react";
import type {
  AgentNodeData,
  CanvasConfig,
  ChatMessage,
  ChatEvent,
  ExecutionRun,
  ExecutionStatus,
  SSEEvent,
  SkillLevel,
  ProviderConnection,
  ModelProvider,
} from "@open-agents/shared";
import type { Patch } from "immer";

// =============================================
// Slice interfaces
// =============================================

export interface CanvasSlice {
  nodes: Node[];
  edges: Edge[];
  nodeIdCounter: number;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  addNode: (data: AgentNodeData, position: { x: number; y: number }) => string;
  updateNodeData: (nodeId: string, patch: Partial<AgentNodeData>) => void;
  removeNode: (nodeId: string) => void;
  setCanvas: (nodes: Node[], edges: Edge[]) => void;
  getCanvasConfig: () => CanvasConfig;
}

export interface SelectionSlice {
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;

  selectNode: (id: string, additive?: boolean) => void;
  selectEdge: (id: string, additive?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  deleteSelected: () => void;
}

export interface HistoryEntry {
  label: string;
  timestamp: number;
  patches: Patch[];
  inversePatches: Patch[];
}

export interface HistorySlice {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxHistory: number;
  canUndo: boolean;
  canRedo: boolean;

  pushHistory: (label: string) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

export interface UISlice {
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  exportedJson: string | null;
  connectModalOpen: boolean;

  setSidebarOpen: (open: boolean) => void;
  setChatPanelOpen: (open: boolean) => void;
  setExportedJson: (json: string | null) => void;
  setConnectModalOpen: (open: boolean) => void;
}

export interface SettingsSlice {
  skillLevel: SkillLevel;
  themeId: string;
  providers: ProviderConnection[];

  setSkillLevel: (level: SkillLevel) => void;
  setThemeId: (id: string) => void;
  fetchConnections: () => Promise<void>;
  connectProvider: (provider: ModelProvider, apiKey: string) => Promise<{ ok: boolean; error?: string }>;
  disconnectProvider: (provider: ModelProvider) => Promise<void>;
}

export interface ExecutionSlice {
  // Chat state
  activeNodeId: string | null;
  sessions: Record<string, string>;
  messages: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  streamingContent: string;

  // Canvas execution state
  activeRun: ExecutionRun | null;
  nodeStatuses: Record<string, ExecutionStatus>;
  nodeOutputs: Record<string, string>;
  runError: string | null;
  isRunning: boolean;

  // Chat actions
  openChat: (nodeId: string) => void;
  closeChat: () => void;
  sendMessage: (nodeId: string, message: string, agent: AgentNodeData) => Promise<void>;
  clearChatHistory: (nodeId: string) => void;

  // Execution actions
  startExecution: (config: CanvasConfig) => Promise<void>;
  resetExecution: () => void;
}

export interface CanvasDocument {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSlice {
  documents: Map<string, CanvasDocument>;
  activeDocumentId: string;

  createDocument: (name?: string) => string;
  switchDocument: (id: string) => void;
  deleteDocument: (id: string) => void;
  renameDocument: (id: string, name: string) => void;
}

// =============================================
// Combined state
// =============================================

export type AppState = CanvasSlice &
  SelectionSlice &
  HistorySlice &
  UISlice &
  SettingsSlice &
  ExecutionSlice &
  WorkspaceSlice;

/** Typed slice creator — each slice can access the full AppState */
export type SliceCreator<T> = StateCreator<
  AppState,
  [["zustand/immer", never], ["zustand/devtools", never]],
  [],
  T
>;
