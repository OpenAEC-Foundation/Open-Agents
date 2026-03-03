import { create } from 'zustand';
import type { Agent, ActivityEvent, HierarchyItem, ModelDistItem, SpawnAgentBody } from '../types';
import * as api from '../api/client';

// --- Utility functions ---

export function statusColor(status: string): string {
  switch (status) {
    case 'running': return '#22d3ee';
    case 'done': return '#4ade80';
    case 'error':
    case 'failed': return '#f87171';
    case 'timeout': return '#fbbf24';
    case 'killed': return '#9ca3af';
    default: return '#8b95a5';
  }
}

export function modelColor(model: string): string {
  if (model.includes('opus')) return '#a78bfa';
  if (model.includes('sonnet')) return '#60a5fa';
  if (model.includes('haiku')) return '#22d3ee';
  if (model.includes('ollama')) return '#fb923c';
  return '#8b95a5';
}

export function modelLabel(model: string): string {
  const parts = model.split('/');
  return parts[parts.length - 1];
}

export function formatDuration(startEpoch: number, endEpoch: number | null): string {
  const end = endEpoch ?? Date.now() / 1000;
  const diff = Math.max(0, Math.floor(end - startEpoch));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function buildHierarchy(agents: Agent[]): HierarchyItem[] {
  const result: HierarchyItem[] = [];
  const visited = new Set<string>();

  function addNode(agent: Agent, depth: number) {
    if (visited.has(agent.name)) return;
    visited.add(agent.name);
    result.push({ agent, depth });
    const children = agents
      .filter((a) => a.parent === agent.name)
      .sort((a, b) => a.created_at - b.created_at);
    for (const child of children) {
      addNode(child, depth + 1);
    }
  }

  const roots = agents
    .filter((a) => !a.parent || !agents.find((p) => p.name === a.parent))
    .sort((a, b) => a.created_at - b.created_at);

  for (const root of roots) {
    addNode(root, 0);
  }

  for (const a of agents) {
    if (!visited.has(a.name)) {
      addNode(a, 0);
    }
  }

  return result;
}

// --- Store ---

interface AgentStore {
  agents: Agent[];
  selectedAgent: string | null;
  agentDetail: Agent | null;
  activityLog: ActivityEvent[];
  eventIdCounter: number;
  prevAgentStatuses: Record<string, string>;
  initialLoadDone: boolean;

  fetchAgents: () => Promise<void>;
  fetchDetail: (name: string) => Promise<void>;
  selectAgent: (name: string | null) => void;
  spawnAgent: (body: SpawnAgentBody) => Promise<Agent>;
  killAgent: (name: string) => Promise<void>;
  cleanAgents: () => Promise<void>;

  getRunning: () => Agent[];
  getDone: () => Agent[];
  getFailed: () => Agent[];
  getHierarchy: () => HierarchyItem[];
  getModelDistribution: () => ModelDistItem[];
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  selectedAgent: null,
  agentDetail: null,
  activityLog: [],
  eventIdCounter: 0,
  prevAgentStatuses: {},
  initialLoadDone: false,

  fetchAgents: async () => {
    try {
      const data = await api.fetchAgents();
      const state = get();

      if (!state.initialLoadDone) {
        const map: Record<string, string> = {};
        for (const a of data) map[a.name] = a.status;
        set({ agents: data, prevAgentStatuses: map, initialLoadDone: true });
        return;
      }

      const prevMap = state.prevAgentStatuses;
      const newEvents: ActivityEvent[] = [];
      let counter = state.eventIdCounter;

      for (const a of data) {
        const prev = prevMap[a.name];
        if (prev === undefined) {
          newEvents.push({
            id: ++counter,
            time: Date.now() / 1000,
            text: `${a.name} spawned (${modelLabel(a.model)})`,
            color: '#22d3ee',
          });
        } else if (prev !== a.status) {
          newEvents.push({
            id: ++counter,
            time: Date.now() / 1000,
            text: `${a.name} \u2192 ${a.status}`,
            color: statusColor(a.status),
          });
        }
      }

      for (const name of Object.keys(prevMap)) {
        if (!data.find((a) => a.name === name)) {
          newEvents.push({
            id: ++counter,
            time: Date.now() / 1000,
            text: `${name} cleaned`,
            color: '#8b95a5',
          });
        }
      }

      const newMap: Record<string, string> = {};
      for (const a of data) newMap[a.name] = a.status;

      set({
        agents: data,
        prevAgentStatuses: newMap,
        eventIdCounter: counter,
        activityLog: newEvents.length > 0
          ? [...newEvents, ...state.activityLog].slice(0, 50)
          : state.activityLog,
      });
    } catch {
      // Bridge not running
    }
  },

  fetchDetail: async (name: string) => {
    try {
      const detail = await api.fetchAgentDetail(name);
      set({ agentDetail: detail });
    } catch {
      // ignore
    }
  },

  selectAgent: (name: string | null) => {
    set({ selectedAgent: name, agentDetail: null });
  },

  spawnAgent: async (body: SpawnAgentBody) => {
    await api.startSession();
    const agent = await api.spawnAgent(body);
    set({ selectedAgent: agent.name });
    get().fetchAgents();
    return agent;
  },

  killAgent: async (name: string) => {
    await api.killAgent(name);
    get().fetchAgents();
  },

  cleanAgents: async () => {
    await api.cleanAgents();
    set({ selectedAgent: null, agentDetail: null });
    get().fetchAgents();
  },

  getRunning: () => get().agents.filter((a) => a.status === 'running'),
  getDone: () => get().agents.filter((a) => a.status === 'done'),
  getFailed: () => get().agents.filter((a) => ['error', 'failed', 'timeout', 'killed'].includes(a.status)),

  getHierarchy: () => buildHierarchy(get().agents),

  getModelDistribution: () => {
    const map: Record<string, ModelDistItem> = {};
    for (const a of get().agents) {
      const lbl = modelLabel(a.model);
      if (!map[lbl]) map[lbl] = { label: lbl, model: a.model, count: 0 };
      map[lbl].count++;
    }
    return Object.values(map);
  },
}));
