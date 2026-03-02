import { describe, it, expect } from "vitest";
import { loadPatterns, loadPrinciples, loadBlocks } from "../loader.js";

describe("loader", () => {
  it("loads all routing patterns", async () => {
    const patterns = await loadPatterns();
    expect(patterns.length).toBeGreaterThanOrEqual(20);
  });

  it("loads all principles", async () => {
    const principles = await loadPrinciples();
    expect(principles.length).toBeGreaterThanOrEqual(7);
  });

  it("loads all 13 building blocks", async () => {
    const blocks = await loadBlocks();
    expect(blocks.length).toBe(13);
  });

  it("patterns have required fields", async () => {
    const patterns = await loadPatterns();
    for (const p of patterns) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.tags.length).toBeGreaterThan(0);
      expect(p.minNodes).toBeGreaterThan(0);
      expect(p.maxNodes).toBeGreaterThanOrEqual(p.minNodes);
    }
  });

  it("patterns have parsed body sections", async () => {
    const patterns = await loadPatterns();
    for (const p of patterns) {
      expect(p.description).toBeTruthy();
      expect(p.antiPatterns.length).toBeGreaterThan(0);
      expect(p.nodeTemplates.length).toBeGreaterThan(0);
    }
  });

  it("pattern node templates have correct structure", async () => {
    const patterns = await loadPatterns();
    for (const p of patterns) {
      for (const t of p.nodeTemplates) {
        expect(t.role).toBeTruthy();
        expect(t.modelHint).toBeTruthy();
        expect(t.promptTemplate).toBeTruthy();
      }
    }
  });

  it("patterns are sorted by name", async () => {
    const patterns = await loadPatterns();
    for (let i = 1; i < patterns.length; i++) {
      expect(
        patterns[i - 1].name.localeCompare(patterns[i].name)
      ).toBeLessThanOrEqual(0);
    }
  });

  it("principles have required fields", async () => {
    const principles = await loadPrinciples();
    for (const p of principles) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.rationale).toBeTruthy();
      expect(p.examples.length).toBeGreaterThan(0);
    }
  });

  it("blocks have required fields", async () => {
    const blocks = await loadBlocks();
    for (const b of blocks) {
      expect(b.id).toBeTruthy();
      expect(b.name).toBeTruthy();
      expect(b.type).toBeTruthy();
      expect(b.description).toBeTruthy();
      expect(b.capabilities.length).toBeGreaterThan(0);
      expect(b.limitations.length).toBeGreaterThan(0);
    }
  });

  it("blocks cover all block types", async () => {
    const blocks = await loadBlocks();
    const types = new Set(blocks.map((b) => b.type));
    expect(types.has("agent")).toBe(true);
    expect(types.has("connector")).toBe(true);
    expect(types.has("gate")).toBe(true);
    expect(types.has("dispatcher")).toBe(true);
    expect(types.has("aggregator")).toBe(true);
  });

  it("patterns cover all categories", async () => {
    const patterns = await loadPatterns();
    const categories = new Set(patterns.map((p) => p.category));
    expect(categories.has("linear")).toBe(true);
    expect(categories.has("pyramid")).toBe(true);
    expect(categories.has("parallel")).toBe(true);
    expect(categories.has("iterative")).toBe(true);
    expect(categories.has("validation")).toBe(true);
    expect(categories.has("efficiency")).toBe(true);
    expect(categories.has("specialist")).toBe(true);
  });
});
