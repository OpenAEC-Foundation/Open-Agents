// =============================================
// Knowledge Base Types (FR-16, D-016, D-020, D-021)
// =============================================

import type { ModelId, ModelProvider, AgentTool, SkillLevel } from "./types.js";

/** Latency tier for model profiles */
export type LatencyTier = "fast" | "medium" | "slow";

/** Risk level for tool profiles */
export type RiskLevel = "safe" | "moderate" | "dangerous";

/** Execution time tier for tool profiles */
export type ExecutionTimeTier = "instant" | "fast" | "slow" | "variable";

/** Model capability categories */
export type ModelCapability =
  | "code-generation"
  | "code-review"
  | "reasoning"
  | "classification"
  | "creative-writing"
  | "data-analysis"
  | "tool-use"
  | "long-context"
  | "fast-response"
  | "cost-effective";

/** Profile for a single LLM model with pricing and capabilities */
export interface ModelProfile {
  id: ModelId;
  provider: ModelProvider;
  model: string;
  displayName: string;
  /** Cost per 1,000 input tokens in USD */
  costPer1kInput: number;
  /** Cost per 1,000 output tokens in USD */
  costPer1kOutput: number;
  /** Maximum context window in tokens */
  contextWindow: number;
  /** Maximum output tokens */
  maxOutput: number;
  capabilities: ModelCapability[];
  latencyTier: LatencyTier;
  /** UI display color class (e.g., "bg-emerald-500") */
  badgeColor: string;
  /** Skill-level-aware display labels */
  labels: Record<SkillLevel, string>;
}

/** Profile for a single agent tool */
export interface ToolProfile {
  id: AgentTool;
  name: string;
  riskLevel: RiskLevel;
  executionTimeTier: ExecutionTimeTier;
  description: string;
  inputFormat: string;
  outputFormat: string;
}

/** Token budget profile for a routing pattern */
export interface TokenProfile {
  /** Estimated input tokens per node */
  avgInputPerNode: number;
  /** Estimated output tokens per node */
  avgOutputPerNode: number;
  /** Cost multiplier relative to single-agent baseline */
  costMultiplier: number;
}

/** Node template within a routing pattern */
export interface PatternNodeTemplate {
  role: string;
  modelHint: ModelId;
  tools: AgentTool[];
  promptTemplate: string;
}

/** Routing pattern category */
export type PatternCategory =
  | "linear"
  | "pyramid"
  | "parallel"
  | "iterative"
  | "validation"
  | "efficiency"
  | "specialist";

/** A routing pattern loaded from snippet */
export interface RoutingPattern {
  id: string;
  name: string;
  category: PatternCategory;
  tags: string[];
  description: string;
  diagram: string;
  whenToUse: string;
  antiPatterns: string[];
  minNodes: number;
  maxNodes: number;
  tokenProfile: TokenProfile;
  nodeTemplates: PatternNodeTemplate[];
  edgeFlow: string;
}

/** An orchestration principle loaded from snippet */
export interface OrchestrationPrinciple {
  id: string;
  name: string;
  description: string;
  rationale: string;
  examples: string[];
}

/** Building block type */
export type BuildingBlockType =
  | "agent"
  | "connector"
  | "gate"
  | "dispatcher"
  | "aggregator";

/** A building block profile loaded from snippet */
export interface BuildingBlock {
  id: string;
  name: string;
  type: BuildingBlockType;
  description: string;
  capabilities: string[];
  limitations: string[];
}

/** Cost breakdown for a single node */
export interface NodeCostBreakdown {
  nodeId: string;
  nodeName: string;
  model: ModelId;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  costUSD: number;
}

/** Complete cost estimate for a canvas configuration */
export interface CostEstimate {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  breakdown: NodeCostBreakdown[];
}

/** Validation severity */
export type ValidationSeverity = "error" | "warning";

/** A single validation issue */
export interface ValidationIssue {
  severity: ValidationSeverity;
  nodeId?: string;
  message: string;
  rule: string;
}

/** Result of graph validation */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** Search query for the knowledge registry */
export interface KnowledgeSearchQuery {
  tags?: string[];
  category?: string;
  type?: "pattern" | "principle" | "block";
  query?: string;
}

/** Search result item */
export interface KnowledgeSearchResult {
  id: string;
  name: string;
  type: "pattern" | "principle" | "block";
  tags: string[];
  description: string;
  /** Relevance score (0-1) */
  score: number;
}
