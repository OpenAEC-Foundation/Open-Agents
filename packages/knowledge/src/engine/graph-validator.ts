// =============================================
// Graph Validator — DFS-based cycle detection and rule checks
// =============================================

import type {
  CanvasConfig,
  ModelId,
  ModelProfile,
  ValidationIssue,
  ValidationResult,
  AgentNodeData,
  AgentTool,
} from "@open-agents/shared";
import { isAgentNode } from "@open-agents/shared";
import { estimateSystemTokens } from "./token-budget.js";

/**
 * Validate a canvas graph configuration.
 *
 * Rules checked:
 * - no-nodes: error if config has zero nodes
 * - self-loop: error if edge source === target
 * - cycle-detected: error if directed cycle found (DFS white/gray/black)
 * - orphan-node: warning if node has no edges (when >1 node)
 * - invalid-model: error if model ID not in profiles
 * - missing-system-prompt: error if systemPrompt is empty/missing
 * - empty-tools: warning if tools array is empty
 * - dangerous-tools-without-prompt: warning if Bash/Write with systemPrompt < 50 chars
 * - context-overflow: warning if estimated system tokens > 50% of context window
 * - duplicate-edge: warning if multiple edges between same source/target pair
 */
export function validateGraph(
  config: CanvasConfig,
  getModelProfile: (id: ModelId) => ModelProfile | undefined,
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Rule: no-nodes
  if (config.nodes.length === 0) {
    errors.push({
      severity: "error",
      message: "Canvas has no nodes",
      rule: "no-nodes",
    });
    return { valid: false, errors, warnings };
  }

  const nodeIds = new Set(config.nodes.map((n) => n.id));

  // ---- Edge-level rules ----

  // Rule: self-loop
  for (const edge of config.edges) {
    if (edge.source === edge.target) {
      errors.push({
        severity: "error",
        nodeId: edge.source,
        message: `Self-loop detected on node "${edge.source}"`,
        rule: "self-loop",
      });
    }
  }

  // Rule: duplicate-edge
  const edgePairs = new Set<string>();
  for (const edge of config.edges) {
    const key = `${edge.source}->${edge.target}`;
    if (edgePairs.has(key)) {
      warnings.push({
        severity: "warning",
        message: `Duplicate edge from "${edge.source}" to "${edge.target}"`,
        rule: "duplicate-edge",
      });
    }
    edgePairs.add(key);
  }

  // Rule: cycle-detected (DFS with white/gray/black coloring)
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) {
    adjacency.set(id, []);
  }
  for (const edge of config.edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjacency.get(edge.source)!.push(edge.target);
    }
  }

  const WHITE = 0; // unvisited
  const GRAY = 1; // in current DFS path
  const BLACK = 2; // fully processed
  const color = new Map<string, number>();
  for (const id of nodeIds) {
    color.set(id, WHITE);
  }

  let hasCycle = false;

  function dfs(nodeId: string): void {
    color.set(nodeId, GRAY);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      const c = color.get(neighbor);
      if (c === GRAY) {
        hasCycle = true;
        return;
      }
      if (c === WHITE) {
        dfs(neighbor);
        if (hasCycle) return;
      }
    }
    color.set(nodeId, BLACK);
  }

  for (const id of nodeIds) {
    if (color.get(id) === WHITE) {
      dfs(id);
      if (hasCycle) break;
    }
  }

  if (hasCycle) {
    errors.push({
      severity: "error",
      message: "Cycle detected in the graph",
      rule: "cycle-detected",
    });
  }

  // Rule: orphan-node (only warn when there are multiple nodes)
  if (config.nodes.length > 1) {
    const connected = new Set<string>();
    for (const edge of config.edges) {
      connected.add(edge.source);
      connected.add(edge.target);
    }
    for (const node of config.nodes) {
      if (!connected.has(node.id)) {
        warnings.push({
          severity: "warning",
          nodeId: node.id,
          message: `Node "${node.data.name}" has no connections`,
          rule: "orphan-node",
        });
      }
    }
  }

  // ---- Node-level rules (agent nodes only — dispatcher/aggregator have different rules) ----
  for (const node of config.nodes) {
    if (!isAgentNode(node)) continue;
    const agentData = node.data as AgentNodeData;

    const profile = getModelProfile(agentData.model);

    // Rule: invalid-model
    if (!profile) {
      errors.push({
        severity: "error",
        nodeId: node.id,
        message: `Unknown model "${agentData.model}" on node "${agentData.name}"`,
        rule: "invalid-model",
      });
    }

    // Rule: missing-system-prompt
    if (!agentData.systemPrompt || agentData.systemPrompt.trim().length === 0) {
      errors.push({
        severity: "error",
        nodeId: node.id,
        message: `Node "${agentData.name}" has no system prompt`,
        rule: "missing-system-prompt",
      });
    }

    // Rule: empty-tools
    if (agentData.tools.length === 0) {
      warnings.push({
        severity: "warning",
        nodeId: node.id,
        message: `Node "${agentData.name}" has no tools assigned`,
        rule: "empty-tools",
      });
    }

    // Rule: dangerous-tools-without-prompt
    const hasDangerous = agentData.tools.some(
      (t: AgentTool) => t === "Bash" || t === "Write",
    );
    if (
      hasDangerous &&
      (agentData.systemPrompt ?? "").length < 50
    ) {
      warnings.push({
        severity: "warning",
        nodeId: node.id,
        message: `Node "${agentData.name}" uses dangerous tools (Bash/Write) with a short system prompt`,
        rule: "dangerous-tools-without-prompt",
      });
    }

    // Rule: context-overflow
    if (profile) {
      const systemTokens = estimateSystemTokens(
        agentData.systemPrompt,
        agentData.tools,
      );
      const halfContext = profile.contextWindow / 2;
      if (systemTokens > halfContext) {
        warnings.push({
          severity: "warning",
          nodeId: node.id,
          message: `Node "${agentData.name}" system tokens (~${systemTokens}) exceed 50% of context window (${profile.contextWindow})`,
          rule: "context-overflow",
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
