// =============================================
// Model Profiles — hardcoded LLM model metadata
// =============================================

import type {
  ModelCapability,
  ModelId,
  ModelProfile,
  ModelProvider,
} from "@open-agents/shared";

const MODEL_PROFILES: ModelProfile[] = [
  // ---- Anthropic ----
  {
    id: "anthropic/claude-haiku-4-5",
    provider: "anthropic",
    model: "claude-haiku-4-5",
    displayName: "Claude Haiku 4.5",
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
    contextWindow: 200_000,
    maxOutput: 8192,
    capabilities: [
      "code-generation",
      "classification",
      "tool-use",
      "fast-response",
      "cost-effective",
    ],
    latencyTier: "fast",
    badgeColor: "bg-emerald-500",
    labels: {
      beginner: "Fast & cheap",
      intermediate: "Haiku",
      advanced: "Haiku 4.5",
    },
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    contextWindow: 200_000,
    maxOutput: 16384,
    capabilities: [
      "code-generation",
      "code-review",
      "reasoning",
      "tool-use",
      "long-context",
    ],
    latencyTier: "medium",
    badgeColor: "bg-blue-500",
    labels: {
      beginner: "Balanced",
      intermediate: "Sonnet",
      advanced: "Sonnet 4.6",
    },
  },
  {
    id: "anthropic/claude-opus-4-6",
    provider: "anthropic",
    model: "claude-opus-4-6",
    displayName: "Claude Opus 4.6",
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    contextWindow: 200_000,
    maxOutput: 16384,
    capabilities: [
      "code-generation",
      "code-review",
      "reasoning",
      "creative-writing",
      "data-analysis",
      "tool-use",
      "long-context",
    ],
    latencyTier: "slow",
    badgeColor: "bg-purple-500",
    labels: {
      beginner: "Most capable",
      intermediate: "Opus",
      advanced: "Opus 4.6",
    },
  },

  // ---- OpenAI ----
  {
    id: "openai/gpt-4o",
    provider: "openai",
    model: "gpt-4o",
    displayName: "GPT-4o",
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    contextWindow: 128_000,
    maxOutput: 16384,
    capabilities: [
      "code-generation",
      "code-review",
      "reasoning",
      "tool-use",
      "fast-response",
    ],
    latencyTier: "fast",
    badgeColor: "bg-teal-500",
    labels: {
      beginner: "GPT (fast)",
      intermediate: "GPT-4o",
      advanced: "GPT-4o",
    },
  },
  {
    id: "openai/gpt-4o-mini",
    provider: "openai",
    model: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    contextWindow: 128_000,
    maxOutput: 16384,
    capabilities: [
      "code-generation",
      "classification",
      "tool-use",
      "fast-response",
      "cost-effective",
    ],
    latencyTier: "fast",
    badgeColor: "bg-teal-400",
    labels: {
      beginner: "GPT (mini)",
      intermediate: "GPT-4o-mini",
      advanced: "GPT-4o-mini",
    },
  },
  {
    id: "openai/o3",
    provider: "openai",
    model: "o3",
    displayName: "o3",
    costPer1kInput: 0.01,
    costPer1kOutput: 0.04,
    contextWindow: 200_000,
    maxOutput: 100_000,
    capabilities: [
      "code-generation",
      "code-review",
      "reasoning",
      "data-analysis",
      "tool-use",
      "long-context",
    ],
    latencyTier: "slow",
    badgeColor: "bg-teal-500",
    labels: {
      beginner: "GPT (reasoning)",
      intermediate: "o3",
      advanced: "o3",
    },
  },
  {
    id: "openai/o4-mini",
    provider: "openai",
    model: "o4-mini",
    displayName: "o4 Mini",
    costPer1kInput: 0.0011,
    costPer1kOutput: 0.0044,
    contextWindow: 200_000,
    maxOutput: 100_000,
    capabilities: [
      "code-generation",
      "reasoning",
      "tool-use",
      "cost-effective",
    ],
    latencyTier: "medium",
    badgeColor: "bg-teal-400",
    labels: {
      beginner: "GPT (light reasoning)",
      intermediate: "o4-mini",
      advanced: "o4-mini",
    },
  },
  {
    id: "openai/codex-mini",
    provider: "openai",
    model: "codex-mini",
    displayName: "Codex Mini",
    costPer1kInput: 0.0015,
    costPer1kOutput: 0.006,
    contextWindow: 200_000,
    maxOutput: 100_000,
    capabilities: [
      "code-generation",
      "code-review",
      "tool-use",
      "cost-effective",
    ],
    latencyTier: "medium",
    badgeColor: "bg-teal-400",
    labels: {
      beginner: "Codex",
      intermediate: "Codex Mini",
      advanced: "Codex Mini",
    },
  },

  // ---- Mistral ----
  {
    id: "mistral/mistral-large",
    provider: "mistral",
    model: "mistral-large",
    displayName: "Mistral Large",
    costPer1kInput: 0.002,
    costPer1kOutput: 0.006,
    contextWindow: 128_000,
    maxOutput: 8192,
    capabilities: [
      "code-generation",
      "code-review",
      "reasoning",
      "tool-use",
    ],
    latencyTier: "medium",
    badgeColor: "bg-orange-500",
    labels: {
      beginner: "Mistral (large)",
      intermediate: "Mistral L",
      advanced: "Mistral Large",
    },
  },
  {
    id: "mistral/mistral-small",
    provider: "mistral",
    model: "mistral-small",
    displayName: "Mistral Small",
    costPer1kInput: 0.0002,
    costPer1kOutput: 0.0006,
    contextWindow: 128_000,
    maxOutput: 8192,
    capabilities: [
      "classification",
      "tool-use",
      "fast-response",
      "cost-effective",
    ],
    latencyTier: "fast",
    badgeColor: "bg-orange-400",
    labels: {
      beginner: "Mistral (small)",
      intermediate: "Mistral S",
      advanced: "Mistral Small",
    },
  },
  {
    id: "mistral/codestral",
    provider: "mistral",
    model: "codestral",
    displayName: "Codestral",
    costPer1kInput: 0.0003,
    costPer1kOutput: 0.0009,
    contextWindow: 256_000,
    maxOutput: 8192,
    capabilities: [
      "code-generation",
      "code-review",
      "fast-response",
      "cost-effective",
      "long-context",
    ],
    latencyTier: "fast",
    badgeColor: "bg-orange-400",
    labels: {
      beginner: "Code specialist",
      intermediate: "Codestral",
      advanced: "Codestral",
    },
  },
  {
    id: "mistral/mistral-nemo",
    provider: "mistral",
    model: "mistral-nemo",
    displayName: "Mistral Nemo",
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.00015,
    contextWindow: 128_000,
    maxOutput: 8192,
    capabilities: [
      "classification",
      "fast-response",
      "cost-effective",
    ],
    latencyTier: "fast",
    badgeColor: "bg-orange-300",
    labels: {
      beginner: "Mistral (nano)",
      intermediate: "Nemo",
      advanced: "Mistral Nemo",
    },
  },
];

/** Look up a model profile by its full "provider/model" ID */
export function getModelProfile(id: ModelId): ModelProfile | undefined {
  return MODEL_PROFILES.find((p) => p.id === id);
}

/** Return all model profiles */
export function getModelProfiles(): ModelProfile[] {
  return [...MODEL_PROFILES];
}

/** Return all model profiles for a given provider */
export function getModelsByProvider(provider: ModelProvider): ModelProfile[] {
  return MODEL_PROFILES.filter((p) => p.provider === provider);
}

/** Return all model profiles that have a specific capability */
export function getModelsByCapability(cap: ModelCapability): ModelProfile[] {
  return MODEL_PROFILES.filter((p) => p.capabilities.includes(cap));
}
