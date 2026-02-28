import { describe, it, expect } from "vitest";
import { estimateCost } from "../engine/cost-estimator.js";
import type {
  CanvasConfig,
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
      systemPrompt: "You are a helpful assistant.",
      tools: ["Read", "Glob"],
      ...overrides,
    },
  };
}

/** Default profile lookup */
const profileLookup = () => mockProfile();

describe("cost-estimator", () => {
  describe("single node", () => {
    it("calculates non-zero cost for a node with tools", () => {
      const config: CanvasConfig = {
        nodes: [makeNode("a")],
        edges: [],
      };
      const estimate = estimateCost(config, profileLookup);

      expect(estimate.totalInputTokens).toBeGreaterThan(0);
      expect(estimate.totalOutputTokens).toBeGreaterThan(0);
      expect(estimate.totalCostUSD).toBeGreaterThan(0);
      expect(estimate.breakdown).toHaveLength(1);
    });

    it("breakdown contains correct node metadata", () => {
      const config: CanvasConfig = {
        nodes: [makeNode("a", { name: "My Agent" })],
        edges: [],
      };
      const estimate = estimateCost(config, profileLookup);
      const node = estimate.breakdown[0];

      expect(node.nodeId).toBe("a");
      expect(node.nodeName).toBe("My Agent");
      expect(node.model).toBe("anthropic/claude-sonnet-4-6");
    });

    it("uses node maxTokens for output estimate when set", () => {
      const config: CanvasConfig = {
        nodes: [makeNode("a", { maxTokens: 500 })],
        edges: [],
      };
      const estimate = estimateCost(config, profileLookup);
      expect(estimate.breakdown[0].estimatedOutputTokens).toBe(500);
    });

    it("uses half of model maxOutput when maxTokens not set", () => {
      const profile = mockProfile({ maxOutput: 10000 });
      const config: CanvasConfig = {
        nodes: [makeNode("a")],
        edges: [],
      };
      const estimate = estimateCost(config, () => profile);
      expect(estimate.breakdown[0].estimatedOutputTokens).toBe(5000);
    });
  });

  describe("multi-node chain", () => {
    it("includes predecessor output tokens in downstream input", () => {
      const config: CanvasConfig = {
        nodes: [makeNode("a"), makeNode("b")],
        edges: [{ id: "e1", source: "a", target: "b" }],
      };
      const estimate = estimateCost(config, profileLookup);

      // Node B should have higher input tokens than node A because
      // it receives predecessor context (500 tokens per inbound edge)
      const nodeA = estimate.breakdown.find((b) => b.nodeId === "a")!;
      const nodeB = estimate.breakdown.find((b) => b.nodeId === "b")!;
      expect(nodeB.estimatedInputTokens).toBeGreaterThan(
        nodeA.estimatedInputTokens,
      );
      expect(nodeB.estimatedInputTokens - nodeA.estimatedInputTokens).toBe(
        500,
      );
    });

    it("accounts for multiple predecessors", () => {
      const config: CanvasConfig = {
        nodes: [makeNode("a"), makeNode("b"), makeNode("c")],
        edges: [
          { id: "e1", source: "a", target: "c" },
          { id: "e2", source: "b", target: "c" },
        ],
      };
      const estimate = estimateCost(config, profileLookup);

      const nodeA = estimate.breakdown.find((b) => b.nodeId === "a")!;
      const nodeC = estimate.breakdown.find((b) => b.nodeId === "c")!;
      // Node C has 2 predecessors = 1000 extra tokens
      expect(nodeC.estimatedInputTokens - nodeA.estimatedInputTokens).toBe(
        1000,
      );
    });
  });

  describe("unknown models", () => {
    it("includes node in breakdown with zero cost", () => {
      const config: CanvasConfig = {
        nodes: [makeNode("a")],
        edges: [],
      };
      const estimate = estimateCost(config, () => undefined);

      expect(estimate.breakdown).toHaveLength(1);
      expect(estimate.breakdown[0].costUSD).toBe(0);
      expect(estimate.breakdown[0].estimatedInputTokens).toBe(0);
      expect(estimate.breakdown[0].estimatedOutputTokens).toBe(0);
    });

    it("total cost is zero when all models are unknown", () => {
      const config: CanvasConfig = {
        nodes: [makeNode("a"), makeNode("b")],
        edges: [{ id: "e1", source: "a", target: "b" }],
      };
      const estimate = estimateCost(config, () => undefined);
      expect(estimate.totalCostUSD).toBe(0);
    });
  });

  describe("totals", () => {
    it("totals match sum of breakdown", () => {
      const config: CanvasConfig = {
        nodes: [makeNode("a"), makeNode("b"), makeNode("c")],
        edges: [
          { id: "e1", source: "a", target: "b" },
          { id: "e2", source: "b", target: "c" },
        ],
      };
      const estimate = estimateCost(config, profileLookup);

      const sumInput = estimate.breakdown.reduce(
        (s, b) => s + b.estimatedInputTokens,
        0,
      );
      const sumOutput = estimate.breakdown.reduce(
        (s, b) => s + b.estimatedOutputTokens,
        0,
      );
      const sumCost = estimate.breakdown.reduce((s, b) => s + b.costUSD, 0);

      expect(estimate.totalInputTokens).toBe(sumInput);
      expect(estimate.totalOutputTokens).toBe(sumOutput);
      expect(estimate.totalCostUSD).toBeCloseTo(sumCost, 10);
    });

    it("empty canvas returns zero totals", () => {
      const config: CanvasConfig = { nodes: [], edges: [] };
      const estimate = estimateCost(config, profileLookup);
      expect(estimate.totalInputTokens).toBe(0);
      expect(estimate.totalOutputTokens).toBe(0);
      expect(estimate.totalCostUSD).toBe(0);
      expect(estimate.breakdown).toHaveLength(0);
    });
  });

  describe("cost math", () => {
    it("calculates cost correctly with known values", () => {
      // Use a simple profile for verifiable math
      const profile = mockProfile({
        costPer1kInput: 0.01, // $0.01 per 1K input
        costPer1kOutput: 0.02, // $0.02 per 1K output
        maxOutput: 2000,
      });
      const config: CanvasConfig = {
        nodes: [
          makeNode("a", {
            systemPrompt: "", // 0 prompt tokens
            tools: [], // 0 tool tokens
            maxTokens: 1000, // exactly 1000 output tokens
          }),
        ],
        edges: [],
      };
      const estimate = estimateCost(config, () => profile);

      // Input: 0 tokens -> $0.00
      // Output: 1000 tokens -> (1000/1000) * $0.02 = $0.02
      expect(estimate.breakdown[0].estimatedInputTokens).toBe(0);
      expect(estimate.breakdown[0].estimatedOutputTokens).toBe(1000);
      expect(estimate.breakdown[0].costUSD).toBeCloseTo(0.02, 6);
    });
  });
});
