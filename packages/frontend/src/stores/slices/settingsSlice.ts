import type { ProviderConnection } from "@open-agents/shared";
import type { SliceCreator, SettingsSlice } from "../types";
import { defaultThemeId } from "../../themes/themes";

const API_BASE = "/api";

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set, get) => ({
  skillLevel: "intermediate",
  themeId: defaultThemeId,
  providers: [],

  setSkillLevel: (level) => set((state) => { state.skillLevel = level; }),
  setThemeId: (id) => set((state) => { state.themeId = id; }),

  fetchConnections: async () => {
    try {
      const res = await fetch(`${API_BASE}/connect`);
      if (res.ok) {
        const data = (await res.json()) as { providers: ProviderConnection[] };
        set((state) => { state.providers = data.providers; });
      }
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
      const res = await fetch(`${API_BASE}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      const data = (await res.json()) as { status: string; error?: string };

      if (res.ok && data.status === "ok") {
        await get().fetchConnections();
        return { ok: true };
      }

      await get().fetchConnections();
      return { ok: false, error: data.error ?? "Validation failed" };
    } catch (err) {
      await get().fetchConnections();
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  },

  disconnectProvider: async (provider) => {
    await fetch(`${API_BASE}/connect/${provider}`, { method: "DELETE" });
    await get().fetchConnections();
  },
});
