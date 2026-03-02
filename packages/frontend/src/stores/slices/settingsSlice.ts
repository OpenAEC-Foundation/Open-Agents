import type { SliceCreator, SettingsSlice } from "../types";
import { defaultThemeId } from "../../themes/themes";
import * as providerService from "../../services/providerService";
import { getApiBase } from "../../services/apiConfig";

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set, get) => ({
  skillLevel: "intermediate",
  themeId: defaultThemeId,
  providers: [],
  userInstructions: "",
  userInstructionsLoading: false,

  setSkillLevel: (level) => set((state) => { state.skillLevel = level; }),
  setThemeId: (id) => set((state) => { state.themeId = id; }),

  fetchConnections: async () => {
    try {
      const providers = await providerService.fetchConnections();
      set((state) => { state.providers = providers; });
    } catch {
      // Backend not available — leave providers empty
    }
  },

  connectProvider: async (provider, apiKey) => {
    // Optimistic: mark as validating
    set((state) => {
      const p = state.providers.find((pp) => pp.provider === provider);
      if (p) p.status = "validating";
    });

    try {
      const result = await providerService.connectProvider(provider, apiKey);
      await get().fetchConnections();
      return result;
    } catch (err) {
      await get().fetchConnections();
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  },

  disconnectProvider: async (provider) => {
    await providerService.disconnectProvider(provider);
    await get().fetchConnections();
  },

  fetchUserInstructions: async () => {
    set((state) => { state.userInstructionsLoading = true; });
    try {
      const res = await fetch(`${getApiBase()}/instructions`);
      if (res.ok) {
        const data = await res.json();
        set((state) => {
          state.userInstructions = data.raw ?? "";
          state.userInstructionsLoading = false;
        });
      } else {
        set((state) => { state.userInstructionsLoading = false; });
      }
    } catch {
      set((state) => { state.userInstructionsLoading = false; });
    }
  },

  saveUserInstructions: async (content) => {
    set((state) => { state.userInstructions = content; });
    try {
      await fetch(`${getApiBase()}/instructions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } catch {
      // Backend offline — local state updated, file not saved
    }
  },
});
