import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentPreset, AgentNodeData, AgentMaturity } from "@open-agents/shared";
import { deriveMaturity } from "@open-agents/shared";

/** Raw JSON format of preset files in agents/presets/ */
interface PresetFile {
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  tools: string[];
  category?: string;
  tags?: string[];
  maturity?: string;
}

// Resolve the presets directory relative to the monorepo root
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PRESETS_DIR = join(__dirname, "..", "..", "..", "agents", "presets");

export async function loadPresets(): Promise<AgentPreset[]> {
  const files = await readdir(PRESETS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const presets: AgentPreset[] = [];
  for (const file of jsonFiles) {
    const raw = await readFile(join(PRESETS_DIR, file), "utf-8");
    const data: PresetFile = JSON.parse(raw);
    const id = basename(file, ".json");
    const tools = data.tools as AgentNodeData["tools"];
    const maturity = (data.maturity as AgentMaturity) || deriveMaturity(tools);

    presets.push({
      id,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      maturity,
      agent: {
        name: data.name,
        description: data.description,
        model: data.model as AgentNodeData["model"],
        systemPrompt: data.systemPrompt,
        tools,
        maturity,
      },
    });
  }

  return presets.sort((a, b) => a.name.localeCompare(b.name));
}
