// =============================================
// Assembly Engine — NL → Agent Graph Pipeline (D-022)
//
// 5-step pipeline:
//   1. classifyIntent(description)   — Haiku (D-017)
//   2. matchPatterns(intent)         — Pure TypeScript
//   3. generateGraph(intent, pattern) — Sonnet (D-017)
//   4. estimateCost(config)          — TypeScript (knowledge engine)
//   5. validateGraph(config)         — TypeScript (knowledge engine)
// =============================================

export { classifyIntent } from "./classify-intent.js";
export { matchPatterns } from "./match-patterns.js";
export { generateGraph } from "./generate-graph.js";
export { applyAutoLayout } from "./auto-layout.js";
