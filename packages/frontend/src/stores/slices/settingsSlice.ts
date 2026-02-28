import type { SliceCreator, SettingsSlice } from "../types";
import { defaultThemeId } from "../../themes/themes";
import * as providerService from "../../services/providerService";

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set, get) => ({
  skillLevel: "intermediate",
  themeId: defaultThemeId,
  providers: [],

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
});
