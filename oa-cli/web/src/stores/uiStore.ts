import { create } from 'zustand';
import type { MainTab, DetailTab } from '../types';

interface UIStore {
  activeMainTab: MainTab;
  activeDetailTab: DetailTab;
  sidebarCollapsed: boolean;
  sessionStart: number;

  setMainTab: (tab: MainTab) => void;
  setDetailTab: (tab: DetailTab) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeMainTab: 'dashboard',
  activeDetailTab: 'session',
  sidebarCollapsed: false,
  sessionStart: Date.now(),

  setMainTab: (tab) => set({ activeMainTab: tab }),
  setDetailTab: (tab) => set({ activeDetailTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
