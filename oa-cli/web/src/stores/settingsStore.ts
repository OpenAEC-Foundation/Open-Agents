import { create } from 'zustand';

interface SettingsStore {
  defaultModel: string;
  maxConcurrentAgents: number;
  defaultTimeout: number;
  apiKeys: Record<string, string>;
  ollamaEndpoint: string;
  ollamaModels: string[];
  ollamaStatus: 'unknown' | 'connected' | 'disconnected';

  updateSetting: <K extends keyof SettingsStore>(key: K, value: SettingsStore[K]) => void;
  loadSettings: () => void;
  saveSettings: () => void;
  testOllamaConnection: () => Promise<boolean>;
}

const STORAGE_KEY = 'oa-settings';

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  defaultModel: 'claude/sonnet',
  maxConcurrentAgents: 5,
  defaultTimeout: 600,
  apiKeys: {},
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModels: [],
  ollamaStatus: 'unknown',

  updateSetting: (key, value) => {
    set({ [key]: value } as Partial<SettingsStore>);
  },

  loadSettings: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set(parsed);
      }
    } catch {
      // Use defaults
    }
  },

  saveSettings: () => {
    const { defaultModel, maxConcurrentAgents, defaultTimeout, apiKeys, ollamaEndpoint } = get();
    const data = { defaultModel, maxConcurrentAgents, defaultTimeout, apiKeys, ollamaEndpoint };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  testOllamaConnection: async () => {
    const { ollamaEndpoint } = get();
    try {
      const res = await fetch(`${ollamaEndpoint}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: { name: string }) => m.name);
        set({ ollamaModels: models, ollamaStatus: 'connected' });
        return true;
      }
      set({ ollamaStatus: 'disconnected', ollamaModels: [] });
      return false;
    } catch {
      set({ ollamaStatus: 'disconnected', ollamaModels: [] });
      return false;
    }
  },
}));
