import { describe, it, expect } from "vitest";
import {
  getToolProfile,
  getToolProfiles,
  getToolsByRiskLevel,
} from "../engine/tool-profiles.js";
import type { AgentTool } from "@open-agents/shared";

const ALL_TOOLS: AgentTool[] = [
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
];

describe("tool-profiles", () => {
  describe("getToolProfiles", () => {
    it("returns all 8 tool profiles", () => {
      const profiles = getToolProfiles();
      expect(profiles).toHaveLength(8);
    });

    it("returns a copy, not a reference", () => {
      const a = getToolProfiles();
      const b = getToolProfiles();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });

    it("every profile has a non-empty description", () => {
      for (const p of getToolProfiles()) {
        expect(p.description.length).toBeGreaterThan(0);
      }
    });

    it("every profile has inputFormat and outputFormat", () => {
      for (const p of getToolProfiles()) {
        expect(p.inputFormat.length).toBeGreaterThan(0);
        expect(p.outputFormat.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getToolProfile", () => {
    it("returns profile for each known tool", () => {
      for (const tool of ALL_TOOLS) {
        const profile = getToolProfile(tool);
        expect(profile).toBeDefined();
        expect(profile.id).toBe(tool);
      }
    });

    it("throws for an unknown tool", () => {
      expect(() => getToolProfile("Unknown" as AgentTool)).toThrow(
        "Unknown tool: Unknown",
      );
    });

    it("Read is safe and instant", () => {
      const p = getToolProfile("Read");
      expect(p.riskLevel).toBe("safe");
      expect(p.executionTimeTier).toBe("instant");
    });

    it("Bash is dangerous and variable", () => {
      const p = getToolProfile("Bash");
      expect(p.riskLevel).toBe("dangerous");
      expect(p.executionTimeTier).toBe("variable");
    });

    it("Write is moderate and instant", () => {
      const p = getToolProfile("Write");
      expect(p.riskLevel).toBe("moderate");
      expect(p.executionTimeTier).toBe("instant");
    });

    it("Edit is moderate and instant", () => {
      const p = getToolProfile("Edit");
      expect(p.riskLevel).toBe("moderate");
      expect(p.executionTimeTier).toBe("instant");
    });

    it("WebSearch is safe and slow", () => {
      const p = getToolProfile("WebSearch");
      expect(p.riskLevel).toBe("safe");
      expect(p.executionTimeTier).toBe("slow");
    });

    it("WebFetch is safe and slow", () => {
      const p = getToolProfile("WebFetch");
      expect(p.riskLevel).toBe("safe");
      expect(p.executionTimeTier).toBe("slow");
    });
  });

  describe("getToolsByRiskLevel", () => {
    it("returns safe tools (Read, Glob, Grep, WebSearch, WebFetch)", () => {
      const safe = getToolsByRiskLevel("safe");
      expect(safe).toHaveLength(5);
      const ids = safe.map((t) => t.id);
      expect(ids).toContain("Read");
      expect(ids).toContain("Glob");
      expect(ids).toContain("Grep");
      expect(ids).toContain("WebSearch");
      expect(ids).toContain("WebFetch");
    });

    it("returns moderate tools (Write, Edit)", () => {
      const moderate = getToolsByRiskLevel("moderate");
      expect(moderate).toHaveLength(2);
      const ids = moderate.map((t) => t.id);
      expect(ids).toContain("Write");
      expect(ids).toContain("Edit");
    });

    it("returns dangerous tools (Bash only)", () => {
      const dangerous = getToolsByRiskLevel("dangerous");
      expect(dangerous).toHaveLength(1);
      expect(dangerous[0].id).toBe("Bash");
    });

    it("all tools are accounted for across risk levels", () => {
      const safe = getToolsByRiskLevel("safe");
      const moderate = getToolsByRiskLevel("moderate");
      const dangerous = getToolsByRiskLevel("dangerous");
      expect(safe.length + moderate.length + dangerous.length).toBe(8);
    });
  });
});
