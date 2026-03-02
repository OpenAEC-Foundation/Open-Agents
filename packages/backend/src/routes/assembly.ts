// =============================================
// Assembly Routes — POST /api/assembly/generate
// NL → Intent → Patterns → Graph → Cost → Validate
// =============================================

import type { FastifyInstance } from "fastify";
import type { AssemblyRequest, AssemblyResult } from "@open-agents/shared";
import {
  getModelProfile,
  getModelProfiles,
  estimateCost,
  validateGraph,
} from "@open-agents/knowledge";
import { classifyIntent } from "../assembly/classify-intent.js";
import { matchPatterns } from "../assembly/match-patterns.js";
import { generateGraph } from "../assembly/generate-graph.js";
import { applyAutoLayout } from "../assembly/auto-layout.js";
import { getKnowledgeRegistry as getRegistry } from "../knowledge-registry.js";

export async function assemblyRoutes(app: FastifyInstance) {
  /**
   * POST /api/assembly/generate
   *
   * Full pipeline: NL description → classified intent → matched patterns
   * → generated graph → cost estimate → validation.
   *
   * Can be called with just steps 1+2 (no graph gen) by omitting pattern selection,
   * but by default runs the full 5-step pipeline.
   */
  app.post<{ Body: AssemblyRequest }>("/assembly/generate", async (request, reply) => {
    const { description, patternId, budgetSensitive } = request.body;

    if (!description?.trim()) {
      reply.code(400);
      return { error: "description is required" };
    }

    try {
      const reg = await getRegistry();
      const allPatterns = reg.getPatterns();
      const modelProfiles = getModelProfiles();

      // Step 1: Classify intent (Haiku)
      const intent = await classifyIntent(description);

      // Step 2: Match patterns (TypeScript)
      let patternMatches = matchPatterns(intent, allPatterns, budgetSensitive);

      // If a specific pattern was requested, prioritize it
      if (patternId) {
        const forcedPattern = reg.getPattern(patternId);
        if (forcedPattern) {
          // Put forced pattern first with score 1.0
          patternMatches = [
            { pattern: forcedPattern, score: 1.0, reasons: ["User-selected pattern"] },
            ...patternMatches.filter((m) => m.pattern.id !== patternId),
          ].slice(0, 3);
        }
      }

      // If no patterns matched, return early with just intent + empty matches
      if (patternMatches.length === 0) {
        const result: AssemblyResult = {
          description,
          intent,
          patternMatches: [],
        };
        return result;
      }

      // Step 3: Generate graph from best matching pattern (Sonnet)
      const bestPattern = patternMatches[0].pattern;
      const config = await generateGraph(description, intent, bestPattern, modelProfiles);

      // Apply auto-layout
      applyAutoLayout(config);

      // Step 4: Estimate cost
      const costEstimate = estimateCost(config, getModelProfile);

      // Step 5: Validate graph
      const validation = validateGraph(config, getModelProfile);

      const result: AssemblyResult = {
        description,
        intent,
        patternMatches,
        config,
        costEstimate,
        validation,
      };

      return result;
    } catch (err) {
      reply.code(500);
      return {
        error: err instanceof Error ? err.message : "Assembly pipeline failed",
      };
    }
  });

  /**
   * POST /api/assembly/classify
   * Run just step 1+2 (intent classification + pattern matching).
   * Useful for preview before committing to graph generation.
   */
  app.post<{ Body: AssemblyRequest }>("/assembly/classify", async (request, reply) => {
    const { description, budgetSensitive } = request.body;

    if (!description?.trim()) {
      reply.code(400);
      return { error: "description is required" };
    }

    try {
      const reg = await getRegistry();
      const allPatterns = reg.getPatterns();

      const intent = await classifyIntent(description);
      const patternMatches = matchPatterns(intent, allPatterns, budgetSensitive);

      return {
        description,
        intent,
        patternMatches,
      };
    } catch (err) {
      reply.code(500);
      return {
        error: err instanceof Error ? err.message : "Classification failed",
      };
    }
  });
}
