import type { AgentDefinition } from "@open-agents/shared";
import type { SliceCreator, FactorySlice } from "../types";

import { getApiBase } from "../../services/apiConfig";


export const createFactorySlice: SliceCreator<FactorySlice> = (set, get) => ({
  wizardOpen: false,
  wizardStep: 0,
  wizardDraft: {},

  agents: [],
  agentsLoading: false,

  openWizard: () => set((state) => {
    state.wizardOpen = true;
    state.wizardStep = 0;
    state.wizardDraft = {
      name: "",
      description: "",
      model: "anthropic/claude-sonnet-4-6",
      systemPrompt: "",
      tools: ["Read", "Glob", "Grep"],
      category: "general",
      tags: [],
    };
  }),

  closeWizard: () => set((state) => {
    state.wizardOpen = false;
    state.wizardStep = 0;
    state.wizardDraft = {};
  }),

  setWizardStep: (step) => set((state) => { state.wizardStep = step; }),

  updateWizardDraft: (patch) => set((state) => {
    state.wizardDraft = { ...state.wizardDraft, ...patch };
  }),

  submitWizard: async () => {
    const draft = get().wizardDraft;
    if (!draft.name || !draft.systemPrompt || !draft.model) return;

    try {
      const res = await fetch(`${getApiBase()}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to create agent");

      const created: AgentDefinition = await res.json();
      set((state) => {
        state.agents.push(created);
        state.wizardOpen = false;
        state.wizardStep = 0;
        state.wizardDraft = {};
      });
    } catch (err) {
      console.error("Failed to create agent:", err);
    }
  },

  fetchAgents: async () => {
    set((state) => { state.agentsLoading = true; });
    try {
      const res = await fetch(`${getApiBase()}/agents`);
      if (!res.ok) throw new Error("Failed to fetch agents");
      const data: AgentDefinition[] = await res.json();
      set((state) => {
        state.agents = data;
        state.agentsLoading = false;
      });
    } catch {
      set((state) => { state.agentsLoading = false; });
    }
  },

  deleteAgent: async (id) => {
    try {
      const res = await fetch(`${getApiBase()}/agents/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete");
      set((state) => {
        state.agents = state.agents.filter((a) => a.id !== id);
      });
    } catch (err) {
      console.error("Failed to delete agent:", err);
    }
  },
});
