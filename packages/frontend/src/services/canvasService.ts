import type { Node, Edge } from "@xyflow/react";
import type { AgentNodeData, CanvasConfig } from "@open-agents/shared";

/** Calculate drop position relative to the canvas wrapper */
export function calculateDropPosition(
  clientX: number,
  clientY: number,
  bounds: DOMRect,
): { x: number; y: number } {
  return {
    x: clientX - bounds.left - 120,
    y: clientY - bounds.top - 40,
  };
}

/** Build a CanvasConfig from the current nodes & edges */
export function buildCanvasConfig(nodes: Node[], edges: Edge[]): CanvasConfig {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: (n.type ?? "agent") as CanvasConfig["nodes"][number]["type"],
      position: n.position,
      data: n.data as unknown as AgentNodeData,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  };
}

/** Parse a JSON string back into a CanvasConfig */
export function parseCanvasConfig(json: string): CanvasConfig | null {
  try {
    return JSON.parse(json) as CanvasConfig;
  } catch {
    return null;
  }
}
