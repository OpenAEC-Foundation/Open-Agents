import { describe, it, expect } from "vitest";
import {
  getModelProfile,
  getModelProfiles,
  getModelsByProvider,
  getModelsByCapability,
} from "../engine/model-profiles.js";

describe("model-profiles", () => {
  describe("getModelProfiles", () => {
    it("returns all 12 model profiles", () => {
      const profiles = getModelProfiles();
      expect(profiles).toHaveLength(12);
    });

    it("returns a copy, not a reference to the internal array", () => {
      const a = getModelProfiles();
      const b = getModelProfiles();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });

    it("every profile has positive pricing", () => {
      for (const p of getModelProfiles()) {
        expect(p.costPer1kInput).toBeGreaterThan(0);
        expect(p.costPer1kOutput).toBeGreaterThan(0);
      }
    });

    it("every profile has positive context window and max output", () => {
      for (const p of getModelProfiles()) {
        expect(p.contextWindow).toBeGreaterThan(0);
        expect(p.maxOutput).toBeGreaterThan(0);
      }
    });

    it("every profile has at least one capability", () => {
      for (const p of getModelProfiles()) {
        expect(p.capabilities.length).toBeGreaterThan(0);
      }
    });

    it("every profile has labels for all three skill levels", () => {
      for (const p of getModelProfiles()) {
        expect(p.labels.beginner).toBeTruthy();
        expect(p.labels.intermediate).toBeTruthy();
        expect(p.labels.advanced).toBeTruthy();
      }
    });

    it("every profile has a non-empty badgeColor", () => {
      for (const p of getModelProfiles()) {
        expect(p.badgeColor).toMatch(/^bg-/);
      }
    });
  });

  describe("getModelProfile", () => {
    it("returns the correct profile for a known model", () => {
      const profile = getModelProfile("anthropic/claude-sonnet-4-6");
      expect(profile).toBeDefined();
      expect(profile!.provider).toBe("anthropic");
      expect(profile!.model).toBe("claude-sonnet-4-6");
      expect(profile!.displayName).toBe("Claude Sonnet 4.6");
    });

    it("returns undefined for an unknown model", () => {
      const profile = getModelProfile("anthropic/claude-unknown" as any);
      expect(profile).toBeUndefined();
    });

    it("looks up each Anthropic model", () => {
      expect(getModelProfile("anthropic/claude-haiku-4-5")).toBeDefined();
      expect(getModelProfile("anthropic/claude-sonnet-4-6")).toBeDefined();
      expect(getModelProfile("anthropic/claude-opus-4-6")).toBeDefined();
    });

    it("looks up each OpenAI model", () => {
      expect(getModelProfile("openai/gpt-4o")).toBeDefined();
      expect(getModelProfile("openai/gpt-4o-mini")).toBeDefined();
      expect(getModelProfile("openai/o3")).toBeDefined();
      expect(getModelProfile("openai/o4-mini")).toBeDefined();
      expect(getModelProfile("openai/codex-mini")).toBeDefined();
    });

    it("looks up each Mistral model", () => {
      expect(getModelProfile("mistral/mistral-large")).toBeDefined();
      expect(getModelProfile("mistral/mistral-small")).toBeDefined();
      expect(getModelProfile("mistral/codestral")).toBeDefined();
      expect(getModelProfile("mistral/mistral-nemo")).toBeDefined();
    });
  });

  describe("getModelsByProvider", () => {
    it("returns 3 Anthropic models", () => {
      const models = getModelsByProvider("anthropic");
      expect(models).toHaveLength(3);
      expect(models.every((m) => m.provider === "anthropic")).toBe(true);
    });

    it("returns 5 OpenAI models", () => {
      const models = getModelsByProvider("openai");
      expect(models).toHaveLength(5);
      expect(models.every((m) => m.provider === "openai")).toBe(true);
    });

    it("returns 4 Mistral models", () => {
      const models = getModelsByProvider("mistral");
      expect(models).toHaveLength(4);
      expect(models.every((m) => m.provider === "mistral")).toBe(true);
    });

    it("returns empty array for Ollama (no hardcoded models)", () => {
      const models = getModelsByProvider("ollama");
      expect(models).toHaveLength(0);
    });

    it("covers all 4 providers", () => {
      const providers = new Set(getModelProfiles().map((m) => m.provider));
      expect(providers).toContain("anthropic");
      expect(providers).toContain("openai");
      expect(providers).toContain("mistral");
    });
  });

  describe("getModelsByCapability", () => {
    it("returns multiple models for code-generation", () => {
      const models = getModelsByCapability("code-generation");
      expect(models.length).toBeGreaterThan(3);
    });

    it("returns models for cost-effective", () => {
      const models = getModelsByCapability("cost-effective");
      expect(models.length).toBeGreaterThan(0);
      // All cost-effective models should have lower pricing
      for (const m of models) {
        expect(m.costPer1kInput).toBeLessThan(0.01);
      }
    });

    it("returns models for fast-response", () => {
      const models = getModelsByCapability("fast-response");
      expect(models.length).toBeGreaterThan(0);
      for (const m of models) {
        expect(m.latencyTier).toBe("fast");
      }
    });

    it("returns models for long-context", () => {
      const models = getModelsByCapability("long-context");
      expect(models.length).toBeGreaterThan(0);
      for (const m of models) {
        expect(m.contextWindow).toBeGreaterThanOrEqual(200_000);
      }
    });

    it("returns empty array for an unsupported capability", () => {
      const models = getModelsByCapability("nonexistent" as any);
      expect(models).toHaveLength(0);
    });
  });
});
