// --- Shared Types ---

export interface Agent {
  name: string;
  task: string;
  workspace: string;
  tmux_window: string;
  model: string;
  parent: string | null;
  status: string;
  created_at: number;
  finished_at: number | null;
  live_output?: string | null;
  result?: string | null;
}

export interface Proposal {
  filename: string;
  content: string;
}

export interface ProposalsData {
  summary: string | null;
  proposals: Proposal[];
}

export interface ActivityEvent {
  id: number;
  time: number;
  text: string;
  color: string;
}

export interface HierarchyItem {
  agent: Agent;
  depth: number;
}

export interface ModelDistItem {
  label: string;
  model: string;
  count: number;
}

export interface SpawnAgentBody {
  task: string;
  name?: string;
  model?: string;
  parent?: string;
}

// Tab types
export type MainTab = 'dashboard' | 'builder' | 'templates' | 'context' | 'settings';
export type DetailTab = 'session' | 'output' | 'proposals' | 'info';

// Template types
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: FlowNodeData[];
  edges: FlowEdgeData[];
  config: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface FlowNodeData {
  id: string;
  type: 'trigger' | 'agent' | 'condition' | 'output';
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// Context types
export interface ContextItem {
  id: string;
  type: 'file' | 'snippet' | 'instruction';
  name: string;
  content: string;
  tokens: number;
}

export interface Snippet {
  id: string;
  name: string;
  content: string;
  category: string;
}

// Settings types
export interface Settings {
  defaultModel: string;
  maxConcurrentAgents: number;
  defaultTimeout: number;
  apiKeys: Record<string, string>;
  ollamaEndpoint: string;
  theme: 'dark';
}
