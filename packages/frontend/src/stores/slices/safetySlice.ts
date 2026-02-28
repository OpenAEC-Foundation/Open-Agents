import type {
  SafetyConfig,
  GlobalSafetyRules,
  AgentSafetyRules,
  SafetyTestResult,
  AgentTool,
} from "@open-agents/shared";
import type { SliceCreator, SafetySlice } from "../types";
import {
  fetchSafetyConfig,
  updateGlobalRules as apiUpdateGlobalRules,
  setNodeRules as apiSetNodeRules,
  removeNodeRules as apiRemoveNodeRules,
  testSafetyCommand as apiTestSafetyCommand,
} from "../../services/safetyService";

export const createSafetySlice: SliceCreator<SafetySlice> = (set) => ({
  safetyConfig: null,
  safetyLoading: false,
  testResult: null,

  fetchSafety: async () => {
    set((state) => { state.safetyLoading = true; });
    try {
      const config = await fetchSafetyConfig();
      set((state) => {
        state.safetyConfig = config;
        state.safetyLoading = false;
      });
    } catch (err) {
      console.error("fetchSafety failed:", err);
      set((state) => { state.safetyLoading = false; });
    }
  },

  updateGlobalSafetyRules: async (rules) => {
    set((state) => { state.safetyLoading = true; });
    try {
      const config = await apiUpdateGlobalRules(rules);
      set((state) => {
        state.safetyConfig = config;
        state.safetyLoading = false;
      });
    } catch (err) {
      console.error("updateGlobalSafetyRules failed:", err);
      set((state) => { state.safetyLoading = false; });
    }
  },

  setNodeSafetyRules: async (nodeId, rules) => {
    set((state) => { state.safetyLoading = true; });
    try {
      const config = await apiSetNodeRules(nodeId, rules);
      set((state) => {
        state.safetyConfig = config;
        state.safetyLoading = false;
      });
    } catch (err) {
      console.error("setNodeSafetyRules failed:", err);
      set((state) => { state.safetyLoading = false; });
    }
  },

  removeNodeSafetyRules: async (nodeId) => {
    set((state) => { state.safetyLoading = true; });
    try {
      const config = await apiRemoveNodeRules(nodeId);
      set((state) => {
        state.safetyConfig = config;
        state.safetyLoading = false;
      });
    } catch (err) {
      console.error("removeNodeSafetyRules failed:", err);
      set((state) => { state.safetyLoading = false; });
    }
  },

  testSafetyCommand: async (nodeId, command, agentTools) => {
    set((state) => { state.safetyLoading = true; });
    try {
      const result = await apiTestSafetyCommand(nodeId, command, agentTools);
      set((state) => {
        state.testResult = result;
        state.safetyLoading = false;
      });
    } catch (err) {
      console.error("testSafetyCommand failed:", err);
      set((state) => { state.safetyLoading = false; });
    }
  },
});
