import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { FlowTemplate } from "@open-agents/shared";

// Resolve the templates directory relative to the monorepo root
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "..", "..", "templates");

let cachedTemplates: FlowTemplate[] | null = null;

async function loadFromDir(dir: string, type: "flow" | "pool"): Promise<FlowTemplate[]> {
  try {
    const files = await readdir(dir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const templates: FlowTemplate[] = [];
    for (const file of jsonFiles) {
      const raw = await readFile(join(dir, file), "utf-8");
      const data = JSON.parse(raw) as FlowTemplate;
      if (!data.id) data.id = basename(file, ".json");
      if (!data.type) data.type = type;
      templates.push(data);
    }
    return templates;
  } catch {
    return [];
  }
}

export async function loadTemplates(): Promise<FlowTemplate[]> {
  if (cachedTemplates) return cachedTemplates;

  const [flows, pools] = await Promise.all([
    loadFromDir(join(TEMPLATES_DIR, "flows"), "flow"),
    loadFromDir(join(TEMPLATES_DIR, "pools"), "pool"),
  ]);

  cachedTemplates = [...flows, ...pools].sort((a, b) => a.name.localeCompare(b.name));
  return cachedTemplates;
}

export function getTemplate(id: string): FlowTemplate | undefined {
  return cachedTemplates?.find((t) => t.id === id);
}

export function reloadTemplates(): void {
  cachedTemplates = null;
}
