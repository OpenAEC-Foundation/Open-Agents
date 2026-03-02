import type {
  AgentTool,
  PermissionMode,
  AgentSafetyRules,
  GlobalSafetyRules,
  SafetyConfig,
  SafetyTestResult,
} from "@open-agents/shared";

/**
 * In-memory safety rules store (D-034).
 * Stores global + per-node safety constraints that govern which tools
 * an agent is allowed to use and which bash commands are blocked.
 * Rules are stored in memory only — never persisted to disk.
 */

/** Tools allowed under each permission mode */
const PERMISSION_TOOL_MAP: Record<PermissionMode, AgentTool[] | null> = {
  "read-only": ["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
  edit: ["Read", "Write", "Edit", "Glob", "Grep", "WebSearch", "WebFetch"],
  "full-access": null, // no restriction
};

/** Global rules — defaults to fully permissive */
let globalRules: GlobalSafetyRules = {
  blockedTools: [],
  bashBlacklist: [],
  fileWhitelist: [],
  defaultPermissionMode: "full-access",
};

/** Per-node overrides keyed by node ID */
const perNodeRules = new Map<string, AgentSafetyRules>();

/** Return the full safety configuration */
export function getSafetyConfig(): SafetyConfig {
  return {
    global: { ...globalRules },
    perNode: Object.fromEntries(perNodeRules),
  };
}

/** Merge a partial update into the global rules */
export function updateGlobalRules(rules: Partial<GlobalSafetyRules>): void {
  globalRules = { ...globalRules, ...rules };
}

/** Set per-node safety rules (full replace) */
export function setNodeRules(nodeId: string, rules: AgentSafetyRules): void {
  perNodeRules.set(nodeId, rules);
}

/** Delete per-node override */
export function removeNodeRules(nodeId: string): void {
  perNodeRules.delete(nodeId);
}

/**
 * Resolve the effective safety rules for a node by merging global + per-node.
 *
 * Resolution logic:
 * - allowedTools: start with agentTools, remove global blockedTools,
 *   intersect with per-node allowedTools (if set), then restrict by permission mode.
 * - bashBlacklist: union of global + per-node patterns (deduplicated).
 * - fileWhitelist: per-node takes precedence if set, otherwise global.
 * - permissionMode: per-node if set, otherwise global default.
 */
export function resolveRules(
  nodeId: string,
  agentTools: AgentTool[],
): AgentSafetyRules {
  const nodeOverride = perNodeRules.get(nodeId);

  // 1. Determine permission mode
  const permissionMode: PermissionMode =
    nodeOverride?.permissionMode ?? globalRules.defaultPermissionMode;

  // 2. Start with agent's own tools, remove globally blocked
  let tools: AgentTool[] = agentTools.filter(
    (t) => !globalRules.blockedTools.includes(t),
  );

  // 3. Intersect with per-node allowedTools (if override exists)
  if (nodeOverride) {
    const nodeAllowed = new Set(nodeOverride.allowedTools);
    tools = tools.filter((t) => nodeAllowed.has(t));
  }

  // 4. Apply permission mode restrictions
  const modeAllowed = PERMISSION_TOOL_MAP[permissionMode];
  if (modeAllowed !== null) {
    const modeSet = new Set(modeAllowed);
    tools = tools.filter((t) => modeSet.has(t));
  }

  // 5. Merge bash blacklists (deduplicated)
  const blacklistSet = new Set([
    ...globalRules.bashBlacklist,
    ...(nodeOverride?.bashBlacklist ?? []),
  ]);
  const bashBlacklist = [...blacklistSet];

  // 6. File whitelist: per-node takes precedence if set
  const fileWhitelist =
    nodeOverride && nodeOverride.fileWhitelist.length > 0
      ? [...nodeOverride.fileWhitelist]
      : [...globalRules.fileWhitelist];

  return {
    allowedTools: tools,
    bashBlacklist,
    fileWhitelist,
    permissionMode,
  };
}

/**
 * Test whether a bash command is allowed under the resolved rules for a node.
 *
 * Returns `allowed: false` if:
 * - "Bash" is not in the resolved allowed tools, or
 * - the command matches any blacklist regex pattern.
 */
export function testCommand(
  nodeId: string,
  command: string,
  agentTools: AgentTool[],
): SafetyTestResult {
  const resolved = resolveRules(nodeId, agentTools);

  // Check if Bash tool is allowed at all
  if (!resolved.allowedTools.includes("Bash")) {
    return {
      allowed: false,
      reason: `Bash tool is not allowed (permission mode: ${resolved.permissionMode})`,
      matchedRule: "tool-blocked",
    };
  }

  // Check command against each blacklist pattern
  for (const pattern of resolved.bashBlacklist) {
    const regex = new RegExp(pattern);
    if (regex.test(command)) {
      return {
        allowed: false,
        reason: `Command matches blacklist pattern: ${pattern}`,
        matchedRule: pattern,
      };
    }
  }

  return { allowed: true };
}

/**
 * Build a system prompt safety block from resolved rules (D-035).
 * Instructs the model to avoid blacklisted bash commands.
 * Returns empty string if no constraints exist.
 */
export function buildSafetyPromptBlock(rules: AgentSafetyRules): string {
  if (rules.bashBlacklist.length === 0 && rules.fileWhitelist.length === 0) {
    return "";
  }

  const parts: string[] = ["<safety-constraints>"];

  if (rules.bashBlacklist.length > 0) {
    parts.push(
      "You MUST NOT execute bash commands matching these patterns:",
    );
    for (const pattern of rules.bashBlacklist) {
      parts.push(`  - /${pattern}/`);
    }
    parts.push(
      "If a task requires a blocked command, refuse and suggest an alternative.",
    );
  }

  if (rules.fileWhitelist.length > 0) {
    parts.push("You may ONLY access files matching these patterns:");
    for (const pattern of rules.fileWhitelist) {
      parts.push(`  - ${pattern}`);
    }
  }

  parts.push("</safety-constraints>");
  return parts.join("\n");
}
