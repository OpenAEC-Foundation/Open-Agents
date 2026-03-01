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
  CanvasNodeData,
  NodeType,
  CanvasConfig,
  ChatMessage,
  ChatEvent,
  ExecutionRun,
  ExecutionStatus,
  SSEEvent,
  SkillLevel,
  ProviderConnection,
  ModelProvider,
  AppTab,
  AgentDefinition,
  FlowTemplate,
  SafetyConfig,
  GlobalSafetyRules,
  AgentSafetyRules,
  SafetyTestResult,
  AgentTool,
  RunSummary,
  AuditEntry,
  AuditFilter,
  AssemblyResult,
  RoutingPattern,
  AssistantContext,
  AssistantMessage,
  CanvasAction,
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

  addNode: (data: CanvasNodeData, position: { x: number; y: number }, type?: NodeType) => string;
  updateNodeData: (nodeId: string, patch: Partial<CanvasNodeData>) => void;
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
  activeTab: AppTab;
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  exportedJson: string | null;
  connectModalOpen: boolean;
  selectedOutputNodeId: string | null;

  setActiveTab: (tab: AppTab) => void;
  setSidebarOpen: (open: boolean) => void;
  setChatPanelOpen: (open: boolean) => void;
  setExportedJson: (json: string | null) => void;
  setConnectModalOpen: (open: boolean) => void;
  setSelectedOutputNodeId: (id: string | null) => void;
}

export interface FactorySlice {
  // Wizard state
  wizardOpen: boolean;
  wizardStep: number;
  wizardDraft: Partial<AgentDefinition>;

  // Library agents (fetched from backend)
  agents: AgentDefinition[];
  agentsLoading: boolean;
  categories: string[];
  selectedCategory: string | null;
  selectedMaturity: string | null;

  // LLM Generator state (Fase 2.4)
  generatorOpen: boolean;
  generatorLoading: boolean;
  generatorDraft: Partial<AgentDefinition> | null;
  generatorError: string | null;

  // Wizard actions
  openWizard: () => void;
  closeWizard: () => void;
  setWizardStep: (step: number) => void;
  updateWizardDraft: (patch: Partial<AgentDefinition>) => void;
  submitWizard: () => Promise<void>;

  // Generator actions (Fase 2.4)
  openGenerator: () => void;
  closeGenerator: () => void;
  generateAgent: (description: string) => Promise<void>;
  refineAgent: (refinementPrompt: string) => Promise<void>;
  updateGeneratorDraft: (patch: Partial<AgentDefinition>) => void;
  acceptGeneratorDraft: () => Promise<void>;

  // Category + maturity filter
  setSelectedCategory: (category: string | null) => void;
  setSelectedMaturity: (maturity: string | null) => void;

  // Agent CRUD
  fetchAgents: () => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
}

export interface SettingsSlice {
  skillLevel: SkillLevel;
  themeId: string;
  providers: ProviderConnection[];
  userInstructions: string;
  userInstructionsLoading: boolean;

  setSkillLevel: (level: SkillLevel) => void;
  setThemeId: (id: string) => void;
  fetchConnections: () => Promise<void>;
  connectProvider: (provider: ModelProvider, apiKey: string) => Promise<{ ok: boolean; error?: string }>;
  disconnectProvider: (provider: ModelProvider) => Promise<void>;
  fetchUserInstructions: () => Promise<void>;
  saveUserInstructions: (content: string) => Promise<void>;
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

  // Session management state (Sprint 3)
  isPaused: boolean;
  isCancelled: boolean;
  stepElapsed: Record<string, number>;
  pendingErrorNodeId: string | null;

  // Template state (Sprint 3)
  templates: FlowTemplate[];

  // Chat actions
  openChat: (nodeId: string) => void;
  closeChat: () => void;
  sendMessage: (nodeId: string, message: string, agent: AgentNodeData) => Promise<void>;
  clearChatHistory: (nodeId: string) => void;

  // Execution actions
  startExecution: (config: CanvasConfig) => Promise<void>;
  resetExecution: () => void;

  // Session management actions (Sprint 3)
  pauseExecution: () => Promise<void>;
  resumeExecution: () => Promise<void>;
  cancelExecution: () => Promise<void>;
  restartExecution: () => Promise<void>;
  submitErrorDecision: (decision: "retry" | "skip" | "abort") => Promise<void>;

  // Template actions (Sprint 3)
  loadTemplates: () => Promise<void>;
  applyTemplate: (templateId: string) => Promise<void>;

  /** Internal: consume SSE stream. Not for external use. */
  _consumeSSEStream: (runId: string) => Promise<void>;
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

export interface SafetySlice {
  safetyConfig: SafetyConfig | null;
  safetyLoading: boolean;
  testResult: SafetyTestResult | null;

  fetchSafety: () => Promise<void>;
  updateGlobalSafetyRules: (rules: Partial<GlobalSafetyRules>) => Promise<void>;
  setNodeSafetyRules: (nodeId: string, rules: AgentSafetyRules) => Promise<void>;
  removeNodeSafetyRules: (nodeId: string) => Promise<void>;
  testSafetyCommand: (nodeId: string, command: string, agentTools: AgentTool[]) => Promise<void>;
}

export interface AuditSlice {
  runs: RunSummary[];
  runsLoading: boolean;
  selectedRunId: string | null;
  auditEntries: AuditEntry[];
  auditFilter: AuditFilter;
  replayEvents: SSEEvent[];
  replayIndex: number;
  isReplaying: boolean;

  fetchRuns: () => Promise<void>;
  selectRun: (runId: string) => Promise<void>;
  setAuditFilter: (filter: Partial<AuditFilter>) => void;
  startReplay: (runId: string) => Promise<void>;
  stepReplay: () => void;
  stopReplay: () => void;
}

export interface AssemblySlice {
  assemblyLoading: boolean;
  assemblyError: string | null;
  assemblyResult: AssemblyResult | null;
  patternLibraryOpen: boolean;
  allPatterns: RoutingPattern[];
  patternsLoading: boolean;

  generateFromDescription: (description: string, patternId?: string, budgetSensitive?: boolean) => Promise<void>;
  clearAssembly: () => void;
  applyAssemblyResult: () => void;
  setPatternLibraryOpen: (open: boolean) => void;
  fetchPatterns: () => Promise<void>;
}

export interface AssistantSlice {
  assistantVisible: boolean;
  assistantContext: AssistantContext;
  assistantMessages: AssistantMessage[];
  assistantStreaming: boolean;
  assistantStreamingContent: string;
  pendingActions: CanvasAction[];
  assistantSuggestions: string[];

  toggleAssistant: () => void;
  setAssistantContext: (context: AssistantContext) => void;
  sendAssistantMessage: (message: string) => Promise<void>;
  applyAction: (action: CanvasAction) => void;
  applyAllActions: () => void;
  clearAssistantChat: () => void;
  fetchAssistantSuggestions: () => Promise<void>;
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
  WorkspaceSlice &
  FactorySlice &
  SafetySlice &
  AuditSlice &
  AssemblySlice &
  AssistantSlice;

/** Typed slice creator — each slice can access the full AppState */
export type SliceCreator<T> = StateCreator<
  AppState,
  [["zustand/immer", never], ["zustand/devtools", never]],
  [],
  T
>;
