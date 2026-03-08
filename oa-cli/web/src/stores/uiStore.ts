import { create } from 'zustand';
import type { MainTab, DetailTab } from '../types';
import { DEFAULT_THEME_ID } from '../themes';

interface UIStore {
  activeMainTab: MainTab;
  activeDetailTab: DetailTab;
  sidebarCollapsed: boolean;
  sessionStart: number;
  prefilledTask: string | null;
  prefilledModel: string | null;
  themeId: string;

  setMainTab: (tab: MainTab) => void;
  setDetailTab: (tab: DetailTab) => void;
  toggleSidebar: () => void;
  setPrefilledTask: (task: string | null, model?: string | null) => void;
  clearPrefilled: () => void;
  setTheme: (id: string) => void;
}

const savedTheme = localStorage.getItem('oa-theme') ?? DEFAULT_THEME_ID;

export const useUIStore = create<UIStore>((set) => ({
  activeMainTab: 'dashboard',
  activeDetailTab: 'session',
  sidebarCollapsed: false,
  sessionStart: Date.now(),
  prefilledTask: null,
  prefilledModel: null,
  themeId: savedTheme,

  setMainTab: (tab) => set({ activeMainTab: tab }),
  setDetailTab: (tab) => set({ activeDetailTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setPrefilledTask: (task, model = null) => set({ prefilledTask: task, prefilledModel: model }),
  clearPrefilled: () => set({ prefilledTask: null, prefilledModel: null }),
  setTheme: (id) => {
    localStorage.setItem('oa-theme', id);
    set({ themeId: id });
  },
}));
