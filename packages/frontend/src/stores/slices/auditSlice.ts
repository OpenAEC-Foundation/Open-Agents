import type {
  RunSummary,
  AuditEntry,
  AuditFilter,
  SSEEvent,
} from "@open-agents/shared";
import type { SliceCreator, AuditSlice } from "../types";
import {
  fetchRuns as apiFetchRuns,
  fetchAuditEntries,
  fetchReplayEvents,
} from "../../services/auditService";

export const createAuditSlice: SliceCreator<AuditSlice> = (set, get) => ({
  runs: [],
  runsLoading: false,
  selectedRunId: null,
  auditEntries: [],
  auditFilter: {},
  replayEvents: [],
  replayIndex: 0,
  isReplaying: false,

  fetchRuns: async () => {
    set((state) => { state.runsLoading = true; });
    try {
      const runs = await apiFetchRuns();
      set((state) => {
        state.runs = runs;
        state.runsLoading = false;
      });
    } catch (err) {
      console.error("fetchRuns failed:", err);
      set((state) => { state.runsLoading = false; });
    }
  },

  selectRun: async (runId) => {
    set((state) => {
      state.selectedRunId = runId;
      state.runsLoading = true;
    });
    try {
      const entries = await fetchAuditEntries({ runId });
      set((state) => {
        state.auditEntries = entries;
        state.runsLoading = false;
      });
    } catch (err) {
      console.error("selectRun failed:", err);
      set((state) => { state.runsLoading = false; });
    }
  },

  setAuditFilter: (filter) => {
    set((state) => {
      state.auditFilter = { ...state.auditFilter, ...filter };
    });
    const fullFilter = get().auditFilter;
    fetchAuditEntries(fullFilter)
      .then((entries) => {
        set((state) => { state.auditEntries = entries; });
      })
      .catch((err) => {
        console.error("setAuditFilter fetch failed:", err);
      });
  },

  startReplay: async (runId) => {
    set((state) => { state.runsLoading = true; });
    try {
      const events = await fetchReplayEvents(runId);
      set((state) => {
        state.replayEvents = events;
        state.replayIndex = 0;
        state.isReplaying = true;
        state.runsLoading = false;
      });
    } catch (err) {
      console.error("startReplay failed:", err);
      set((state) => { state.runsLoading = false; });
    }
  },

  stepReplay: () => {
    set((state) => {
      if (state.replayIndex < state.replayEvents.length) {
        state.replayIndex += 1;
      }
    });
  },

  stopReplay: () => {
    set((state) => {
      state.isReplaying = false;
      state.replayIndex = 0;
    });
  },
});
