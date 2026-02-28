import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { FlowTemplate } from "@open-agents/shared";

// Resolve the templates directory relative to the monorepo root
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "..", "..", "templates", "flows");

let cachedTemplates: FlowTemplate[] | null = null;

export async function loadTemplates(): Promise<FlowTemplate[]> {
  if (cachedTemplates) return cachedTemplates;

  try {
    const files = await readdir(TEMPLATES_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const templates: FlowTemplate[] = [];
    for (const file of jsonFiles) {
      const raw = await readFile(join(TEMPLATES_DIR, file), "utf-8");
      const data = JSON.parse(raw) as FlowTemplate;
      // Use filename as fallback ID
      if (!data.id) data.id = basename(file, ".json");
      templates.push(data);
    }

    cachedTemplates = templates.sort((a, b) => a.name.localeCompare(b.name));
    return cachedTemplates;
  } catch {
    // templates/flows/ directory may not exist yet
    return [];
  }
}

export function getTemplate(id: string): FlowTemplate | undefined {
  return cachedTemplates?.find((t) => t.id === id);
}

export function reloadTemplates(): void {
  cachedTemplates = null;
}
