// =============================================
// Cost Estimator — per-node and total cost estimation
// =============================================

import type {
  CanvasConfig,
  CostEstimate,
  ModelId,
  ModelProfile,
  NodeCostBreakdown,
} from "@open-agents/shared";
import { estimateSystemTokens } from "./token-budget.js";

/** Estimated tokens produced by each predecessor node as inbound context */
const PREDECESSOR_OUTPUT_TOKENS = 500;

/**
 * Estimate cost for executing a canvas configuration.
 *
 * For each node:
 * 1. Input tokens = system prompt tokens + tool overhead + predecessor output estimates
 * 2. Output tokens = node.data.maxTokens or (profile.maxOutput / 2)
 * 3. Cost = (input / 1000) * costPer1kInput + (output / 1000) * costPer1kOutput
 *
 * Nodes with unknown models are included in the breakdown with zero cost.
 */
export function estimateCost(
  config: CanvasConfig,
  getModelProfile: (id: ModelId) => ModelProfile | undefined,
): CostEstimate {
  // Build inbound edge count per node
  const inboundCount = new Map<string, number>();
  for (const node of config.nodes) {
    inboundCount.set(node.id, 0);
  }
  for (const edge of config.edges) {
    const current = inboundCount.get(edge.target) ?? 0;
    inboundCount.set(edge.target, current + 1);
  }

  const breakdown: NodeCostBreakdown[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUSD = 0;

  for (const node of config.nodes) {
    const profile = getModelProfile(node.data.model);

    if (!profile) {
      // Unknown model — include in breakdown with zero cost
      breakdown.push({
        nodeId: node.id,
        nodeName: node.data.name,
        model: node.data.model,
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
        costUSD: 0,
      });
      continue;
    }

    // Input tokens: system prompt + tools + inbound context from predecessors
    const systemTokens = estimateSystemTokens(
      node.data.systemPrompt,
      node.data.tools,
    );
    const predecessors = inboundCount.get(node.id) ?? 0;
    const inboundContextTokens = predecessors * PREDECESSOR_OUTPUT_TOKENS;
    const inputTokens = systemTokens + inboundContextTokens;

    // Output tokens: explicit maxTokens or half of model max output
    const outputTokens =
      node.data.maxTokens ?? Math.floor(profile.maxOutput / 2);

    // Cost calculation
    const costUSD =
      (inputTokens / 1000) * profile.costPer1kInput +
      (outputTokens / 1000) * profile.costPer1kOutput;

    breakdown.push({
      nodeId: node.id,
      nodeName: node.data.name,
      model: node.data.model,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      costUSD,
    });

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalCostUSD += costUSD;
  }

  return {
    totalInputTokens,
    totalOutputTokens,
    totalCostUSD,
    breakdown,
  };
}
