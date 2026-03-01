import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentPreset, AgentNodeData, AgentMaturity } from "@open-agents/shared";
import { deriveMaturity } from "@open-agents/shared";

/** Raw JSON format of library files in agents/library/<category>/ */
interface LibraryFile {
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  tools: string[];
  category?: string;
  tags?: string[];
  maturity?: string;
}

// Resolve the library directory relative to the monorepo root
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const LIBRARY_DIR = join(__dirname, "..", "..", "..", "agents", "library");

export async function loadLibrary(): Promise<AgentPreset[]> {
  const agents: AgentPreset[] = [];

  let categories: string[];
  try {
    categories = await readdir(LIBRARY_DIR);
  } catch {
    // Library directory doesn't exist yet — not an error
    return [];
  }

  for (const category of categories) {
    const categoryDir = join(LIBRARY_DIR, category);
    let files: string[];
    try {
      files = await readdir(categoryDir);
    } catch {
      continue; // Skip non-directories
    }

    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    for (const file of jsonFiles) {
      try {
        const raw = await readFile(join(categoryDir, file), "utf-8");
        const data: LibraryFile = JSON.parse(raw);
        const id = `${category}/${basename(file, ".json")}`;
        const tools = data.tools as AgentNodeData["tools"];
        const maturity = (data.maturity as AgentMaturity) || deriveMaturity(tools);

        agents.push({
          id,
          name: data.name,
          description: data.description,
          category: data.category || category,
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
      } catch {
        // Skip malformed files
        console.warn(`Skipping malformed library agent: ${category}/${file}`);
      }
    }
  }

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}
