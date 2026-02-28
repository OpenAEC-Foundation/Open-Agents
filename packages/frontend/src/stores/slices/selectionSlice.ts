import type { SliceCreator, SelectionSlice } from "../types";

export const createSelectionSlice: SliceCreator<SelectionSlice> = (set, get) => ({
  selectedNodeIds: new Set<string>(),
  selectedEdgeIds: new Set<string>(),

  selectNode: (id, additive = false) => {
    set((state) => {
      if (!additive) {
        state.selectedNodeIds = new Set([id]);
        state.selectedEdgeIds = new Set();
      } else {
        const next = new Set(state.selectedNodeIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        state.selectedNodeIds = next;
      }
    });
  },

  selectEdge: (id, additive = false) => {
    set((state) => {
      if (!additive) {
        state.selectedEdgeIds = new Set([id]);
        state.selectedNodeIds = new Set();
      } else {
        const next = new Set(state.selectedEdgeIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        state.selectedEdgeIds = next;
      }
    });
  },

  selectAll: () => {
    set((state) => {
      state.selectedNodeIds = new Set(state.nodes.map((n) => n.id));
      state.selectedEdgeIds = new Set(state.edges.map((e) => e.id));
    });
  },

  clearSelection: () => {
    set((state) => {
      state.selectedNodeIds = new Set();
      state.selectedEdgeIds = new Set();
    });
  },

  deleteSelected: () => {
    const { selectedNodeIds, selectedEdgeIds } = get();
    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;

    set((state) => {
      state.nodes = state.nodes.filter((n) => !selectedNodeIds.has(n.id));
      state.edges = state.edges.filter(
        (e) =>
          !selectedEdgeIds.has(e.id) &&
          !selectedNodeIds.has(e.source) &&
          !selectedNodeIds.has(e.target),
      );
      state.selectedNodeIds = new Set();
      state.selectedEdgeIds = new Set();
    });
    get().pushHistory("Deleted selection");
  },
});
