import type { CanvasConfig } from "@open-agents/shared";

/** Serialize a canvas config to pretty-printed JSON */
export function generateJson(config: CanvasConfig): string {
  return JSON.stringify(config, null, 2);
}

/** Copy text to clipboard, returning success */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Parse a JSON string into CanvasConfig with validation */
export function parseConfig(json: string): { ok: true; config: CanvasConfig } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(json) as CanvasConfig;

    if (!Array.isArray(parsed.nodes)) {
      return { ok: false, error: "Missing or invalid 'nodes' array" };
    }
    if (!Array.isArray(parsed.edges)) {
      return { ok: false, error: "Missing or invalid 'edges' array" };
    }

    return { ok: true, config: parsed };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}
