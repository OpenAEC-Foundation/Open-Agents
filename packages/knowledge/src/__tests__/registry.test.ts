import { describe, it, expect, beforeAll } from "vitest";
import { KnowledgeRegistry } from "../registry.js";

describe("registry", () => {
  let registry: KnowledgeRegistry;

  beforeAll(async () => {
    registry = new KnowledgeRegistry();
    await registry.initialize();
  });

  it("indexes all patterns", () => {
    expect(registry.getPatterns().length).toBeGreaterThanOrEqual(20);
  });

  it("finds pattern by ID", () => {
    const diamond = registry.getPattern("diamond");
    expect(diamond).toBeDefined();
    expect(diamond!.name).toBe("Diamond");
  });

  it("filters patterns by category", () => {
    const linear = registry.getPatternsByCategory("linear");
    expect(linear.length).toBeGreaterThanOrEqual(4);
    for (const p of linear) {
      expect(p.category).toBe("linear");
    }
  });

  it("indexes all principles", () => {
    expect(registry.getPrinciples().length).toBeGreaterThanOrEqual(7);
  });

  it("finds principle by ID", () => {
    const atomicity = registry.getPrinciple("atomicity");
    expect(atomicity).toBeDefined();
    expect(atomicity!.name).toContain("Atomicity");
  });

  it("indexes all blocks", () => {
    expect(registry.getBlocks().length).toBe(13);
  });

  it("finds block by ID", () => {
    const agentNode = registry.getBlock("agent-node");
    expect(agentNode).toBeDefined();
    expect(agentNode!.name).toBe("Agent Node");
  });

  it("returns undefined for unknown IDs", () => {
    expect(registry.getPattern("nonexistent")).toBeUndefined();
    expect(registry.getPrinciple("nonexistent")).toBeUndefined();
    expect(registry.getBlock("nonexistent")).toBeUndefined();
  });

  it("searches by tags", () => {
    const results = registry.search({ tags: ["cost"] });
    expect(results.length).toBeGreaterThan(0);
    // All results should have some relevance score
    for (const r of results) {
      expect(r.score).toBeGreaterThan(0);
    }
  });

  it("searches by free text query", () => {
    const results = registry.search({ query: "diamond" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("diamond");
  });

  it("filters search by type", () => {
    const results = registry.search({ type: "principle" });
    expect(results.length).toBeGreaterThanOrEqual(7);
    for (const r of results) {
      expect(r.type).toBe("principle");
    }
  });

  it("filters search by type block", () => {
    const results = registry.search({ type: "block" });
    expect(results.length).toBe(13);
    for (const r of results) {
      expect(r.type).toBe("block");
    }
  });

  it("searches by category", () => {
    const results = registry.search({ category: "parallel" });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.type).toBe("pattern");
    }
  });

  it("search scores are between 0 and 1", () => {
    const results = registry.search({ query: "agent", tags: ["cost"] });
    for (const r of results) {
      expect(r.score).toBeGreaterThan(0);
      expect(r.score).toBeLessThanOrEqual(1.0);
    }
  });

  it("search results are sorted by score descending", () => {
    const results = registry.search({ query: "pattern" });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("combined search uses multiple scoring dimensions", () => {
    const results = registry.search({
      query: "cost",
      tags: ["cost"],
    });
    expect(results.length).toBeGreaterThan(0);
    // Results matching both query and tags should score higher
    expect(results[0].score).toBeGreaterThan(0.3);
  });
});
