/**
 * Post-hoc safety scanner (D-035).
 * Scans agent output text for potential bash blacklist violations.
 * Best-effort heuristic — not a hard guarantee.
 * Purpose: audit logging and violation detection after the fact.
 */

/**
 * Scan agent output for bash commands that match blacklist patterns.
 * Extracts candidate commands from common output formats
 * (shell prompts, code blocks, tool_use JSON) and tests against blacklist.
 *
 * Returns an array of violations found. Empty = no violations detected.
 */
export function scanOutputForViolations(
  output: string,
  bashBlacklist: string[],
): Array<{ pattern: string; match: string }> {
  if (bashBlacklist.length === 0 || !output) return [];

  const violations: Array<{ pattern: string; match: string }> = [];

  // Extract potential command strings from output
  const commandPatterns = [
    /\$\s+(.+)$/gm, // $ command (shell prompt)
    /```(?:bash|sh|shell)?\n([\s\S]*?)```/g, // fenced code blocks
    /"command"\s*:\s*"([^"]+)"/g, // tool_use JSON: "command": "..."
  ];

  const candidateCommands: string[] = [];
  for (const re of commandPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(output)) !== null) {
      if (m[1]) candidateCommands.push(m[1].trim());
    }
  }

  // Deduplicate candidate commands
  const uniqueCommands = [...new Set(candidateCommands)];

  // Test each candidate against blacklist, deduplicate by pattern
  const seen = new Set<string>();
  for (const cmd of uniqueCommands) {
    for (const pattern of bashBlacklist) {
      const key = `${pattern}::${cmd}`;
      if (seen.has(key)) continue;
      try {
        const regex = new RegExp(pattern);
        if (regex.test(cmd)) {
          seen.add(key);
          violations.push({ pattern, match: cmd.slice(0, 200) });
        }
      } catch {
        // Invalid regex pattern — skip silently
      }
    }
  }

  return violations;
}
