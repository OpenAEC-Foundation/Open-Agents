import type { AgentDefinition } from "@open-agents/shared";
import type { SliceCreator, FactorySlice } from "../types";

import { getApiBase } from "../../services/apiConfig";


export const createFactorySlice: SliceCreator<FactorySlice> = (set, get) => ({
  wizardOpen: false,
  wizardStep: 0,
  wizardDraft: {},

  agents: [],
  agentsLoading: false,
  categories: [],
  selectedCategory: null,
  selectedMaturity: null,

  // Generator state (Fase 2.4)
  generatorOpen: false,
  generatorLoading: false,
  generatorDraft: null,
  generatorError: null,

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

  // Generator actions (Fase 2.4)
  openGenerator: () => set((state) => {
    state.generatorOpen = true;
    state.generatorDraft = null;
    state.generatorError = null;
  }),

  closeGenerator: () => set((state) => {
    state.generatorOpen = false;
    state.generatorLoading = false;
    state.generatorDraft = null;
    state.generatorError = null;
  }),

  generateAgent: async (description: string) => {
    set((state) => {
      state.generatorLoading = true;
      state.generatorError = null;
      state.generatorDraft = null;
    });

    try {
      const res = await fetch(`${getApiBase()}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, assetType: "agent" }),
      });

      const data = await res.json();
      if (!res.ok) {
        set((state) => {
          state.generatorLoading = false;
          state.generatorError = data.error ?? "Generation failed";
        });
        return;
      }

      set((state) => {
        state.generatorLoading = false;
        state.generatorDraft = data.draft;
      });
    } catch (err) {
      set((state) => {
        state.generatorLoading = false;
        state.generatorError = err instanceof Error ? err.message : "Network error";
      });
    }
  },

  refineAgent: async (refinementPrompt: string) => {
    const existing = get().generatorDraft;
    if (!existing) return;

    set((state) => {
      state.generatorLoading = true;
      state.generatorError = null;
    });

    try {
      const res = await fetch(`${getApiBase()}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: refinementPrompt,
          assetType: "agent",
          existingDraft: existing,
          refinementPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        set((state) => {
          state.generatorLoading = false;
          state.generatorError = data.error ?? "Refinement failed";
        });
        return;
      }

      set((state) => {
        state.generatorLoading = false;
        state.generatorDraft = data.draft;
      });
    } catch (err) {
      set((state) => {
        state.generatorLoading = false;
        state.generatorError = err instanceof Error ? err.message : "Network error";
      });
    }
  },

  updateGeneratorDraft: (patch) => set((state) => {
    if (state.generatorDraft) {
      state.generatorDraft = { ...state.generatorDraft, ...patch };
    }
  }),

  acceptGeneratorDraft: async () => {
    const draft = get().generatorDraft;
    if (!draft?.name || !draft?.systemPrompt || !draft?.model) return;

    try {
      const res = await fetch(`${getApiBase()}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to save agent");

      const created: AgentDefinition = await res.json();
      set((state) => {
        state.agents.push(created);
        state.generatorOpen = false;
        state.generatorLoading = false;
        state.generatorDraft = null;
        state.generatorError = null;
      });
    } catch (err) {
      console.error("Failed to save generated agent:", err);
    }
  },

  setSelectedCategory: (category) => set((state) => {
    state.selectedCategory = category;
  }),

  setSelectedMaturity: (maturity) => set((state) => {
    state.selectedMaturity = maturity;
  }),

  fetchAgents: async () => {
    set((state) => { state.agentsLoading = true; });
    try {
      const res = await fetch(`${getApiBase()}/agents`);
      if (!res.ok) throw new Error("Failed to fetch agents");
      const data: AgentDefinition[] = await res.json();
      const cats = [...new Set(data.map((a) => a.category).filter(Boolean))] as string[];
      set((state) => {
        state.agents = data;
        state.categories = cats.sort();
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
