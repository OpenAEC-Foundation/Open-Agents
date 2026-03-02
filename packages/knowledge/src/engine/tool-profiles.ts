// =============================================
// Tool Profiles — hardcoded agent tool metadata
// =============================================

import type { AgentTool, RiskLevel, ToolProfile } from "@open-agents/shared";

const TOOL_PROFILES: ToolProfile[] = [
  {
    id: "Read",
    name: "Read",
    riskLevel: "safe",
    executionTimeTier: "instant",
    description: "Read file contents",
    inputFormat: "file_path: string",
    outputFormat: "string (file content with line numbers)",
  },
  {
    id: "Write",
    name: "Write",
    riskLevel: "moderate",
    executionTimeTier: "instant",
    description: "Create or overwrite files",
    inputFormat: "file_path: string, content: string",
    outputFormat: "confirmation message",
  },
  {
    id: "Edit",
    name: "Edit",
    riskLevel: "moderate",
    executionTimeTier: "instant",
    description: "String replacement in files",
    inputFormat: "file_path: string, old_string: string, new_string: string",
    outputFormat: "confirmation message",
  },
  {
    id: "Bash",
    name: "Bash",
    riskLevel: "dangerous",
    executionTimeTier: "variable",
    description: "Execute shell commands",
    inputFormat: "command: string",
    outputFormat: "string (command stdout/stderr)",
  },
  {
    id: "Glob",
    name: "Glob",
    riskLevel: "safe",
    executionTimeTier: "fast",
    description: "File pattern matching",
    inputFormat: "pattern: string, path?: string",
    outputFormat: "string[] (matching file paths)",
  },
  {
    id: "Grep",
    name: "Grep",
    riskLevel: "safe",
    executionTimeTier: "fast",
    description: "Regex content search",
    inputFormat: "pattern: string, path?: string, glob?: string",
    outputFormat: "string (matching lines or file paths)",
  },
  {
    id: "WebSearch",
    name: "WebSearch",
    riskLevel: "safe",
    executionTimeTier: "slow",
    description: "Web search",
    inputFormat: "query: string",
    outputFormat: "search results with titles and URLs",
  },
  {
    id: "WebFetch",
    name: "WebFetch",
    riskLevel: "safe",
    executionTimeTier: "slow",
    description: "Fetch URL content",
    inputFormat: "url: string, prompt: string",
    outputFormat: "string (extracted content from URL)",
  },
];

/** Look up a tool profile by its AgentTool identifier */
export function getToolProfile(id: AgentTool): ToolProfile {
  const found = TOOL_PROFILES.find((t) => t.id === id);
  if (!found) {
    throw new Error(`Unknown tool: ${id}`);
  }
  return found;
}

/** Return all tool profiles */
export function getToolProfiles(): ToolProfile[] {
  return [...TOOL_PROFILES];
}

/** Return all tool profiles with a given risk level */
export function getToolsByRiskLevel(level: RiskLevel): ToolProfile[] {
  return TOOL_PROFILES.filter((t) => t.riskLevel === level);
}
