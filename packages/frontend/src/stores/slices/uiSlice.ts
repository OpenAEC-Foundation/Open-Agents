import type { SliceCreator, UISlice } from "../types";

export const createUISlice: SliceCreator<UISlice> = (set) => ({
  activeTab: "canvas",
  sidebarOpen: true,
  chatPanelOpen: false,
  exportedJson: null,
  connectModalOpen: false,
  selectedOutputNodeId: null,

  setActiveTab: (tab) => set((state) => { state.activeTab = tab; }),
  setSidebarOpen: (open) => set((state) => { state.sidebarOpen = open; }),
  setChatPanelOpen: (open) => set((state) => { state.chatPanelOpen = open; }),
  setExportedJson: (json) => set((state) => { state.exportedJson = json; }),
  setConnectModalOpen: (open) => set((state) => { state.connectModalOpen = open; }),
  setSelectedOutputNodeId: (id) => set((state) => { state.selectedOutputNodeId = id; }),
});
