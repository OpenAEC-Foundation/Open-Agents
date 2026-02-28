import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const INSTRUCTIONS_PATH = join(process.cwd(), "agents", "USER_INSTRUCTIONS.md");

/** Cached content to avoid repeated disk reads */
let cachedContent: string | null = null;
let cachedMtime: number = 0;

/** Parsed section from USER_INSTRUCTIONS.md */
export interface InstructionSection {
  title: string;
  content: string;
}

/** Full parsed instructions */
export interface ParsedInstructions {
  raw: string;
  frontmatter: Record<string, unknown>;
  sections: InstructionSection[];
}

/** Read USER_INSTRUCTIONS.md from disk (with caching) */
export async function getInstructions(): Promise<ParsedInstructions> {
  try {
    const { stat } = await import("node:fs/promises");
    const stats = await stat(INSTRUCTIONS_PATH);
    const mtime = stats.mtimeMs;

    if (cachedContent && mtime <= cachedMtime) {
      return parseInstructions(cachedContent);
    }

    const content = await readFile(INSTRUCTIONS_PATH, "utf-8");
    cachedContent = content;
    cachedMtime = mtime;
    return parseInstructions(content);
  } catch {
    return { raw: "", frontmatter: {}, sections: [] };
  }
}

/** Write updated instructions to disk */
export async function setInstructions(content: string): Promise<void> {
  await writeFile(INSTRUCTIONS_PATH, content, "utf-8");
  cachedContent = content;
  cachedMtime = Date.now();
}

/** Get just the instruction text for injection into agent prompts (no frontmatter) */
export async function getInstructionText(): Promise<string> {
  const parsed = await getInstructions();
  if (!parsed.raw) return "";

  // Strip frontmatter, return clean markdown
  const stripped = parsed.raw.replace(/^---[\s\S]*?---\n*/, "").trim();
  return stripped;
}

/** Get a specific section by title */
export async function getSection(title: string): Promise<string | null> {
  const parsed = await getInstructions();
  const section = parsed.sections.find(
    (s) => s.title.toLowerCase() === title.toLowerCase(),
  );
  return section?.content ?? null;
}

/** Parse markdown with YAML frontmatter into structured sections */
function parseInstructions(raw: string): ParsedInstructions {
  let frontmatter: Record<string, unknown> = {};
  let body = raw;

  // Parse YAML frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (fmMatch) {
    body = raw.slice(fmMatch[0].length);
    // Simple YAML key-value parsing (no external dependency)
    for (const line of fmMatch[1].split("\n")) {
      const kv = line.match(/^(\w+):\s*(.+)/);
      if (kv) {
        const val = kv[2].trim().replace(/^["']|["']$/g, "");
        frontmatter[kv[1]] = val === "true" ? true : val === "false" ? false : val;
      }
    }
  }

  // Parse sections (## headers)
  const sections: InstructionSection[] = [];
  const sectionRegex = /^## (.+)$/gm;
  let match: RegExpExecArray | null;
  const positions: { title: string; start: number }[] = [];

  while ((match = sectionRegex.exec(body)) !== null) {
    positions.push({ title: match[1].trim(), start: match.index + match[0].length });
  }

  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length
      ? body.lastIndexOf("\n## ", positions[i + 1].start)
      : body.length;
    const content = body.slice(positions[i].start, end).trim();
    sections.push({ title: positions[i].title, content });
  }

  return { raw, frontmatter, sections };
}
