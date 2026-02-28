import { produceWithPatches, applyPatches, enablePatches, type Patch } from "immer";
import type { SliceCreator, HistorySlice } from "../types";
import type { Node, Edge } from "@xyflow/react";

// Enable Immer patches feature
enablePatches();

/** The subset of state we track in undo/redo history */
interface HistoriedState {
  nodes: Node[];
  edges: Edge[];
}

function getHistoriedState(state: { nodes: Node[]; edges: Edge[] }): HistoriedState {
  return {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
  };
}

/** Snapshot of the last recorded state */
let previousSnapshot: HistoriedState | null = null;

export const createHistorySlice: SliceCreator<HistorySlice> = (set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,
  canUndo: false,
  canRedo: false,

  pushHistory: (label) => {
    const current = getHistoriedState(get());

    if (!previousSnapshot) {
      previousSnapshot = current;
      return;
    }

    // Produce patches between previous and current state
    const [, patches, inversePatches] = produceWithPatches(
      previousSnapshot,
      (draft) => {
        draft.nodes = current.nodes;
        draft.edges = current.edges;
      },
    );

    // No actual change
    if (patches.length === 0) return;

    set((state) => {
      state.past.push({
        label,
        timestamp: Date.now(),
        patches,
        inversePatches,
      });
      // Enforce max history limit
      if (state.past.length > state.maxHistory) {
        state.past = state.past.slice(-state.maxHistory);
      }
      // New action clears redo stack
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    });

    previousSnapshot = current;
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return;

    const entry = past[past.length - 1];
    const historied = getHistoriedState(get());
    const restored = applyPatches(historied, entry.inversePatches) as HistoriedState;

    set((state) => {
      state.nodes = restored.nodes;
      state.edges = restored.edges;
      state.past = state.past.slice(0, -1);
      state.future.push(entry);
      state.canUndo = state.past.length > 0;
      state.canRedo = true;
    });

    previousSnapshot = getHistoriedState(get());
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;

    const entry = future[future.length - 1];
    const historied = getHistoriedState(get());
    const restored = applyPatches(historied, entry.patches) as HistoriedState;

    set((state) => {
      state.nodes = restored.nodes;
      state.edges = restored.edges;
      state.future = state.future.slice(0, -1);
      state.past.push(entry);
      state.canUndo = true;
      state.canRedo = state.future.length > 0;
    });

    previousSnapshot = getHistoriedState(get());
  },

  clearHistory: () => {
    set((state) => {
      state.past = [];
      state.future = [];
      state.canUndo = false;
      state.canRedo = false;
    });
    previousSnapshot = getHistoriedState(get());
  },
});
