import type { FastifyInstance } from "fastify";
import type { AgentPreset } from "@open-agents/shared";
import { loadPresets } from "../preset-loader.js";

let cachedPresets: AgentPreset[] | null = null;

export async function presetRoutes(app: FastifyInstance) {
  app.get("/presets", async () => {
    if (!cachedPresets) {
      cachedPresets = await loadPresets();
    }
    return cachedPresets;
  });

  // Reload presets (useful during development)
  app.post("/presets/reload", async () => {
    cachedPresets = null;
    cachedPresets = await loadPresets();
    return { count: cachedPresets.length };
  });
}
