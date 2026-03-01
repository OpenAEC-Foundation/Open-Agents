import { describe, it, expect } from "vitest";
import {
  MODEL_CATALOG,
  getModelMeta,
  isAgentNode,
  isDispatcherNode,
  isAggregatorNode,
  TOOL_DISPLAY,
} from "./types";
import type { CanvasNode, AgentNodeData, DispatcherNodeData, AggregatorNodeData } from "./types";

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

describe("isAgentNode", () => {
  const agentNode: CanvasNode = {
    id: "agent-1",
    type: "agent",
    position: { x: 0, y: 0 },
    data: { name: "Test", model: "anthropic/claude-sonnet-4-6", systemPrompt: "hi", tools: [] } satisfies AgentNodeData,
  };

  const dispatcherNode: CanvasNode = {
    id: "dispatcher-1",
    type: "dispatcher",
    position: { x: 0, y: 0 },
    data: { name: "Router", routingPrompt: "route", routingModel: "anthropic/claude-haiku-4-5", maxParallel: 3, timeoutMs: 30000 } satisfies DispatcherNodeData,
  };

  it("returns true for agent nodes", () => {
    expect(isAgentNode(agentNode)).toBe(true);
  });

  it("returns false for dispatcher nodes", () => {
    expect(isAgentNode(dispatcherNode)).toBe(false);
  });
});

describe("isDispatcherNode", () => {
  const dispatcherNode: CanvasNode = {
    id: "dispatcher-1",
    type: "dispatcher",
    position: { x: 0, y: 0 },
    data: { name: "Router", routingPrompt: "route", routingModel: "anthropic/claude-haiku-4-5", maxParallel: 3, timeoutMs: 30000 } satisfies DispatcherNodeData,
  };

  it("returns true for dispatcher nodes", () => {
    expect(isDispatcherNode(dispatcherNode)).toBe(true);
  });

  it("returns false for aggregator nodes", () => {
    const aggNode: CanvasNode = {
      id: "agg-1",
      type: "aggregator",
      position: { x: 0, y: 0 },
      data: { name: "Merge", aggregationStrategy: "concatenate" } satisfies AggregatorNodeData,
    };
    expect(isDispatcherNode(aggNode)).toBe(false);
  });
});

describe("isAggregatorNode", () => {
  it("returns true for aggregator nodes", () => {
    const aggNode: CanvasNode = {
      id: "agg-1",
      type: "aggregator",
      position: { x: 0, y: 0 },
      data: { name: "Merge", aggregationStrategy: "synthesize", aggregationModel: "anthropic/claude-sonnet-4-6" } satisfies AggregatorNodeData,
    };
    expect(isAggregatorNode(aggNode)).toBe(true);
  });

  it("returns false for agent nodes", () => {
    const agentNode: CanvasNode = {
      id: "agent-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: { name: "Test", model: "anthropic/claude-sonnet-4-6", systemPrompt: "hi", tools: ["Read"] } satisfies AgentNodeData,
    };
    expect(isAggregatorNode(agentNode)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MODEL_CATALOG
// ---------------------------------------------------------------------------

describe("MODEL_CATALOG", () => {
  it("contains at least 6 models", () => {
    expect(MODEL_CATALOG.length).toBeGreaterThanOrEqual(6);
  });

  it("has unique IDs", () => {
    const ids = MODEL_CATALOG.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every model has required fields", () => {
    for (const model of MODEL_CATALOG) {
      expect(model.id).toBeTruthy();
      expect(model.provider).toBeTruthy();
      expect(model.labels.beginner).toBeTruthy();
      expect(model.labels.intermediate).toBeTruthy();
      expect(model.labels.advanced).toBeTruthy();
      expect(model.color).toBeTruthy();
    }
  });

  it("model IDs follow provider/model format", () => {
    for (const model of MODEL_CATALOG) {
      expect(model.id).toMatch(/^[a-z]+\/.+$/);
      expect(model.id.startsWith(`${model.provider}/`)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getModelMeta
// ---------------------------------------------------------------------------

describe("getModelMeta", () => {
  it("returns correct meta for known model", () => {
    const meta = getModelMeta("anthropic/claude-sonnet-4-6");
    expect(meta.id).toBe("anthropic/claude-sonnet-4-6");
    expect(meta.provider).toBe("anthropic");
    expect(meta.labels.beginner).toBeTruthy();
  });

  it("returns fallback for unknown model", () => {
    const meta = getModelMeta("openai/gpt-5-turbo");
    expect(meta.id).toBe("openai/gpt-5-turbo");
    expect(meta.provider).toBe("openai");
    expect(meta.labels.advanced).toBeTruthy();
  });

  it("handles model without provider prefix", () => {
    const meta = getModelMeta("custom-model");
    expect(meta.id).toBe("custom-model");
    expect(meta.labels.advanced).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TOOL_DISPLAY
// ---------------------------------------------------------------------------

describe("TOOL_DISPLAY", () => {
  const skillLevels = ["beginner", "intermediate", "advanced"] as const;
  const tools = ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebSearch", "WebFetch"] as const;

  it("has entries for all skill levels", () => {
    for (const level of skillLevels) {
      expect(TOOL_DISPLAY[level]).toBeDefined();
    }
  });

  it("has entries for all tools at every skill level", () => {
    for (const level of skillLevels) {
      for (const tool of tools) {
        const info = TOOL_DISPLAY[level][tool];
        expect(info).toBeDefined();
        expect(info.id).toBe(tool);
        expect(info.label).toBeTruthy();
        expect(info.tooltip).toBeTruthy();
      }
    }
  });
});
