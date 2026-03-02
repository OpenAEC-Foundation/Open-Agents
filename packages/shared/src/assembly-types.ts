// =============================================
// Assembly Engine Types (FR-17, D-022)
// NL → Intent → Pattern Match → Graph → Validate → Cost
// =============================================

import type { CanvasConfig } from "./types.js";
import type {
  RoutingPattern,
  CostEstimate,
  ValidationResult,
} from "./knowledge-types.js";

/** Task type classifications for the assembly pipeline */
export type TaskType =
  | "code-review"
  | "code-generation"
  | "data-analysis"
  | "research"
  | "content-creation"
  | "testing"
  | "devops"
  | "security"
  | "documentation"
  | "general";

/** Complexity tier for determining model routing */
export type ComplexityTier = "simple" | "moderate" | "complex";

/**
 * Step 1 output: Intent classified from NL description (Haiku — D-017).
 */
export interface TaskIntent {
  /** Primary task classification */
  taskType: TaskType;
  /** Domain or subject area */
  domain: string;
  /** Estimated complexity */
  complexity: ComplexityTier;
  /** How many agents are likely needed */
  estimatedAgentCount: number;
  /** Whether parallel execution would benefit */
  needsParallel: boolean;
  /** Whether validation/review gates are needed */
  needsValidation: boolean;
  /** Key terms extracted from the description */
  keywords: string[];
  /** Any constraints mentioned (budget, speed, etc.) */
  constraints: string[];
}

/**
 * Step 2 output: Pattern match with score.
 */
export interface PatternMatch {
  pattern: RoutingPattern;
  score: number;
  /** Why this pattern was matched */
  reasons: string[];
}

/**
 * Complete assembly result returned by POST /api/assembly/generate.
 */
export interface AssemblyResult {
  /** Original user description */
  description: string;
  /** Step 1: Classified intent */
  intent: TaskIntent;
  /** Step 2: Top pattern matches */
  patternMatches: PatternMatch[];
  /** Step 3: Generated canvas config (if graph generation succeeded) */
  config?: CanvasConfig;
  /** Step 4: Cost estimate */
  costEstimate?: CostEstimate;
  /** Step 5: Validation result */
  validation?: ValidationResult;
}

/** Request body for POST /api/assembly/generate */
export interface AssemblyRequest {
  /** NL description of the desired agent team */
  description: string;
  /** Optional: force a specific pattern ID */
  patternId?: string;
  /** Optional: budget-sensitive mode (prefer cheaper models) */
  budgetSensitive?: boolean;
}
