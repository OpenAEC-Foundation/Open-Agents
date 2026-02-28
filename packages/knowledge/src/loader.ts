import matter from "gray-matter";
import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  RoutingPattern,
  OrchestrationPrinciple,
  BuildingBlock,
  PatternCategory,
  PatternNodeTemplate,
  TokenProfile,
  BuildingBlockType,
  ModelId,
  AgentTool,
} from "@open-agents/shared";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SNIPPETS_DIR = join(__dirname, "..", "snippets");

// =============================================
// Section Parsing Helpers
// =============================================

/**
 * Split markdown body by ## headings into a map of { heading: content }.
 * Handles edge cases: missing sections, trailing whitespace, empty sections.
 */
function parseSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = markdown.split("\n");
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^## (.+)$/);
    if (headingMatch) {
      // Store previous section
      if (currentHeading) {
        sections.set(currentHeading, currentContent.join("\n").trim());
      }
      currentHeading = headingMatch[1].trim();
      currentContent = [];
    } else if (currentHeading) {
      currentContent.push(line);
    }
  }

  // Store last section
  if (currentHeading) {
    sections.set(currentHeading, currentContent.join("\n").trim());
  }

  return sections;
}

/**
 * Extract content between triple backticks from a section.
 * Returns the raw text inside the code block, or empty string if none found.
 */
function extractCodeBlock(text: string): string {
  const match = text.match(/```[^\n]*\n([\s\S]*?)```/);
  return match ? match[1].trim() : "";
}

/**
 * Parse bullet points (lines starting with - ) from a section.
 * Returns an array of bullet text with the leading "- " removed.
 */
function parseBulletPoints(text: string): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => line.trim().replace(/^- /, ""));
}

/**
 * Parse ### subsections for node templates.
 * Each subsection has Role, Model, Tools, Prompt Template fields in
 * `- **Field**: value` format.
 */
function parseNodeTemplates(text: string): PatternNodeTemplate[] {
  if (!text) return [];

  const templates: PatternNodeTemplate[] = [];
  const subSections = text.split(/^### /m).filter(Boolean);

  for (const sub of subSections) {
    const lines = sub.split("\n");
    // First line is the node name (we skip it — role captures it)
    const fields = new Map<string, string>();

    for (const line of lines) {
      const fieldMatch = line.match(
        /^- \*\*(\w[\w\s]*)\*\*:\s*(.+)$/
      );
      if (fieldMatch) {
        fields.set(fieldMatch[1].trim().toLowerCase(), fieldMatch[2].trim());
      }
    }

    // Only create a template if we found at least a role
    const role = fields.get("role") ?? "";
    if (!role) continue;

    const modelRaw = fields.get("model") ?? "anthropic/claude-sonnet-4-6";
    const toolsRaw = fields.get("tools") ?? "[]";

    // Parse tools from "[Read, Write, Edit]" format
    const toolsMatch = toolsRaw.match(/\[([^\]]*)\]/);
    const tools: AgentTool[] = toolsMatch
      ? toolsMatch[1]
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean) as AgentTool[]
      : [];

    const promptTemplate =
      fields.get("prompt template") ?? "";

    templates.push({
      role,
      modelHint: modelRaw as ModelId,
      tools,
      promptTemplate,
    });
  }

  return templates;
}

// =============================================
// Recursive Directory Walker
// =============================================

/**
 * Recursively walk a directory and return all .md file paths.
 */
async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkDir(fullPath);
      results.push(...nested);
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}

// =============================================
// Loaders
// =============================================

/**
 * Load all routing patterns from snippets/patterns/ subdirectories.
 * Walks recursively, reads .md files, parses YAML frontmatter + markdown body.
 */
export async function loadPatterns(): Promise<RoutingPattern[]> {
  const patternsDir = join(SNIPPETS_DIR, "patterns");
  const files = await walkDir(patternsDir);
  const patterns: RoutingPattern[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, "utf-8");
    const { data, content } = matter(raw);

    const sections = parseSections(content);

    const description = sections.get("Description") ?? "";
    const diagram = extractCodeBlock(sections.get("Diagram") ?? "");
    const whenToUse = sections.get("When to Use") ?? "";
    const antiPatternsRaw = sections.get("Anti-Patterns") ?? "";
    const antiPatterns = parseBulletPoints(antiPatternsRaw);
    const nodeTemplatesRaw = sections.get("Node Templates") ?? "";
    const nodeTemplates = parseNodeTemplates(nodeTemplatesRaw);
    const edgeFlow = sections.get("Edge Flow") ?? "";

    // Frontmatter fields with defaults
    const tokenProfile: TokenProfile = data.tokenProfile ?? {
      avgInputPerNode: 2000,
      avgOutputPerNode: 1500,
      costMultiplier: 1.0,
    };

    patterns.push({
      id: data.id ?? basename(filePath, ".md"),
      name: data.name ?? basename(filePath, ".md"),
      category: (data.category ?? "linear") as PatternCategory,
      tags: data.tags ?? [],
      description,
      diagram,
      whenToUse,
      antiPatterns,
      minNodes: data.minNodes ?? 1,
      maxNodes: data.maxNodes ?? 1,
      tokenProfile,
      nodeTemplates,
      edgeFlow,
    });
  }

  return patterns.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load all orchestration principles from snippets/principles/*.md.
 */
export async function loadPrinciples(): Promise<OrchestrationPrinciple[]> {
  const principlesDir = join(SNIPPETS_DIR, "principles");
  let files: string[];
  try {
    const entries = await readdir(principlesDir);
    files = entries
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(principlesDir, f));
  } catch {
    return [];
  }

  const principles: OrchestrationPrinciple[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, "utf-8");
    const { data, content } = matter(raw);

    const sections = parseSections(content);

    const description = sections.get("Description") ?? "";
    const rationale = sections.get("Rationale") ?? "";
    const examplesRaw = sections.get("Examples") ?? "";
    const examples = parseBulletPoints(examplesRaw);

    principles.push({
      id: data.id ?? basename(filePath, ".md"),
      name: data.name ?? basename(filePath, ".md"),
      description,
      rationale,
      examples,
    });
  }

  return principles.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load all building blocks from snippets/blocks/*.md.
 */
export async function loadBlocks(): Promise<BuildingBlock[]> {
  const blocksDir = join(SNIPPETS_DIR, "blocks");
  let files: string[];
  try {
    const entries = await readdir(blocksDir);
    files = entries
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(blocksDir, f));
  } catch {
    return [];
  }

  const blocks: BuildingBlock[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, "utf-8");
    const { data, content } = matter(raw);

    const sections = parseSections(content);

    const description = sections.get("Description") ?? "";
    const capabilitiesRaw = sections.get("Capabilities") ?? "";
    const capabilities = parseBulletPoints(capabilitiesRaw);
    const limitationsRaw = sections.get("Limitations") ?? "";
    const limitations = parseBulletPoints(limitationsRaw);

    blocks.push({
      id: data.id ?? basename(filePath, ".md"),
      name: data.name ?? basename(filePath, ".md"),
      type: (data.blockType ?? "agent") as BuildingBlockType,
      description,
      capabilities,
      limitations,
    });
  }

  return blocks.sort((a, b) => a.name.localeCompare(b.name));
}
