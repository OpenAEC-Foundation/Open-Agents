import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SkillLevel, ProviderConnection, ModelProvider } from "@open-agents/shared";
import { defaultThemeId } from "../themes/themes";

const API_BASE = "http://localhost:3001/api";

interface SettingsState {
  skillLevel: SkillLevel;
  setSkillLevel: (level: SkillLevel) => void;
  themeId: string;
  setThemeId: (id: string) => void;

  // Provider connections
  providers: ProviderConnection[];
  connectModalOpen: boolean;
  setConnectModalOpen: (open: boolean) => void;

  /** Fetch current connection status from backend */
  fetchConnections: () => Promise<void>;

  /** Validate and store an API key */
  connectProvider: (provider: ModelProvider, apiKey: string) => Promise<{ ok: boolean; error?: string }>;

  /** Disconnect a provider */
  disconnectProvider: (provider: ModelProvider) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      skillLevel: "intermediate",
      setSkillLevel: (level) => set({ skillLevel: level }),
      themeId: defaultThemeId,
      setThemeId: (id) => set({ themeId: id }),

      providers: [],
      connectModalOpen: false,
      setConnectModalOpen: (open) => set({ connectModalOpen: open }),

      fetchConnections: async () => {
        try {
          const res = await fetch(`${API_BASE}/connect`);
          if (res.ok) {
            const data = await res.json() as { providers: ProviderConnection[] };
            set({ providers: data.providers });
          }
        } catch {
          // Backend not available — leave providers empty
        }
      },

      connectProvider: async (provider, apiKey) => {
        // Optimistic: mark as validating
        set({
          providers: get().providers.map((p) =>
            p.provider === provider ? { ...p, status: "validating" as const } : p,
          ),
        });

        try {
          const res = await fetch(`${API_BASE}/connect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider, apiKey }),
          });

          const data = await res.json() as { status: string; error?: string };

          if (res.ok && data.status === "ok") {
            await get().fetchConnections();
            return { ok: true };
          }

          // Revert on failure
          await get().fetchConnections();
          return { ok: false, error: data.error ?? "Validation failed" };
        } catch (err) {
          await get().fetchConnections();
          return { ok: false, error: err instanceof Error ? err.message : "Network error" };
        }
      },

      disconnectProvider: async (provider) => {
        await fetch(`${API_BASE}/connect/${provider}`, { method: "DELETE" });
        await get().fetchConnections();
      },
    }),
    {
      name: "open-agents-settings",
      // Only persist UI preferences, not connection state (that lives on backend)
      partialize: (state) => ({
        skillLevel: state.skillLevel,
        themeId: state.themeId,
      }),
    },
  ),
);
