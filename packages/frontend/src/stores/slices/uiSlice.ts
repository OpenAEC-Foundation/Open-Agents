import type { SliceCreator, UISlice } from "../types";

export const createUISlice: SliceCreator<UISlice> = (set) => ({
  sidebarOpen: true,
  chatPanelOpen: false,
  exportedJson: null,
  connectModalOpen: false,

  setSidebarOpen: (open) => set((state) => { state.sidebarOpen = open; }),
  setChatPanelOpen: (open) => set((state) => { state.chatPanelOpen = open; }),
  setExportedJson: (json) => set((state) => { state.exportedJson = json; }),
  setConnectModalOpen: (open) => set((state) => { state.connectModalOpen = open; }),
});
