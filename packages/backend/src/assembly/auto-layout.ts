// =============================================
// Auto-layout using @dagrejs/dagre (D-019)
// Positions nodes in a top-to-bottom DAG layout
// =============================================

import type { CanvasConfig } from "@open-agents/shared";
import dagre from "@dagrejs/dagre";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 180;
const RANK_SEP = 80;
const NODE_SEP = 40;

/**
 * Apply dagre auto-layout to a CanvasConfig.
 * Positions nodes top-to-bottom based on the edge graph.
 * Mutates the config in place and returns it.
 */
export function applyAutoLayout(config: CanvasConfig): CanvasConfig {
  if (config.nodes.length === 0) return config;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of config.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of config.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  for (const node of config.nodes) {
    const dagreNode = g.node(node.id);
    if (dagreNode) {
      node.position = {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      };
    }
  }

  return config;
}
