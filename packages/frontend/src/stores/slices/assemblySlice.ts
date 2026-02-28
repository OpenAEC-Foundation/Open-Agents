import type { AssemblyResult, RoutingPattern } from "@open-agents/shared";
import type { Node, Edge } from "@xyflow/react";
import type { SliceCreator, AssemblySlice } from "../types";
import { getApiBase } from "../../services/apiConfig";

export const createAssemblySlice: SliceCreator<AssemblySlice> = (set, get) => ({
  assemblyLoading: false,
  assemblyError: null,
  assemblyResult: null,
  patternLibraryOpen: false,
  allPatterns: [],
  patternsLoading: false,

  generateFromDescription: async (description, patternId, budgetSensitive) => {
    set((state) => {
      state.assemblyLoading = true;
      state.assemblyError = null;
      state.assemblyResult = null;
    });

    try {
      const res = await fetch(`${getApiBase()}/assembly/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, patternId, budgetSensitive }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      set((state) => {
        state.assemblyResult = data as AssemblyResult;
        state.assemblyLoading = false;
      });
    } catch (err) {
      set((state) => {
        state.assemblyError = err instanceof Error ? err.message : "Assembly failed";
        state.assemblyLoading = false;
      });
    }
  },

  clearAssembly: () =>
    set((state) => {
      state.assemblyResult = null;
      state.assemblyError = null;
    }),

  applyAssemblyResult: () => {
    const result = get().assemblyResult;
    if (!result?.config) return;

    const { nodes: configNodes, edges: configEdges } = result.config;

    // Convert to React Flow nodes/edges
    const rfNodes: Node[] = configNodes.map((n) => ({
      id: n.id,
      type: "agent",
      position: n.position,
      data: n.data,
    }));

    const rfEdges: Edge[] = configEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    get().setCanvas(rfNodes, rfEdges);

    // Clear assembly state after applying
    set((state) => {
      state.assemblyResult = null;
    });
  },

  setPatternLibraryOpen: (open) =>
    set((state) => {
      state.patternLibraryOpen = open;
    }),

  fetchPatterns: async () => {
    set((state) => {
      state.patternsLoading = true;
    });

    try {
      const res = await fetch(`${getApiBase()}/knowledge/patterns`);
      if (res.ok) {
        const patterns = (await res.json()) as RoutingPattern[];
        set((state) => {
          state.allPatterns = patterns;
          state.patternsLoading = false;
        });
      }
    } catch {
      set((state) => {
        state.patternsLoading = false;
      });
    }
  },
});
