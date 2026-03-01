import { describe, it, expect } from "vitest";
import { matchPatterns } from "./match-patterns.js";
import type {
  TaskIntent,
  RoutingPattern,
  PatternCategory,
} from "@open-agents/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIntent(overrides: Partial<TaskIntent> = {}): TaskIntent {
  return {
    taskType: "code-review",
    domain: "software development",
    complexity: "moderate",
    estimatedAgentCount: 3,
    needsParallel: false,
    needsValidation: false,
    keywords: [],
    constraints: [],
    ...overrides,
  };
}

function makePattern(
  id: string,
  category: PatternCategory,
  overrides: Partial<RoutingPattern> = {},
): RoutingPattern {
  return {
    id,
    name: id,
    category,
    description: `Pattern ${id}`,
    minNodes: 2,
    maxNodes: 5,
    tags: [],
    tokenProfile: {
      inputMultiplier: 1,
      outputMultiplier: 1,
      costMultiplier: 1,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("matchPatterns", () => {
  describe("category matching (+0.3)", () => {
    it("scores +0.3 when pattern category matches task type preferences", () => {
      const intent = makeIntent({ taskType: "code-review" }); // prefers specialist, validation, parallel
      const pattern = makePattern("p1", "specialist");
      const result = matchPatterns(intent, [pattern]);

      expect(result).toHaveLength(1);
      expect(result[0].score).toBeCloseTo(0.5, 1); // +0.3 category + +0.2 node count
      expect(result[0].reasons).toContainEqual(
        expect.stringContaining('Category "specialist"'),
      );
    });

    it("gives 0 category score for mismatched category", () => {
      const intent = makeIntent({ taskType: "documentation" }); // prefers linear, specialist
      const pattern = makePattern("p1", "pyramid", { minNodes: 2, maxNodes: 5 });
      const result = matchPatterns(intent, [pattern]);

      // Only node count match (+0.2), no category match
      expect(result).toHaveLength(1);
      expect(result[0].score).toBeCloseTo(0.2, 1);
    });
  });

  describe("node count range matching (+0.2)", () => {
    it("scores +0.2 when agent count is within pattern range", () => {
      const intent = makeIntent({ taskType: "general", estimatedAgentCount: 3 });
      const pattern = makePattern("p1", "efficiency", { minNodes: 2, maxNodes: 5 });
      const result = matchPatterns(intent, [pattern]);

      expect(result).toHaveLength(1);
      expect(result[0].score).toBeGreaterThanOrEqual(0.2);
    });

    it("gives 0 node count score when agent count is out of range", () => {
      const intent = makeIntent({ taskType: "general", estimatedAgentCount: 10 });
      // Pattern allows 2-3, agent count is 10
      const pattern = makePattern("p1", "efficiency", { minNodes: 2, maxNodes: 3 });
      const result = matchPatterns(intent, [pattern]);

      // No category match (general → linear,parallel), no node count match
      expect(result).toHaveLength(0);
    });
  });

  describe("tag matching (+0.1 per tag)", () => {
    it("scores +0.1 per matching keyword/tag", () => {
      const intent = makeIntent({
        taskType: "general",
        keywords: ["security", "testing"],
        estimatedAgentCount: 3,
      });
      const pattern = makePattern("p1", "linear", {
        tags: ["security", "testing", "unrelated"],
        minNodes: 2,
        maxNodes: 5,
      });
      const result = matchPatterns(intent, [pattern]);

      expect(result).toHaveLength(1);
      // +0.3 category (general→linear) + +0.2 node count + +0.2 (2 tags)
      expect(result[0].score).toBeCloseTo(0.7, 1);
      expect(result[0].reasons.filter((r) => r.startsWith("Tag match"))).toHaveLength(2);
    });

    it("matches tags case-insensitively with substring", () => {
      const intent = makeIntent({
        taskType: "general",
        keywords: ["code"],
        estimatedAgentCount: 3,
      });
      const pattern = makePattern("p1", "linear", {
        tags: ["Code-Review"],
        minNodes: 2,
        maxNodes: 5,
      });
      const result = matchPatterns(intent, [pattern]);

      expect(result).toHaveLength(1);
      // Should match because "code" is a substring of "code-review"
      expect(result[0].reasons).toContainEqual(expect.stringContaining("Tag match"));
    });
  });

  describe("validation bonus (+0.2)", () => {
    it("scores +0.2 when intent needs validation and pattern has validation category", () => {
      const intent = makeIntent({
        taskType: "testing",
        needsValidation: true,
        estimatedAgentCount: 3,
      });
      const pattern = makePattern("p1", "validation", { minNodes: 2, maxNodes: 5 });
      const result = matchPatterns(intent, [pattern]);

      expect(result).toHaveLength(1);
      // +0.3 category (testing→validation) + +0.2 node count + +0.2 validation bonus
      expect(result[0].score).toBeCloseTo(0.7, 1);
      expect(result[0].reasons).toContainEqual(
        expect.stringContaining("validation gates"),
      );
    });

    it("scores +0.2 when pattern has validation tags", () => {
      const intent = makeIntent({
        taskType: "general",
        needsValidation: true,
        estimatedAgentCount: 3,
      });
      const pattern = makePattern("p1", "linear", {
        tags: ["review"],
        minNodes: 2,
        maxNodes: 5,
      });
      const result = matchPatterns(intent, [pattern]);

      expect(result).toHaveLength(1);
      expect(result[0].reasons).toContainEqual(
        expect.stringContaining("validation gates"),
      );
    });

    it("no validation bonus when intent does not need validation", () => {
      const intent = makeIntent({ needsValidation: false, estimatedAgentCount: 3 });
      const pattern = makePattern("p1", "validation", { minNodes: 2, maxNodes: 5 });
      const result = matchPatterns(intent, [pattern]);

      // Only category match (+0.3) + node count (+0.2)
      expect(result).toHaveLength(1);
      expect(result[0].score).toBeCloseTo(0.5, 1);
    });
  });

  describe("budget penalty (-0.2)", () => {
    it("applies -0.2 penalty when budget-sensitive and costMultiplier > 3", () => {
      const intent = makeIntent({ taskType: "general", estimatedAgentCount: 3 });
      const pattern = makePattern("p1", "linear", {
        minNodes: 2,
        maxNodes: 5,
        tokenProfile: { inputMultiplier: 1, outputMultiplier: 1, costMultiplier: 4 },
      });

      const withBudget = matchPatterns(intent, [pattern], true);
      const withoutBudget = matchPatterns(intent, [pattern], false);

      expect(withBudget[0].score).toBe(withoutBudget[0].score - 0.2);
      expect(withBudget[0].reasons).toContainEqual(
        expect.stringContaining("Budget penalty"),
      );
    });

    it("no penalty when costMultiplier <= 3", () => {
      const intent = makeIntent({ taskType: "general", estimatedAgentCount: 3 });
      const pattern = makePattern("p1", "linear", {
        minNodes: 2,
        maxNodes: 5,
        tokenProfile: { inputMultiplier: 1, outputMultiplier: 1, costMultiplier: 3 },
      });

      const result = matchPatterns(intent, [pattern], true);
      expect(result[0].reasons.some((r) => r.includes("Budget penalty"))).toBe(false);
    });
  });

  describe("parallel bonus (+0.15)", () => {
    it("scores +0.15 when needsParallel and pattern is parallel", () => {
      const intent = makeIntent({
        taskType: "general",
        needsParallel: true,
        estimatedAgentCount: 3,
      });
      const pattern = makePattern("p1", "parallel", { minNodes: 2, maxNodes: 5 });
      const result = matchPatterns(intent, [pattern]);

      expect(result).toHaveLength(1);
      // +0.3 category (general→parallel + needsParallel adds parallel) + +0.2 node count + +0.15 parallel bonus
      expect(result[0].score).toBeCloseTo(0.65, 1);
      expect(result[0].reasons).toContainEqual(
        expect.stringContaining("Parallel execution"),
      );
    });
  });

  describe("filtering and sorting", () => {
    it("excludes patterns with score <= 0", () => {
      const intent = makeIntent({
        taskType: "general",
        estimatedAgentCount: 1, // out of range for all
      });
      const pattern = makePattern("p1", "efficiency", {
        minNodes: 5,
        maxNodes: 10,
      }); // no category match, no node count match
      const result = matchPatterns(intent, [pattern]);

      expect(result).toHaveLength(0);
    });

    it("returns top 3 sorted by score descending", () => {
      const intent = makeIntent({
        taskType: "code-review",
        needsValidation: true,
        estimatedAgentCount: 3,
        keywords: ["security"],
      });

      const patterns = [
        makePattern("low", "efficiency", { minNodes: 2, maxNodes: 5 }),
        makePattern("high", "validation", { minNodes: 2, maxNodes: 5, tags: ["security"] }),
        makePattern("mid", "specialist", { minNodes: 2, maxNodes: 5 }),
        makePattern("also-low", "iterative", { minNodes: 2, maxNodes: 5 }),
      ];

      const result = matchPatterns(intent, patterns);

      expect(result.length).toBeLessThanOrEqual(3);
      // Scores should be descending
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
      }
      // Highest scorer should be "high" (validation + tag match + validation bonus)
      expect(result[0].pattern.id).toBe("high");
    });

    it("returns empty array when no patterns provided", () => {
      const intent = makeIntent();
      expect(matchPatterns(intent, [])).toEqual([]);
    });
  });

  describe("budget constraint in keywords", () => {
    it("adds efficiency category when constraints mention budget", () => {
      const intent = makeIntent({
        taskType: "general",
        constraints: ["Keep costs low, budget is tight"],
        estimatedAgentCount: 3,
      });
      const pattern = makePattern("p1", "efficiency", { minNodes: 2, maxNodes: 5 });
      const result = matchPatterns(intent, [pattern]);

      expect(result).toHaveLength(1);
      // Should get category match because budget constraint adds efficiency
      expect(result[0].reasons).toContainEqual(
        expect.stringContaining('Category "efficiency"'),
      );
    });
  });
});
