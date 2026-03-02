import { describe, it, expect } from "vitest";
import { validateGraph } from "../engine/graph-validator.js";
import type {
  CanvasConfig,
  CanvasEdge,
  CanvasNode,
  ModelId,
  ModelProfile,
} from "@open-agents/shared";

/** Helper: create a mock model profile */
function mockProfile(overrides: Partial<ModelProfile> = {}): ModelProfile {
  return {
    id: "anthropic/claude-sonnet-4-6",
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    contextWindow: 200_000,
    maxOutput: 16384,
    capabilities: ["code-generation"],
    latencyTier: "medium",
    badgeColor: "bg-blue-500",
    labels: {
      beginner: "Balanced",
      intermediate: "Sonnet",
      advanced: "Sonnet 4.6",
    },
    ...overrides,
  };
}

/** Helper: create a minimal canvas node */
function makeNode(
  id: string,
  overrides: Partial<CanvasNode["data"]> = {},
): CanvasNode {
  return {
    id,
    type: "agent",
    position: { x: 0, y: 0 },
    data: {
      name: `Agent ${id}`,
      model: "anthropic/claude-sonnet-4-6",
      systemPrompt:
        "You are a helpful assistant. Follow all instructions carefully and produce high-quality output.",
      tools: ["Read", "Glob"],
      ...overrides,
    },
  };
}

/** Helper: create a canvas config */
function makeConfig(
  nodes: CanvasNode[],
  edges: CanvasEdge[] = [],
): CanvasConfig {
  return { nodes, edges };
}

/** Default profile lookup that always returns a valid profile */
const profileLookup = () => mockProfile();

