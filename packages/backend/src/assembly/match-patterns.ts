// =============================================
// Assembly Step 2: Pattern Matching (D-022)
// Pure TypeScript — NO LLM calls. Deterministic scoring.
// =============================================

import type {
  TaskIntent,
  PatternMatch,
  RoutingPattern,
  PatternCategory,
} from "@open-agents/shared";

/**
 * Category mapping: maps TaskIntent properties to PatternCategory values.
 * Used for the +0.3 category match scoring.
 */
const CATEGORY_MAPPINGS: Record<string, PatternCategory[]> = {
  // needsParallel → parallel/pyramid categories
  parallel: ["parallel", "pyramid"],
  // sequential tasks → linear
  sequential: ["linear"],
  // needsValidation → validation
  validation: ["validation"],
  // efficiency-related constraints
  budget: ["efficiency"],
};

/** Task type to likely pattern category mapping */
const TASK_TYPE_CATEGORIES: Record<string, PatternCategory[]> = {
  "code-review": ["specialist", "validation", "parallel"],
  "code-generation": ["linear", "iterative"],
  "data-analysis": ["parallel", "pyramid", "linear"],
  "research": ["parallel", "iterative", "specialist"],
  "content-creation": ["linear", "iterative"],
  "testing": ["validation", "parallel", "linear"],
  "devops": ["linear", "efficiency"],
  "security": ["validation", "specialist", "parallel"],
  "documentation": ["linear", "specialist"],
  "general": ["linear", "parallel"],
};

/**
 * Match an intent against all available patterns using deterministic scoring.
 *
 * Scoring rules (from MASTERPLAN.md):
 *   +0.3 category match (sequential→linear, parallel→parallel, etc.)
 *   +0.2 node count range match
 *   +0.1 per matching tag
 *   +0.2 if intent.needsValidation and pattern has validation gates
 *   -0.2 if "budget-sensitive" and costMultiplier > 3
 *
 * Returns top 3 matches sorted by score descending.
 */
export function matchPatterns(
  intent: TaskIntent,
  patterns: RoutingPattern[],
  budgetSensitive = false,
): PatternMatch[] {
  const scored: PatternMatch[] = [];

  for (const pattern of patterns) {
    let score = 0;
    const reasons: string[] = [];

    // +0.3 category match
    const preferredCategories = getPreferredCategories(intent);
    if (preferredCategories.includes(pattern.category)) {
      score += 0.3;
      reasons.push(`Category "${pattern.category}" matches task type "${intent.taskType}"`);
    }

    // +0.2 node count range match
    if (
      intent.estimatedAgentCount >= pattern.minNodes &&
      intent.estimatedAgentCount <= pattern.maxNodes
    ) {
      score += 0.2;
      reasons.push(`Agent count ${intent.estimatedAgentCount} within pattern range [${pattern.minNodes}-${pattern.maxNodes}]`);
    }

    // +0.1 per matching tag (keywords from intent vs pattern tags)
    const intentKeywordsLower = intent.keywords.map((k) => k.toLowerCase());
    for (const tag of pattern.tags) {
      const tagLower = tag.toLowerCase();
      if (
        intentKeywordsLower.includes(tagLower) ||
        intentKeywordsLower.some((k) => tagLower.includes(k) || k.includes(tagLower))
      ) {
        score += 0.1;
        reasons.push(`Tag match: "${tag}"`);
      }
    }

    // +0.2 if needsValidation and pattern has validation characteristics
    if (intent.needsValidation) {
      const hasValidation =
        pattern.category === "validation" ||
        pattern.tags.some((t) =>
          ["review", "validation", "quality", "check", "gate", "test"].includes(t.toLowerCase())
        );
      if (hasValidation) {
        score += 0.2;
        reasons.push("Pattern includes validation gates");
      }
    }

    // -0.2 if budget-sensitive and costMultiplier > 3
    if (budgetSensitive && pattern.tokenProfile.costMultiplier > 3) {
      score -= 0.2;
      reasons.push(`Budget penalty: costMultiplier ${pattern.tokenProfile.costMultiplier} > 3`);
    }

    // Additional: +0.15 if needsParallel and pattern is parallel/pyramid
    if (intent.needsParallel && ["parallel", "pyramid"].includes(pattern.category)) {
      score += 0.15;
      reasons.push("Parallel execution requested, pattern supports it");
    }

    // Only include patterns with positive scores
    if (score > 0) {
      scored.push({
        pattern,
        score: Math.round(score * 100) / 100,
        reasons,
      });
    }
  }

  // Sort by score descending, take top 3
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

/** Determine which pattern categories are preferred for this intent */
function getPreferredCategories(intent: TaskIntent): PatternCategory[] {
  const categories = new Set<PatternCategory>();

  // From task type
  const taskCategories = TASK_TYPE_CATEGORIES[intent.taskType] ?? ["linear"];
  for (const c of taskCategories) {
    categories.add(c);
  }

  // From parallel flag
  if (intent.needsParallel) {
    for (const c of CATEGORY_MAPPINGS.parallel) {
      categories.add(c);
    }
  }

  // From validation flag
  if (intent.needsValidation) {
    for (const c of CATEGORY_MAPPINGS.validation) {
      categories.add(c);
    }
  }

  // From constraints
  const hasBudgetConstraint = intent.constraints.some((c) =>
    c.toLowerCase().includes("budget") || c.toLowerCase().includes("cost") || c.toLowerCase().includes("cheap"),
  );
  if (hasBudgetConstraint) {
    for (const c of CATEGORY_MAPPINGS.budget) {
      categories.add(c);
    }
  }

  return [...categories];
}