describe("graph-validator", () => {
  describe("valid configurations", () => {
    it("passes for a single valid node", () => {
      const config = makeConfig([makeNode("a")]);
      const result = validateGraph(config, profileLookup);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("passes for a simple two-node chain", () => {
      const config = makeConfig(
        [makeNode("a"), makeNode("b")],
        [{ id: "e1", source: "a", target: "b" }],
      );
      const result = validateGraph(config, profileLookup);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("passes for a three-node DAG", () => {
      const config = makeConfig(
        [makeNode("a"), makeNode("b"), makeNode("c")],
        [
          { id: "e1", source: "a", target: "b" },
          { id: "e2", source: "a", target: "c" },
          { id: "e3", source: "b", target: "c" },
        ],
      );
      const result = validateGraph(config, profileLookup);
      expect(result.valid).toBe(true);
    });
  });

  describe("no-nodes rule", () => {
    it("returns error for empty config", () => {
      const config = makeConfig([]);
      const result = validateGraph(config, profileLookup);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe("no-nodes");
    });
  });

  describe("self-loop rule", () => {
    it("returns error for self-loop edge", () => {
      const config = makeConfig(
        [makeNode("a")],
        [{ id: "e1", source: "a", target: "a" }],
      );
      const result = validateGraph(config, profileLookup);
      expect(result.valid).toBe(false);
      const selfLoopErrors = result.errors.filter(
        (e) => e.rule === "self-loop",
      );
      expect(selfLoopErrors).toHaveLength(1);
      expect(selfLoopErrors[0].nodeId).toBe("a");
    });
  });

  describe("cycle-detected rule", () => {
    it("detects a simple A -> B -> A cycle", () => {
      const config = makeConfig(
        [makeNode("a"), makeNode("b")],
        [
          { id: "e1", source: "a", target: "b" },
          { id: "e2", source: "b", target: "a" },
        ],
      );
      const result = validateGraph(config, profileLookup);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === "cycle-detected")).toBe(true);
    });

    it("detects a three-node cycle A -> B -> C -> A", () => {
      const config = makeConfig(
        [makeNode("a"), makeNode("b"), makeNode("c")],
        [
          { id: "e1", source: "a", target: "b" },
          { id: "e2", source: "b", target: "c" },
          { id: "e3", source: "c", target: "a" },
        ],
      );
      const result = validateGraph(config, profileLookup);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === "cycle-detected")).toBe(true);
    });

    it("does not report a cycle for a DAG", () => {
      const config = makeConfig(
        [makeNode("a"), makeNode("b"), makeNode("c")],
        [
          { id: "e1", source: "a", target: "b" },
          { id: "e2", source: "b", target: "c" },
        ],
      );
      const result = validateGraph(config, profileLookup);
      expect(result.errors.some((e) => e.rule === "cycle-detected")).toBe(
        false,
      );
    });
  });

  describe("orphan-node rule", () => {
    it("warns for orphan node when multiple nodes exist", () => {
      const config = makeConfig(
        [makeNode("a"), makeNode("b"), makeNode("c")],
        [{ id: "e1", source: "a", target: "b" }],
      );
      const result = validateGraph(config, profileLookup);
      const orphanWarnings = result.warnings.filter(
        (w) => w.rule === "orphan-node",
      );
      expect(orphanWarnings).toHaveLength(1);
      expect(orphanWarnings[0].nodeId).toBe("c");
    });

    it("does not warn for single node (no edges expected)", () => {
      const config = makeConfig([makeNode("a")]);
      const result = validateGraph(config, profileLookup);
      expect(result.warnings.some((w) => w.rule === "orphan-node")).toBe(false);
    });
  });

  describe("invalid-model rule", () => {
    it("returns error for unknown model", () => {
      const config = makeConfig([makeNode("a")]);
      const result = validateGraph(config, () => undefined);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === "invalid-model")).toBe(true);
    });
  });

  describe("missing-system-prompt rule", () => {
    it("returns error for empty system prompt", () => {
      const config = makeConfig([makeNode("a", { systemPrompt: "" })]);
      const result = validateGraph(config, profileLookup);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.rule === "missing-system-prompt"),
      ).toBe(true);
    });

    it("returns error for whitespace-only system prompt", () => {
      const config = makeConfig([makeNode("a", { systemPrompt: "   " })]);
      const result = validateGraph(config, profileLookup);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.rule === "missing-system-prompt"),
      ).toBe(true);
    });
  });

  describe("empty-tools rule", () => {
    it("warns when tools array is empty", () => {
      const config = makeConfig([makeNode("a", { tools: [] })]);
      const result = validateGraph(config, profileLookup);
      expect(result.warnings.some((w) => w.rule === "empty-tools")).toBe(true);
    });
  });

  describe("dangerous-tools-without-prompt rule", () => {
    it("warns when Bash is used with short system prompt", () => {
      const config = makeConfig([
        makeNode("a", {
          tools: ["Bash"],
          systemPrompt: "Short",
        }),
      ]);
      const result = validateGraph(config, profileLookup);
      expect(
        result.warnings.some(
          (w) => w.rule === "dangerous-tools-without-prompt",
        ),
      ).toBe(true);
    });

    it("warns when Write is used with short system prompt", () => {
      const config = makeConfig([
        makeNode("a", {
          tools: ["Write"],
          systemPrompt: "Short",
        }),
      ]);
      const result = validateGraph(config, profileLookup);
      expect(
        result.warnings.some(
          (w) => w.rule === "dangerous-tools-without-prompt",
        ),
      ).toBe(true);
    });

    it("does not warn when dangerous tools have long system prompt", () => {
      const config = makeConfig([
        makeNode("a", {
          tools: ["Bash", "Write"],
          systemPrompt: "x".repeat(100),
        }),
      ]);
      const result = validateGraph(config, profileLookup);
      expect(
        result.warnings.some(
          (w) => w.rule === "dangerous-tools-without-prompt",
        ),
      ).toBe(false);
    });

    it("does not warn when only safe tools are used", () => {
      const config = makeConfig([
        makeNode("a", {
          tools: ["Read", "Glob"],
          systemPrompt: "Short",
        }),
      ]);
      const result = validateGraph(config, profileLookup);
      expect(
        result.warnings.some(
          (w) => w.rule === "dangerous-tools-without-prompt",
        ),
      ).toBe(false);
    });
  });

  describe("context-overflow rule", () => {
    it("warns when system tokens exceed 50% of context window", () => {
      // Create a profile with a very small context window
      const smallProfile = mockProfile({ contextWindow: 100 });
      const config = makeConfig([
        makeNode("a", {
          systemPrompt: "x".repeat(400), // ~100 tokens
          tools: ["Read", "Write", "Bash"], // +600 tokens
        }),
      ]);
      const result = validateGraph(config, () => smallProfile);
      expect(result.warnings.some((w) => w.rule === "context-overflow")).toBe(
        true,
      );
    });

    it("does not warn with large context window", () => {
      const config = makeConfig([
        makeNode("a", {
          systemPrompt: "Short prompt",
          tools: ["Read"],
        }),
      ]);
      const result = validateGraph(config, profileLookup);
      expect(result.warnings.some((w) => w.rule === "context-overflow")).toBe(
        false,
      );
    });
  });

  describe("duplicate-edge rule", () => {
    it("warns for duplicate edges between same source and target", () => {
      const config = makeConfig(
        [makeNode("a"), makeNode("b")],
        [
          { id: "e1", source: "a", target: "b" },
          { id: "e2", source: "a", target: "b" },
        ],
      );
      const result = validateGraph(config, profileLookup);
      expect(result.warnings.some((w) => w.rule === "duplicate-edge")).toBe(
        true,
      );
    });

    it("does not warn for edges in opposite directions", () => {
      // A -> B and B -> A are different edges, not duplicates
      // (they do form a cycle though)
      const config = makeConfig(
        [makeNode("a"), makeNode("b")],
        [
          { id: "e1", source: "a", target: "b" },
          { id: "e2", source: "b", target: "a" },
        ],
      );
      const result = validateGraph(config, profileLookup);
      expect(result.warnings.some((w) => w.rule === "duplicate-edge")).toBe(
        false,
      );
    });
  });

  describe("multiple issues", () => {
    it("reports multiple errors and warnings simultaneously", () => {
      const config = makeConfig(
        [
          makeNode("a", { systemPrompt: "", tools: [] }),
          makeNode("b"),
        ],
        [],
      );
      const result = validateGraph(config, profileLookup);
      // a: missing-system-prompt (error), empty-tools (warning), orphan-node (warning)
      // b: orphan-node (warning)
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    });
  });
});
