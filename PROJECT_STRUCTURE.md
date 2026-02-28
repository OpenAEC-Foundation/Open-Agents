# Open-Agents Project Structure & Documentation Map

**Last Updated**: 2026-02-28
**Project**: OpenAEC-Foundation/Open-Agents (Visual Agent Orchestration Platform)
**Local Path**: `C:\Users\Freek Heijting\Documents\GitHub\Open-Agents`

---

## 📋 Table of Contents

1. [Monorepo Overview](#monorepo-overview)
2. [Package Structure](#package-structure)
3. [Dependency Graph](#dependency-graph)
4. [Module Documentation](#module-documentation)
5. [Type System](#type-system)
6. [Build & Development](#build--development)

---

## 🏗️ Monorepo Overview

**Tool**: pnpm workspaces
**Packages**: 7 (frontend, backend, shared, knowledge, vscode-extension, vscode-webview, frappe-app)
**Root Config**: `pnpm-workspace.yaml` + `package.json` (root workspace definition)

### Root-Level Exports & Commands

#### Scripts (package.json)
```json
{
  "dev": "pnpm -r --parallel run dev",
  "dev:frontend": "cd packages/frontend && npm run dev",
  "dev:backend": "cd packages/backend && npm run dev",
  "dev:ext": "cd packages/vscode-extension && npm run watch",
  "build": "pnpm -r run build",
  "build:ext": "pnpm -r --filter vscode-extension --filter vscode-webview run build",
  "typecheck": "pnpm -r run typecheck",
  "test": "vitest run",
  "test:watch": "vitest",
  "clean": "pnpm -r --parallel run clean"
}
```

#### Shared Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.base.json` | Base TypeScript config (ES2022, strict: true) |
| `vitest.config.ts` | Global test configuration |
| `.env.example` | Required env vars (ANTHROPIC_API_KEY, backend port, etc.) |
| `.mcp.json` | MCP server configuration for CLI integration |
| `pnpm-lock.yaml` | Dependency lock file (pnpm 9.0.0+) |

---

## 📦 Package Structure

### 1. @open-agents/shared
**Purpose**: Type definitions and utilities (single source of truth)
**Location**: `packages/shared/`
**Build**: None (source distribution)

#### Core Exports (src/index.ts)
```typescript
// Type definitions
export * from './types';                    // 40+ core types
export * from './assembly-types';           // Assembly engine types
export * from './knowledge-types';          // Knowledge base types
export * from './runtime';                  // Runtime adapter types
```

#### Key Type Definitions

##### Model & Provider Types
```typescript
// from types.ts
export type ModelProvider = 'anthropic' | 'openai' | 'mistral' | 'ollama';
export type ModelId = string;  // format: "provider/model-name"

interface ModelMetadata {
  id: ModelId;
  provider: ModelProvider;
  name: string;
  contextWindow: number;
  costPer1M: { input: number; output: number };
  capabilities: ModelCapability[];
}
```

##### Canvas & Execution Types
```typescript
interface CanvasNode {
  id: string;
  type: NodeType;  // 'agent' | 'subagent' | 'teammate' | 'gate' | etc.
  data: AgentNodeData;
  position: { x: number; y: number };
  selected?: boolean;
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  data?: { condition?: string; errorPath?: boolean };
}

type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

interface ExecutionRun {
  id: string;
  workspaceId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  steps: ExecutionStep[];
  error?: string;
}

interface ExecutionStep {
  nodeId: string;
  input: unknown;
  output?: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  model?: ModelId;
  tokensUsed?: { input: number; output: number };
}
```

##### Chat & Communication Types
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: { agentId?: string; modelId?: ModelId };
}

interface ChatSession {
  id: string;
  workspaceId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

type ChatEventType = 'message' | 'status' | 'error' | 'context';
interface ChatEvent {
  type: ChatEventType;
  payload: unknown;
  timestamp: Date;
}
```

##### Safety & Audit Types
```typescript
interface SafetyConfig {
  enabled: boolean;
  rules: SafetyRule[];
  mode: 'strict' | 'standard' | 'permissive';
}

interface SafetyRule {
  id: string;
  type: 'input_filter' | 'output_filter' | 'behavior_constraint';
  pattern: string;  // regex or glob pattern
  action: 'block' | 'warn' | 'log';
  description: string;
}

interface AuditEntry {
  id: string;
  timestamp: Date;
  workspaceId: string;
  runId: string;
  eventType: 'node_start' | 'node_complete' | 'error' | 'safety_alert';
  nodeId?: string;
  metadata: Record<string, unknown>;
}
```

##### Agent & Configuration Types
```typescript
interface AgentPreset {
  id: string;
  name: string;
  description: string;
  tags: string[];
  template: CanvasConfig;
  category: string;  // 'chain' | 'parallel' | 'iterative' | etc.
}

interface AgentDefinition {
  id: string;
  name: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  model: ModelId;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}
```

##### Provider & Connection Types
```typescript
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ProviderConnection {
  provider: ModelProvider;
  apiKey?: string;  // encrypted in storage
  apiUrl?: string;
  status: ConnectionStatus;
  lastChecked?: Date;
  error?: string;
}
```

##### Assembly Engine Types (assembly-types.ts)
```typescript
type TaskType = 'agent' | 'evaluator' | 'router' | 'aggregator';
type TaskIntent = 'execute' | 'evaluate' | 'classify' | 'aggregate';

interface AssemblyResult {
  taskType: TaskType;
  intent: TaskIntent;
  confidence: number;
  suggestedBlocks: BlockSuggestion[];
}

interface BlockSuggestion {
  blockType: string;
  purpose: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}
```

##### Runtime Types (runtime.ts)
```typescript
interface AgentRuntime {
  provider: ModelProvider;
  execute(config: RuntimeExecutionConfig): Promise<ExecutionResult>;
  validate(config: RuntimeExecutionConfig): boolean;
  getTokenEstimate(input: string): number;
}

interface RuntimeExecutionConfig {
  modelId: ModelId;
  systemPrompt: string;
  userMessage: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  context?: Record<string, unknown>;
}
```

#### Dependencies
```json
{
  "devDependencies": {
    "typescript": "5.7.0",
    "vitest": "3.0.0"
  }
}
```

#### Used By
- `@open-agents/frontend` - Canvas/execution/chat types
- `@open-agents/backend` - Type validation, request/response types
- `@open-agents/knowledge` - Metadata types
- `@open-agents/vscode-extension` - Bridge communication types
- `@open-agents/vscode-webview` - UI state types

---

### 2. @open-agents/knowledge
**Purpose**: Pattern library, best practices, token budgeting, cost estimation
**Location**: `packages/knowledge/`
**Build**: None (source distribution)

#### Core Exports (src/index.ts)
```typescript
// Loaders
export { loadPatterns, loadPrinciples, loadBlocks } from './loader';

// Registry
export { KnowledgeRegistry, type KnowledgeEntry } from './registry';

// Engines
export {
  getModelProfile,
  getModelProfiles,
  getModelsByProvider,
  getModelsByCapability
} from './engine/model-profiles';

export {
  getToolProfile,
  getToolProfiles,
  getToolsByRiskLevel
} from './engine/tool-profiles';

export {
  estimateTokens,
  estimateSystemTokens,
  calculateBudget,
  type TokenBudget
} from './engine/token-budget';

export { estimateCost, type CostEstimate } from './engine/cost-estimator';
export { validateGraph, type ValidationResult } from './engine/graph-validator';
```

#### Key Modules

##### Loader (src/loader.ts)
```typescript
/**
 * Loads pattern definitions from snippets/patterns/*.md
 * @returns Map<patternId, PatternMetadata>
 */
export function loadPatterns(): Map<string, PatternMetadata>;

/**
 * Loads principle definitions from snippets/principles/*.md
 * @returns Map<principleId, PrincipleMetadata>
 */
export function loadPrinciples(): Map<string, PrincipleMetadata>;

/**
 * Loads block definitions from snippets/blocks/*.md
 * @returns Map<blockId, BlockDefinition>
 */
export function loadBlocks(): Map<string, BlockDefinition>;

interface PatternMetadata {
  id: string;
  name: string;
  category: string;  // 'linear' | 'parallel' | 'iterative' | etc.
  description: string;
  complexity: 'simple' | 'moderate' | 'complex';
  tags: string[];
  useCases: string[];
  examples: string[];
}

interface PrincipleMetadata {
  id: string;
  name: string;
  description: string;
  relatedPatterns: string[];
  antiPatterns: string[];
}

interface BlockDefinition {
  id: string;
  name: string;
  type: BlockType;
  inputs: InputDefinition[];
  outputs: OutputDefinition[];
  configuration: ConfigSchema;
  description: string;
}
```

##### Knowledge Registry (src/registry.ts)
```typescript
class KnowledgeRegistry {
  constructor();

  // Querying
  getPattern(id: string): PatternMetadata | undefined;
  getPatternsByCategory(category: string): PatternMetadata[];
  getPrinciple(id: string): PrincipleMetadata | undefined;
  getBlock(id: string): BlockDefinition | undefined;
  getBlocksByType(type: BlockType): BlockDefinition[];

  // Analysis
  suggestPatterns(context: PatternContext): PatternMetadata[];
  suggestBlocks(intent: TaskIntent): BlockDefinition[];
  validateAgainstPrinciples(workflow: CanvasConfig): ValidationResult;

  // Bulk operations
  export(): KnowledgeSnapshot;
  import(snapshot: KnowledgeSnapshot): void;
}

interface PatternContext {
  nodeCount: number;
  complexity: 'simple' | 'moderate' | 'complex';
  requirements: string[];
  domain?: string;
}
```

##### Model Profiles Engine (src/engine/model-profiles.ts)
```typescript
interface ModelProfile {
  id: ModelId;
  provider: ModelProvider;
  name: string;
  contextWindow: number;
  costPer1M: { input: number; output: number };
  capabilities: {
    canHandleImages: boolean;
    canHandleFiles: boolean;
    supportsTools: boolean;
    supportsStreaming: boolean;
    supportsFunctionCalling: boolean;
    maxOutputTokens: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
  recommendedUse: string;
  tier: 'free' | 'pro' | 'enterprise';
}

export function getModelProfile(modelId: ModelId): ModelProfile | undefined;
export function getModelProfiles(): ModelProfile[];
export function getModelsByProvider(provider: ModelProvider): ModelProfile[];
export function getModelsByCapability(capability: keyof ModelProfile['capabilities']): ModelProfile[];
```

##### Tool Profiles Engine (src/engine/tool-profiles.ts)
```typescript
interface ToolProfile {
  id: string;
  name: string;
  category: string;  // 'data' | 'computation' | 'integration' | etc.
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex';
  avgExecutionTime: number;  // ms
  estimatedTokens: {
    input: number;  // tokens per invocation
    output: number;
  };
  dependencies: string[];
  description: string;
}

export function getToolProfile(toolId: string): ToolProfile | undefined;
export function getToolProfiles(): ToolProfile[];
export function getToolsByRiskLevel(level: string): ToolProfile[];
```

##### Token Budget Engine (src/engine/token-budget.ts)
```typescript
interface TokenBudget {
  totalAvailable: number;
  allocated: Map<string, number>;  // nodeId -> token allocation
  remaining: number;
  utilization: number;  // percentage
}

/**
 * Estimates tokens for a given input text
 * @param text - Input text
 * @param model - Model ID (used for tokenizer selection)
 * @returns Estimated token count
 */
export function estimateTokens(text: string, model?: ModelId): number;

/**
 * Estimates tokens in system prompt
 * @param systemPrompt - System prompt text
 * @returns Estimated token count
 */
export function estimateSystemTokens(systemPrompt: string): number;

/**
 * Calculates token budget for a workflow
 * @param workflow - Canvas configuration
 * @param modelId - Primary model to use
 * @returns Token budget allocation
 */
export function calculateBudget(
  workflow: CanvasConfig,
  modelId: ModelId
): TokenBudget;
```

##### Cost Estimator (src/engine/cost-estimator.ts)
```typescript
interface CostEstimate {
  totalCost: number;  // USD
  byNode: Map<string, NodeCost>;
  byModel: Map<ModelId, ModelCost>;
  breakeven: number;  // number of runs to breakeven
}

interface NodeCost {
  nodeId: string;
  model: ModelId;
  estimatedTokens: { input: number; output: number };
  costUSD: number;
}

interface ModelCost {
  modelId: ModelId;
  totalTokens: { input: number; output: number };
  costUSD: number;
  usagePercentage: number;
}

/**
 * Estimates cost of a workflow execution
 * @param workflow - Canvas configuration
 * @param executionContext - Expected input/output volume
 * @returns Cost estimate
 */
export function estimateCost(
  workflow: CanvasConfig,
  executionContext: ExecutionContext
): CostEstimate;
```

##### Graph Validator (src/engine/graph-validator.ts)
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: string;
}

interface ValidationError {
  type: 'cyclic_dependency' | 'missing_input' | 'type_mismatch' | 'unconnected_node';
  nodeId?: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validates a canvas workflow graph
 * @param workflow - Canvas configuration
 * @param context - Validation context (available models, blocks, etc.)
 * @returns Validation result with errors/warnings
 */
export function validateGraph(
  workflow: CanvasConfig,
  context?: ValidationContext
): ValidationResult;
```

#### Knowledge Content

##### Patterns (35 total, in snippets/patterns/)
| Category | Count | Examples |
|----------|-------|----------|
| Linear (6) | chain, handoff, escalation, gate, sequential-decision, parallel-handoff |
| Parallel (5) | fan-out, fan-in, map-reduce, race, consensus |
| Iterative (5) | simple-loop, feedback-loop, debate, spiral, adaptive-refinement |
| Efficiency (5) | cache-check, token-budget, lazy-escalation, context-compression, batch-processing |
| Specialist (4) | code-review, document-processor, router, summarizer |
| Validation (5) | dual-review, pipeline-gate, test-driven, assertion-driven, peer-review |
| Pyramid (5) | hierarchy, diamond, pyramid-up, pyramid-down, mesh |

Each pattern has YAML frontmatter with metadata + markdown description.

##### Principles (7 total, in snippets/principles/)
1. **Atomicity** - Single responsibility per node
2. **Context Isolation** - Minimize context leakage
3. **Model Routing** - Route by capability, not provider
4. **Progressive Complexity** - Start simple, escalate only when needed
5. **Fail Gracefully** - Implement fallbacks and recovery paths
6. **Observe Before Act** - Validation before execution
7. **Minimize Token Waste** - Efficient prompting and caching

##### Blocks (13 total, in snippets/blocks/)
| Block | NodeType | Purpose |
|-------|----------|---------|
| Agent Node | `agent` | Single LLM execution |
| SubAgent Node | `subagent` | Recursive agent invocation |
| Teammate Node | `teammate` | Specialized agent (fixed role) |
| Aggregator Node | `aggregator` | Combine multiple outputs |
| Dispatcher Node | `dispatcher` | Route to multiple agents |
| Connector Node | `connector` | Inter-workflow linking |
| Gate Node | `gate` | Conditional branching |
| System Prompt Block | `system-prompt` | Shared system instructions |
| Tool Definition Block | `tool-definition` | Tool registry |
| Rule Block | `rule-block` | Safety/validation rules |
| Hook Block | `hook` | Before/after execution |
| MCP Server Block | `mcp-server` | External service integration |
| Skill Badge | `skill-badge` | Agent capability annotation |

#### Dependencies
```json
{
  "dependencies": {
    "@open-agents/shared": "workspace:*"
  },
  "devDependencies": {
    "gray-matter": "4.0.3",
    "typescript": "5.7.0",
    "vitest": "3.0.0"
  }
}
```

#### Used By
- `@open-agents/backend` - Cost estimation, token budgeting, pattern suggestions
- Route handlers for pattern/knowledge queries

---

### 3. @open-agents/backend
**Purpose**: Fastify HTTP server, execution engine, multi-provider LLM orchestration
**Location**: `packages/backend/`
**Build**: TypeScript → JavaScript (tsc)
**Port**: 3001 (configurable)

#### Core Exports (src/server.ts)
```typescript
// Server initialization
export async function createServer(options?: ServerOptions): Promise<FastifyInstance>;

interface ServerOptions {
  port?: number;
  host?: string;
  environment?: 'development' | 'production';
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
}

// Main entry
const server = await createServer();
await server.listen({ port: process.env.PORT || 3001, host: '0.0.0.0' });
```

#### Key Modules

##### Execution Engine (src/execution-engine.ts)
```typescript
/**
 * Central orchestrator for agent execution
 * - Flow control (pause, resume, cancel, retry, skip)
 * - Multi-provider LLM support
 * - Streaming SSE results
 * - Error handling & recovery
 */
class ExecutionEngine {
  constructor(context: ExecutionContext);

  // Core execution
  async execute(
    workflow: CanvasConfig,
    input: unknown,
    config?: ExecutionOptions
  ): Promise<ExecutionRun>;

  // Flow control
  async pause(runId: string): Promise<void>;
  async resume(runId: string): Promise<void>;
  async cancel(runId: string): Promise<void>;
  async skip(nodeId: string, runId: string): Promise<void>;
  async retry(nodeId: string, runId: string): Promise<void>;
  async abort(nodeId: string, runId: string): Promise<void>;

  // Streaming
  getExecutionStream(runId: string): ReadableStream<ExecutionEvent>;

  // Introspection
  getRunStatus(runId: string): ExecutionRun | undefined;
  getAllRuns(): ExecutionRun[];
}

interface ExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  pauseOnError?: boolean;
  streamResults?: boolean;
  safetyConfig?: SafetyConfig;
}

interface ExecutionContext {
  modelProvider: (modelId: ModelId) => AgentRuntime;
  auditStore: AuditStore;
  safetyStore: SafetyStore;
  instructionsStore: InstructionsStore;
  knowledgeRegistry: KnowledgeRegistry;
}
```

##### Audit Store (src/audit-store.ts)
```typescript
/**
 * Persistent storage for execution audit logs
 * - In-memory (default) or file-based backend
 * - Query by runId, nodeId, timestamp
 */
class AuditStore {
  async recordEntry(entry: AuditEntry): Promise<void>;
  async getEntriesByRun(runId: string): Promise<AuditEntry[]>;
  async getEntriesByNode(nodeId: string): Promise<AuditEntry[]>;
  async getEntriesByTimeRange(start: Date, end: Date): Promise<AuditEntry[]>;
  async deleteByRun(runId: string): Promise<void>;
  async export(): Promise<AuditEntry[]>;
}
```

##### Safety Store (src/safety-store.ts)
```typescript
/**
 * Persistent storage for safety rules & configurations
 */
class SafetyStore {
  async getSafetyConfig(workspaceId: string): Promise<SafetyConfig>;
  async setSafetyConfig(workspaceId: string, config: SafetyConfig): Promise<void>;
  async validateInput(workspaceId: string, input: string): Promise<ValidationResult>;
  async validateOutput(workspaceId: string, output: string): Promise<ValidationResult>;
  async checkBehaviorConstraints(workspaceId: string, action: string): Promise<boolean>;
}
```

##### Key Store (src/key-store.ts)
```typescript
/**
 * Encrypted storage for API keys
 */
class KeyStore {
  async setKey(provider: ModelProvider, apiKey: string): Promise<void>;
  async getKey(provider: ModelProvider): Promise<string | undefined>;
  async deleteKey(provider: ModelProvider): Promise<void>;
  async listProviders(): Promise<ModelProvider[]>;
  async validateKey(provider: ModelProvider, apiKey: string): Promise<boolean>;
}
```

##### Preset Loader (src/preset-loader.ts)
```typescript
/**
 * Loads preset agent configurations
 */
class PresetLoader {
  async loadPresets(): Promise<Map<string, AgentPreset>>;
  async getPreset(id: string): Promise<AgentPreset | undefined>;
  async getPresetsByCategory(category: string): Promise<AgentPreset[]>;
  async getPresetsByTags(tags: string[]): Promise<AgentPreset[]>;
}
```

##### Template Loader (src/template-loader.ts)
```typescript
/**
 * Loads execution flow templates
 */
class TemplateLoader {
  async loadTemplates(): Promise<Map<string, FlowTemplate>>;
  async getTemplate(id: string): Promise<FlowTemplate | undefined>;
  async instantiateTemplate(id: string, context?: unknown): Promise<CanvasConfig>;
}

interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  parameters: TemplateParameter[];
}
```

##### Instructions Store (src/instructions-store.ts)
```typescript
/**
 * Persistent storage for user-defined system instructions
 */
class InstructionsStore {
  async getInstructions(workspaceId: string): Promise<string>;
  async setInstructions(workspaceId: string, instructions: string): Promise<void>;
  async appendInstructions(workspaceId: string, instructions: string): Promise<void>;
  async mergeWith(primary: string, secondary: string): Promise<string>;
}
```

##### Assembly Engine (src/assembly/)
```typescript
// src/assembly/classify-intent.ts
export function classifyIntent(
  userInput: string,
  context?: KnowledgeContext
): { intent: TaskIntent; confidence: number };

// src/assembly/match-patterns.ts
export function matchPatterns(
  intent: TaskIntent,
  availablePatterns: PatternMetadata[]
): PatternMetadata[];

/**
 * Assembly engine suggests workflow patterns & blocks
 * based on user intent classification
 */
```

#### API Routes

##### Health (src/routes/health.ts)
```typescript
// GET /api/health
export function healthRoute(server: FastifyInstance) {
  server.get('/api/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date(),
      version: pkg.version,
      uptime: process.uptime()
    };
  });
}
```

##### Configuration (src/routes/configs.ts)
```typescript
// GET /api/configs/models
export async getModels(provider?: ModelProvider): Promise<ModelProfile[]>;

// GET /api/configs/templates
export async getTemplates(): Promise<FlowTemplate[]>;

// GET /api/configs/presets
export async getPresets(category?: string): Promise<AgentPreset[]>;
```

##### Execution (src/routes/execute.ts)
```typescript
// POST /api/execute
export async function executeWorkflow(
  workflow: CanvasConfig,
  input: unknown,
  options?: ExecutionOptions
): Promise<ExecutionRun>;

// GET /api/execute/:runId
export async function getExecutionStatus(runId: string): Promise<ExecutionRun>;

// GET /api/execute/:runId/events (Server-Sent Events)
export async function getExecutionStream(runId: string): ReadableStream;

// POST /api/execute/:runId/pause
// POST /api/execute/:runId/resume
// POST /api/execute/:runId/cancel
// POST /api/execute/:runId/skip/:nodeId
// POST /api/execute/:runId/retry/:nodeId
```

##### Provider Connection (src/routes/connect.ts)
```typescript
// POST /api/connect/validate
export async function validateConnection(
  provider: ModelProvider,
  apiKey: string
): Promise<{ valid: boolean; error?: string }>;

// POST /api/connect/set
export async function setProviderKey(
  provider: ModelProvider,
  apiKey: string
): Promise<{ success: boolean }>;

// GET /api/connect/status
export async function getConnectionStatus(): Promise<
  Map<ModelProvider, ConnectionStatus>
>;
```

##### Chat (src/routes/chat.ts)
```typescript
// POST /api/chat/session
export async function createChatSession(
  workspaceId: string,
  config?: ChatConfig
): Promise<ChatSession>;

// POST /api/chat/:sessionId/message
export async function sendChatMessage(
  sessionId: string,
  message: ChatMessage
): Promise<ChatMessage>;

// GET /api/chat/:sessionId/messages
export async function getChatMessages(sessionId: string): Promise<ChatMessage[]>;

// GET /api/chat/:sessionId/events (SSE)
export async function getChatStream(sessionId: string): ReadableStream;
```

##### Agents (src/routes/agents.ts)
```typescript
// POST /api/agents
export async function createAgent(agent: AgentDefinition): Promise<AgentDefinition>;

// GET /api/agents
export async function listAgents(): Promise<AgentDefinition[]>;

// GET /api/agents/:id
export async function getAgent(id: string): Promise<AgentDefinition | null>;

// PUT /api/agents/:id
export async function updateAgent(id: string, agent: AgentDefinition): Promise<AgentDefinition>;

// DELETE /api/agents/:id
export async function deleteAgent(id: string): Promise<void>;
```

##### Presets (src/routes/presets.ts)
```typescript
// Similar CRUD to agents, specific to AgentPreset type
// POST/GET/PUT/DELETE /api/presets
// GET /api/presets?category=chain&tags=parallel
```

##### Templates (src/routes/templates.ts)
```typescript
// GET /api/templates
// GET /api/templates/:id
// POST /api/templates/:id/instantiate
```

##### Generate (src/routes/generate.ts)
```typescript
// POST /api/generate/agent
// Input: context, intent, requirements
// Output: AgentDefinition generated by LLM

// POST /api/generate/workflow
// Input: user instruction, templates context
// Output: CanvasConfig generated by LLM

// POST /api/generate/instructions
// Input: agent metadata, context
// Output: System prompt generated by LLM
```

##### Knowledge (src/routes/knowledge.ts)
```typescript
// GET /api/knowledge/patterns
// GET /api/knowledge/patterns?category=linear
// GET /api/knowledge/principles
// GET /api/knowledge/blocks

// POST /api/knowledge/suggest-pattern
// Input: PatternContext
// Output: Suggested patterns ranked by relevance

// POST /api/knowledge/validate-graph
// Input: CanvasConfig
// Output: ValidationResult
```

##### Audit (src/routes/audit.ts)
```typescript
// GET /api/audit/runs
// GET /api/audit/runs/:runId
// GET /api/audit/entries?startDate=&endDate=
// GET /api/audit/export
// DELETE /api/audit/runs/:runId
```

##### Safety (src/routes/safety.ts)
```typescript
// GET /api/safety/config/:workspaceId
// PUT /api/safety/config/:workspaceId
// POST /api/safety/validate-input
// POST /api/safety/validate-output
```

##### Instructions (src/routes/instructions.ts)
```typescript
// GET /api/instructions/:workspaceId
// PUT /api/instructions/:workspaceId
// POST /api/instructions/:workspaceId/append
```

#### Runtime Adapters

##### Anthropic SDK Runtime (src/runtimes/claude-sdk.ts)
```typescript
/**
 * Anthropic Agent SDK integration (primary)
 * Uses @anthropic-ai/claude-agent-sdk
 */
class AnthropicSDKRuntime implements AgentRuntime {
  provider = 'anthropic';

  async execute(config: RuntimeExecutionConfig): Promise<ExecutionResult>;
  validate(config: RuntimeExecutionConfig): boolean;
  getTokenEstimate(input: string): number;
}
```

##### OpenAI Runtime (src/runtimes/openai.ts)
```typescript
/**
 * OpenAI integration via openai package
 */
class OpenAIRuntime implements AgentRuntime {
  provider = 'openai';

  async execute(config: RuntimeExecutionConfig): Promise<ExecutionResult>;
  validate(config: RuntimeExecutionConfig): boolean;
  getTokenEstimate(input: string): number;
}
```

##### Mistral Runtime (src/runtimes/mistral.ts)
```typescript
/**
 * Mistral AI integration
 */
class MistralRuntime implements AgentRuntime {
  provider = 'mistral';

  async execute(config: RuntimeExecutionConfig): Promise<ExecutionResult>;
  validate(config: RuntimeExecutionConfig): boolean;
  getTokenEstimate(input: string): number;
}
```

##### Ollama Runtime (src/runtimes/ollama.ts)
```typescript
/**
 * Local Ollama integration
 */
class OllamaRuntime implements AgentRuntime {
  provider = 'ollama';

  async execute(config: RuntimeExecutionConfig): Promise<ExecutionResult>;
  validate(config: RuntimeExecutionConfig): boolean;
  getTokenEstimate(input: string): number;
}
```

#### Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "0.2.63",
    "@anthropic-ai/sdk": "0.78.0",
    "@open-agents/shared": "workspace:*",
    "@open-agents/knowledge": "workspace:*",
    "fastify": "5.2.0",
    "@fastify/cors": "11.0.0"
  },
  "devDependencies": {
    "typescript": "5.7.0",
    "tsx": "4.19.0",
    "vitest": "3.0.0"
  }
}
```

---

### 4. @open-agents/frontend
**Purpose**: React SPA with React Flow canvas, Zustand state management, Tailwind styling
**Location**: `packages/frontend/`
**Build**: Vite
**Dev Port**: 5173

#### Core Exports (src/App.tsx)
```typescript
/**
 * Main application component
 * - Routes between Canvas, Factory, Library, Settings pages
 * - Initializes Zustand store
 * - Sets up theme & keyboard shortcuts
 */
export default function App(): React.ReactNode;
```

#### Key Components

##### App Structure (src/App.tsx)
```typescript
import { useAppStore } from './stores/appStore';
import { CanvasPage } from './pages/CanvasPage';
import { FactoryPage } from './pages/FactoryPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';

/**
 * Root component structure:
 * - Theme provider (CSS custom properties)
 * - Keyboard shortcut registry
 * - React Router navigation
 * - Toast notification system
 * - Modal system
 */
```

##### Canvas Page (src/pages/CanvasPage.tsx)
```typescript
/**
 * Main workspace page with React Flow canvas
 * Layout:
 * - Left: Sidebar with palettes, presets
 * - Center: Node/edge editor (React Flow)
 * - Right: Inspector panel (node properties, chat)
 * - Bottom: Execution toolbar, output panel
 * - Overlays: ExecutionToolbar, ChatPanel, GeneratePanel
 */
export function CanvasPage(): React.ReactNode;
```

##### Factory Page (src/pages/FactoryPage.tsx)
```typescript
/**
 * Agent creation & preset management
 * - Create agents from presets
 * - Configure agent properties
 * - Save as new presets
 * - Gallery/grid view of presets
 */
export function FactoryPage(): React.ReactNode;
```

##### Library Page (src/pages/LibraryPage.tsx)
```typescript
/**
 * Preset library browser
 * - Filter by category, tags
 * - Preview preset configurations
 * - Import presets to canvas
 * - Search & discovery
 */
export function LibraryPage(): React.ReactNode;
```

##### Settings Page (src/pages/SettingsPage.tsx)
```typescript
/**
 * Global application settings
 * - Provider credentials (API keys)
 * - Model selection defaults
 * - Skill level (simple/expert UI)
 * - Theme selection
 * - Safety rules configuration
 */
export function SettingsPage(): React.ReactNode;
```

##### Components Directory

###### Canvas Components
```typescript
// src/components/AgentNode.tsx
/**
 * React Flow node component for agent nodes
 * - Displays node type icon + name
 * - Handle connectors (inputs/outputs)
 * - Context menu (edit, delete, duplicate)
 * - Selection highlighting
 */
export function AgentNode(props: NodeProps<AgentNodeData>): React.ReactNode;

// src/components/ConnectModal.tsx
/**
 * Modal for connecting to LLM providers
 * - API key input
 * - Connection test button
 * - Provider selection
 */
export function ConnectModal(props: ConnectModalProps): React.ReactNode;

// src/components/ConnectionIndicator.tsx
/**
 * Status badge showing provider connection status
 * - Color coded: green (connected), yellow (testing), red (error)
 * - Tooltip with error details
 */
export function ConnectionIndicator(props: ConnectionIndicatorProps): React.ReactNode;

// src/components/ExecutionToolbar.tsx
/**
 * Control bar for workflow execution
 * - Run button
 * - Pause/Resume buttons (during execution)
 * - Cancel button
 * - Status indicator
 * - Progress bar
 */
export function ExecutionToolbar(): React.ReactNode;

// src/components/OutputPanel.tsx
/**
 * Displays execution results
 * - Step-by-step node execution
 * - Input/output for each node
 * - Token usage per node
 * - Cost breakdown
 * - Error details
 */
export function OutputPanel(): React.ReactNode;

// src/components/ReplayControls.tsx
/**
 * Controls for replaying execution
 * - Play/pause
 * - Step forward/backward
 * - Timeline slider
 * - Speed control
 */
export function ReplayControls(): React.ReactNode;
```

###### Chat Components
```typescript
// src/components/ChatPanel.tsx
/**
 * Chat interface for agent interaction
 * - Message history display
 * - Input field with markdown support
 * - File upload
 * - Suggested prompts
 */
export function ChatPanel(): React.ReactNode;
```

###### Generation Components
```typescript
// src/components/GeneratePanel.tsx
/**
 * LLM-powered workflow generation
 * - Natural language description input
 * - Generate button
 * - Load generated workflow to canvas
 */
export function GeneratePanel(): React.ReactNode;

// src/components/AgentWizard.tsx
/**
 * Step-by-step agent configuration wizard
 * - Name & description
 * - Model selection
 * - System prompt editor
 * - Tool selection
 * - Review & create
 */
export function AgentWizard(): React.ReactNode;
```

###### Modals & Dialogs
```typescript
// src/components/ErrorDecisionDialog.tsx
/**
 * During execution, shows error handling options
 * - Retry
 * - Skip node
 * - Abort workflow
 * - Modify and retry
 */
export function ErrorDecisionDialog(): React.ReactNode;

// src/components/UserInstructionsEditor.tsx
/**
 * Editor for custom system instructions
 * - Markdown editor
 * - Preview pane
 * - Save to workspace
 */
export function UserInstructionsEditor(): React.ReactNode;
```

###### Utilities & Layout
```typescript
// src/components/Sidebar.tsx
/**
 * Left navigation sidebar
 * - Page links (Canvas, Factory, Library, Settings)
 * - Preset quick-access
 * - Search
 * - Skill level toggle
 */
export function Sidebar(): React.ReactNode;

// src/components/ThemePicker.tsx
/**
 * Theme selector dropdown
 * - dark
 * - light
 * - impertio (custom brand theme)
 */
export function ThemePicker(): React.ReactNode;

// src/components/SkillLevelToggle.tsx
/**
 * Toggle between simple & expert UI modes
 * - Simple: Hide advanced options
 * - Expert: Full feature set
 */
export function SkillLevelToggle(): React.ReactNode;

// src/components/RunHistoryView.tsx
/**
 * View history of past executions
 * - List of runs (sortable, filterable)
 * - Run details (time, status, node count)
 * - Re-execute button
 * - Download results
 */
export function RunHistoryView(): React.ReactNode;

// src/components/SafetySettingsView.tsx
/**
 * Safety rules configuration UI
 * - Add/edit/delete rules
 * - Rule type selection
 * - Pattern editor
 * - Test rule against sample input
 */
export function SafetySettingsView(): React.ReactNode;
```

#### State Management (Zustand)

##### App Store (src/stores/appStore.ts)
```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * Root Zustand store with Immer middleware
 * Combines all slices into single store
 */
export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    ...canvasSlice(set, get),
    ...executionSlice(set, get),
    ...historySlice(set, get),
    ...auditSlice(set, get),
    ...factorySlice(set, get),
    ...safetySlice(set, get),
    ...selectionSlice(set, get),
    ...settingsSlice(set, get),
    ...uiSlice(set, get),
    ...workspaceSlice(set, get),
  }))
);
```

##### Store Slices

###### Canvas Slice (src/stores/slices/canvasSlice.ts)
```typescript
interface CanvasState {
  // Workflow
  nodes: CanvasNode[];
  edges: CanvasEdge[];

  // Computed
  nodeMap: Map<string, CanvasNode>;
  adjacencyList: Map<string, string[]>;  // nodeId -> target nodeIds

  // Actions
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  addNode: (node: CanvasNode) => void;
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: CanvasEdge) => void;
  deleteEdge: (edgeId: string) => void;
  loadWorkflow: (workflow: CanvasConfig) => void;
  clear: () => void;
  getDownstream: (nodeId: string) => CanvasNode[];
  getUpstream: (nodeId: string) => CanvasNode[];
}

export const canvasSlice = (set: any, get: any): CanvasState => ({
  nodes: [],
  edges: [],
  nodeMap: new Map(),
  adjacencyList: new Map(),
  // ... implementations
});
```

###### Execution Slice (src/stores/slices/executionSlice.ts)
```typescript
interface ExecutionState {
  // Execution state
  currentRun: ExecutionRun | null;
  status: ExecutionStatus;
  isPaused: boolean;
  currentStepNodeId: string | null;

  // Actions
  startExecution: (workflow: CanvasConfig, input: unknown) => Promise<void>;
  updateExecutionStatus: (status: ExecutionStatus) => void;
  addExecutionStep: (step: ExecutionStep) => void;
  pauseExecution: () => Promise<void>;
  resumeExecution: () => Promise<void>;
  cancelExecution: () => Promise<void>;
  skipNode: (nodeId: string) => Promise<void>;
  retryNode: (nodeId: string) => Promise<void>;
  abortNode: (nodeId: string) => Promise<void>;
  setCurrentRun: (run: ExecutionRun | null) => void;
}
```

###### History Slice (src/stores/slices/historySlice.ts)
```typescript
interface HistoryState {
  // Past runs
  runs: ExecutionRun[];
  selectedRunId: string | null;

  // Filtering
  filterStatus?: ExecutionStatus;
  filterStartDate?: Date;
  filterEndDate?: Date;

  // Actions
  addRun: (run: ExecutionRun) => void;
  setSelectedRun: (runId: string) => void;
  deleteRun: (runId: string) => Promise<void>;
  exportRun: (runId: string) => void;
  setFilter: (filter: HistoryFilter) => void;
  getRunsSummary: () => RunSummary[];
}
```

###### Audit Slice (src/stores/slices/auditSlice.ts)
```typescript
interface AuditState {
  // Audit log
  entries: AuditEntry[];

  // Actions
  addAuditEntry: (entry: AuditEntry) => void;
  fetchAuditEntries: (filter: AuditFilter) => Promise<void>;
  exportAuditLog: () => void;
}
```

###### Factory Slice (src/stores/slices/factorySlice.ts)
```typescript
interface FactoryState {
  // Presets & agents
  availablePresets: AgentPreset[];
  availableAgents: AgentDefinition[];

  // Factory mode
  draftAgent: AgentDefinition | null;

  // Actions
  loadPresets: () => Promise<void>;
  loadAgents: () => Promise<void>;
  setDraftAgent: (agent: AgentDefinition | null) => void;
  saveAgent: (agent: AgentDefinition) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  createPresetFromDraft: (name: string, category: string) => Promise<void>;
}
```

###### Safety Slice (src/stores/slices/safetySlice.ts)
```typescript
interface SafetyState {
  // Safety configuration
  safetyConfig: SafetyConfig;
  validationResults: Map<string, ValidationResult>;

  // Actions
  loadSafetyConfig: () => Promise<void>;
  updateSafetyConfig: (config: SafetyConfig) => Promise<void>;
  addRule: (rule: SafetyRule) => void;
  removeRule: (ruleId: string) => void;
  validateInput: (input: string) => Promise<ValidationResult>;
  validateOutput: (output: string) => Promise<ValidationResult>;
}
```

###### Selection Slice (src/stores/slices/selectionSlice.ts)
```typescript
interface SelectionState {
  // Canvas selection
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  focusedNodeId: string | null;

  // Actions
  selectNode: (nodeId: string, multi?: boolean) => void;
  deselectNode: (nodeId: string) => void;
  selectEdge: (edgeId: string, multi?: boolean) => void;
  deselectEdge: (edgeId: string) => void;
  clearSelection: () => void;
  focusNode: (nodeId: string) => void;
  selectAll: () => void;
}
```

###### Settings Slice (src/stores/slices/settingsSlice.ts)
```typescript
interface SettingsState {
  // Global settings
  theme: 'dark' | 'light' | 'impertio';
  skillLevel: 'simple' | 'expert';
  defaultModel: ModelId;
  enableSafety: boolean;
  enableAudit: boolean;

  // Provider credentials (stored in backend)
  connectedProviders: ModelProvider[];

  // Actions
  setTheme: (theme: 'dark' | 'light' | 'impertio') => void;
  setSkillLevel: (level: 'simple' | 'expert') => void;
  setDefaultModel: (modelId: ModelId) => void;
  setEnabledFeatures: (features: FeatureFlags) => void;
  connectProvider: (provider: ModelProvider, apiKey: string) => Promise<void>;
  disconnectProvider: (provider: ModelProvider) => Promise<void>;
}
```

###### UI Slice (src/stores/slices/uiSlice.ts)
```typescript
interface UIState {
  // UI state
  sidebarOpen: boolean;
  outputPanelOpen: boolean;
  chatPanelOpen: boolean;
  inspectorOpen: boolean;

  // Modals
  openModals: Set<string>;  // modal IDs

  // Notifications
  notifications: Notification[];

  // Actions
  toggleSidebar: () => void;
  toggleOutputPanel: () => void;
  toggleChatPanel: () => void;
  toggleInspector: () => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}
```

###### Workspace Slice (src/stores/slices/workspaceSlice.ts)
```typescript
interface WorkspaceState {
  // Workspace metadata
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  // Persistence
  isDirty: boolean;
  lastSavedAt?: Date;

  // Actions
  setWorkspaceMetadata: (metadata: WorkspaceMetadata) => void;
  saveWorkspace: () => Promise<void>;
  loadWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<string>;
  deleteWorkspace: () => Promise<void>;
}
```

##### Store Selectors (src/stores/selectors.ts)
```typescript
/**
 * Memoized selectors for efficient component updates
 * Prevent unnecessary re-renders via selector memoization
 */

export const selectCanvasNodes = (state: AppState) => state.nodes;
export const selectCanvasEdges = (state: AppState) => state.edges;
export const selectSelectedNodes = (state: AppState) =>
  state.nodes.filter(n => state.selectedNodeIds.has(n.id));
export const selectCurrentExecution = (state: AppState) => state.currentRun;
export const selectExecutionStatus = (state: AppState) => state.status;
export const selectConnectedProviders = (state: AppState) => state.connectedProviders;
export const selectTheme = (state: AppState) => state.theme;
export const selectSafetyConfig = (state: AppState) => state.safetyConfig;

// Computed selectors
export const selectExecutionProgress = (state: AppState) => {
  if (!state.currentRun) return 0;
  const total = state.nodes.length;
  const completed = state.currentRun.steps.filter(s => s.status === 'completed').length;
  return (completed / total) * 100;
};

export const selectTotalTokensUsed = (state: AppState) => {
  if (!state.currentRun) return { input: 0, output: 0 };
  return state.currentRun.steps.reduce(
    (acc, step) => {
      if (step.tokensUsed) {
        acc.input += step.tokensUsed.input;
        acc.output += step.tokensUsed.output;
      }
      return acc;
    },
    { input: 0, output: 0 }
  );
};
```

#### Services (Business Logic)

##### API Configuration (src/services/apiConfig.ts)
```typescript
/**
 * Centralized API configuration
 * Base URL, authentication, error handling
 */
export const apiConfig = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export function createApiClient() {
  return {
    get: (url: string) => fetch(`${apiConfig.baseURL}${url}`),
    post: (url: string, data: any) =>
      fetch(`${apiConfig.baseURL}${url}`, {
        method: 'POST',
        headers: apiConfig.headers,
        body: JSON.stringify(data),
      }),
    // ... PUT, DELETE, etc.
  };
}
```

##### Canvas Service (src/services/canvasService.ts)
```typescript
/**
 * Canvas-specific operations
 * - Workflow manipulation
 * - Validation
 * - Import/export
 */
export const canvasService = {
  async validateWorkflow(workflow: CanvasConfig): Promise<ValidationResult>;
  async exportAsJSON(workflow: CanvasConfig): Promise<string>;
  async exportAsYAML(workflow: CanvasConfig): Promise<string>;
  async importFromJSON(json: string): Promise<CanvasConfig>;
  async loadTemplate(templateId: string): Promise<CanvasConfig>;
};
```

##### Execution Service (src/services/executionService.ts)
```typescript
/**
 * Execution API client
 * - Start/control execution
 * - Stream results
 * - Fetch history
 */
export const executionService = {
  async execute(workflow: CanvasConfig, input: unknown): Promise<ExecutionRun>;
  streamExecution(runId: string): ReadableStream<ExecutionEvent>;
  async getRunStatus(runId: string): Promise<ExecutionRun>;
  async pauseExecution(runId: string): Promise<void>;
  async resumeExecution(runId: string): Promise<void>;
  async cancelExecution(runId: string): Promise<void>;
  async skipNode(runId: string, nodeId: string): Promise<void>;
  async retryNode(runId: string, nodeId: string): Promise<void>;
  async getHistory(): Promise<ExecutionRun[]>;
};
```

##### Provider Service (src/services/providerService.ts)
```typescript
/**
 * LLM provider management
 * - Credentials
 * - Connection status
 * - Available models
 */
export const providerService = {
  async validateConnection(
    provider: ModelProvider,
    apiKey: string
  ): Promise<boolean>;
  async getConnectionStatus(provider: ModelProvider): Promise<ConnectionStatus>;
  async getAvailableModels(provider: ModelProvider): Promise<ModelProfile[]>;
  async setProviderKey(provider: ModelProvider, apiKey: string): Promise<void>;
  async getProviderKey(provider: ModelProvider): Promise<string | undefined>;
};
```

##### Safety Service (src/services/safetyService.ts)
```typescript
/**
 * Safety rules & configuration
 */
export const safetyService = {
  async getSafetyConfig(): Promise<SafetyConfig>;
  async updateSafetyConfig(config: SafetyConfig): Promise<void>;
  async validateInput(input: string): Promise<ValidationResult>;
  async validateOutput(output: string): Promise<ValidationResult>;
  async testRule(rule: SafetyRule, testInput: string): Promise<boolean>;
};
```

##### Audit Service (src/services/auditService.ts)
```typescript
/**
 * Execution audit logging
 */
export const auditService = {
  async getAuditLog(filter: AuditFilter): Promise<AuditEntry[]>;
  async exportAuditLog(format: 'json' | 'csv'): Promise<string>;
  async deleteAuditLog(runId: string): Promise<void>;
};
```

##### Export Service (src/services/exportService.ts)
```typescript
/**
 * Export workflow in various formats
 */
export const exportService = {
  async asJSON(workflow: CanvasConfig): Promise<string>;
  async asYAML(workflow: CanvasConfig): Promise<string>;
  async asPNG(workflow: CanvasConfig): Promise<Blob>;
  async downloadExecution(runId: string, format: 'json' | 'csv'): Promise<void>;
};
```

#### Hooks

##### Command Registry Hook (src/hooks/useCommands.ts)
```typescript
/**
 * Hook for registering keyboard shortcuts & commands
 */
export function useCommands() {
  const register = (shortcut: KeyBinding, handler: CommandHandler) => {
    // Register in global command registry
  };

  const unregister = (shortcut: KeyBinding) => {
    // Unregister command
  };

  return { register, unregister };
}
```

##### Canvas Drag/Drop Hook (src/hooks/useCanvasDragDrop.ts)
```typescript
/**
 * Hook for handling drag/drop on canvas
 */
export function useCanvasDragDrop() {
  const handleDragOver = (e: DragEvent) => {
    // Handle drag over canvas
  };

  const handleDrop = (e: DragEvent) => {
    // Handle drop (add node to canvas)
  };

  return { handleDragOver, handleDrop };
}
```

#### Commands System

##### Canvas Commands (src/commands/canvas.commands.ts)
```typescript
/**
 * Canvas operation commands (undo/redo compatible)
 */
export const canvasCommands = {
  createNode: (type: NodeType, position: Position) => Command;
  deleteNode: (nodeId: string) => Command;
  createEdge: (sourceId: string, targetId: string) => Command;
  deleteEdge: (edgeId: string) => Command;
  moveNode: (nodeId: string, position: Position) => Command;
  updateNodeData: (nodeId: string, data: Partial<AgentNodeData>) => Command;
};
```

##### Command Registry (src/commands/registry.ts)
```typescript
/**
 * Central command registry with undo/redo
 */
class CommandRegistry {
  execute(command: Command): void;
  undo(): void;
  redo(): void;
  hasUndo(): boolean;
  hasRedo(): boolean;
  clear(): void;
}
```

#### Theme System (src/themes/)
```typescript
/**
 * CSS custom properties for theming
 * Applied via class on <html> element
 */

// Dark theme (default)
// --bg-primary, --bg-secondary, --text-primary, --text-secondary, etc.

// Light theme
// --bg-primary: #ffffff, etc.

// Impertio theme (custom brand)
// Custom color palette reflecting brand identity
```

#### Dependencies
```json
{
  "dependencies": {
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@xyflow/react": "12.10.0",
    "@dagrejs/dagre": "2.0.4",
    "zustand": "5.0.11",
    "immer": "11.1.4",
    "tailwindcss": "4.0.0",
    "@open-agents/shared": "workspace:*"
  },
  "devDependencies": {
    "vite": "6.1.0",
    "typescript": "5.7.0",
    "@types/react": "19.0.0",
    "@types/react-dom": "19.0.0"
  }
}
```

---

### 5. @open-agents/vscode-extension
**Purpose**: VS Code extension with embedded canvas, MCP server, command palette integration
**Location**: `packages/vscode-extension/`
**Build**: tsup (CommonJS)

#### Extension Entry (src/extension.ts)
```typescript
/**
 * Main extension activation hook
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('Open-Agents extension activated');

  // Register sidebar provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('open-agents.sidebarView', new SidebarProvider(context))
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('open-agents.openCanvas', () => {
      // Open canvas webview
    }),
    vscode.commands.registerCommand('open-agents.newAgent', () => {
      // Trigger agent creation wizard
    }),
    vscode.commands.registerCommand('open-agents.startBackend', async () => {
      // Start backend server
    })
  );

  // Register status bar
  const statusBar = new StatusBarManager(context);
  statusBar.initialize();

  // Start MCP server
  const mcpServer = new MCPServer(context);
  await mcpServer.start();

  // Initialize state manager
  const stateManager = new StateManager(context);
  stateManager.initialize();
}

export function deactivate() {
  // Cleanup
}
```

#### Bridge (src/bridge.ts)
```typescript
/**
 * Bidirectional communication bridge between VS Code & Webview
 */
class VsCodeBridge {
  private webview: vscode.Webview;

  /**
   * Send message from extension to webview
   */
  async sendToWebview(message: {
    command: string;
    payload?: unknown;
  }): Promise<void>;

  /**
   * Listen for messages from webview
   */
  onMessageFromWebview(
    handler: (message: { command: string; payload?: unknown }) => void
  ): void;

  // Specific commands
  loadCanvas(workspaceId: string): Promise<CanvasConfig>;
  saveCanvas(workspaceId: string, config: CanvasConfig): Promise<void>;
  executeWorkflow(config: CanvasConfig, input: unknown): Promise<ExecutionRun>;
  updateStatus(status: string, level: 'info' | 'warn' | 'error'): void;
}
```

#### Sidebar Provider (src/sidebarProvider.ts)
```typescript
/**
 * VS Code activity bar sidebar provider
 * Shows agent explorer tree view
 */
class SidebarProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void;
}
```

#### Webview Provider (src/webviewProvider.ts)
```typescript
/**
 * Webview content provider for canvas
 */
class WebviewProvider implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(
    webviewPanel: vscode.WebviewPanel,
    state: unknown
  ): Promise<void>;
}
```

#### Webview Content (src/webviewContent.ts)
```typescript
/**
 * Generates HTML for webview
 * Embeds built React app + establishes IPC bridge
 */
export function getWebviewContent(webview: vscode.Webview): string;
```

#### State Manager (src/stateManager.ts)
```typescript
/**
 * Persistent state storage using VS Code memento
 */
class StateManager {
  constructor(context: vscode.ExtensionContext);

  get(key: string): unknown;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

#### Status Bar (src/statusBar.ts)
```typescript
/**
 * Status bar integration showing:
 * - Backend connection status
 * - Active workspace
 * - Execution status
 */
class StatusBarManager {
  constructor(context: vscode.ExtensionContext);

  initialize(): void;
  setStatus(text: string, command?: string, tooltip?: string): void;
  setConnectionStatus(status: ConnectionStatus): void;
  setExecutionStatus(status: ExecutionStatus): void;
}
```

#### MCP Server (src/mcp/server.ts)
```typescript
/**
 * Model Context Protocol server
 * Exposes Open-Agents capabilities as MCP tools
 */
class MCPServer {
  private server: Server;

  constructor(context: vscode.ExtensionContext);

  async start(): Promise<void>;
  async stop(): Promise<void>;

  /**
   * Registers MCP tools
   */
  private registerTools(): void;
}
```

#### MCP Tools (src/mcp/tools.ts)
```typescript
/**
 * MCP tool definitions
 * Tools available to Claude Desktop & other MCP clients
 */

export const tools = {
  // 1. create_agent: Create new agent from description
  // 2. list_agents: List available agents
  // 3. execute_workflow: Run a workflow
  // 4. get_execution_status: Check execution progress
  // 5. load_preset: Load preset template
  // 6. validate_workflow: Validate graph structure
};
```

#### MCP Handlers (src/mcp/handlers.ts)
```typescript
/**
 * Implementations for MCP tool calls
 */
export async function handleCreateAgent(input: CreateAgentInput): Promise<AgentDefinition>;
export async function handleListAgents(): Promise<AgentDefinition[]>;
export async function handleExecuteWorkflow(input: ExecuteInput): Promise<ExecutionRun>;
// ... other handlers
```

#### VS Code Configuration (package.json)
```json
{
  "name": "open-agents",
  "displayName": "Open-Agents",
  "description": "Visual agent orchestration platform",
  "version": "0.1.0",
  "publisher": "impertio-studio",
  "engines": { "vscode": "^1.95.0" },
  "main": "dist/extension.js",
  "activationEvents": ["onStartupFinished"],

  "contributes": {
    "commands": [
      {
        "command": "open-agents.openCanvas",
        "title": "Open Canvas",
        "icon": "$(symbol-color)"
      },
      {
        "command": "open-agents.newAgent",
        "title": "New Agent"
      },
      {
        "command": "open-agents.startBackend",
        "title": "Start Backend Server"
      }
    ],

    "viewsContainers": {
      "activitybar": [
        {
          "id": "open-agents",
          "title": "Open-Agents",
          "icon": "media/icon.svg"
        }
      ]
    },

    "views": {
      "open-agents": [
        {
          "id": "open-agents.sidebarView",
          "name": "Agent Explorer"
        }
      ]
    },

    "keybindings": [
      {
        "command": "open-agents.openCanvas",
        "key": "ctrl+shift+a",
        "mac": "cmd+shift+a"
      }
    ],

    "configuration": {
      "title": "Open-Agents",
      "properties": {
        "open-agents.apiUrl": {
          "type": "string",
          "default": "http://localhost:3001",
          "description": "Backend API URL"
        },
        "open-agents.defaultModel": {
          "type": "string",
          "default": "anthropic/claude-sonnet-4-6",
          "description": "Default LLM model"
        },
        "open-agents.theme": {
          "type": "string",
          "enum": ["impertio", "neutral", "midnight"],
          "default": "impertio",
          "description": "Canvas theme"
        }
      }
    }
  }
}
```

#### Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.12.1",
    "@open-agents/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/vscode": "1.95.0",
    "typescript": "5.7.0",
    "tsup": "8.4.0"
  }
}
```

---

### 6. @open-agents/vscode-webview
**Purpose**: React app embedded in VS Code webview
**Location**: `packages/vscode-webview/`
**Build**: Vite (outputs to `../vscode-extension/media/`)

#### Entry Point (src/main.tsx)
```typescript
/**
 * React root for webview
 * Mounts App component to DOM
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

#### App Component (src/App.tsx)
```typescript
/**
 * Webview application root
 * - Embeds canvas from frontend
 * - Bridges VS Code IPC
 * - Syncs state with extension
 */
export default function App(): React.ReactNode;
```

#### VS Code API Bridge (src/vscodeApi.ts)
```typescript
/**
 * Wrapper around acquireVsCodeApi()
 * Type-safe messaging with extension
 */
export const vscode = acquireVsCodeApi();

export function sendMessage(message: {
  command: string;
  payload?: unknown;
}): void;

export function onMessage(
  handler: (message: { command: string; payload?: unknown }) => void
): void;
```

#### Bridge Hook (src/hooks/useVsCodeBridge.ts)
```typescript
/**
 * React hook for VS Code IPC communication
 */
export function useVsCodeBridge() {
  const send = (command: string, payload?: unknown) => {
    vscode.postMessage({ command, payload });
  };

  const listen = (command: string, handler: (payload: unknown) => void) => {
    window.addEventListener('message', (event) => {
      if (event.data.command === command) {
        handler(event.data.payload);
      }
    });
  };

  return { send, listen };
}
```

#### Build Configuration (vite.config.ts)
```typescript
/**
 * Vite config for webview
 * Output: ../vscode-extension/media/webview.js + webview.css
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../vscode-extension/media',
    emptyOutDir: true,
  },
});
```

#### Dependencies
```json
{
  "dependencies": {
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@xyflow/react": "12.10.0",
    "zustand": "5.0.11",
    "tailwindcss": "4.0.0",
    "@open-agents/shared": "workspace:*"
  },
  "devDependencies": {
    "vite": "6.1.0",
    "typescript": "5.7.0"
  }
}
```

---

### 7. @open-agents/frappe-app
**Purpose**: ERPNext/Frappe application wrapper (Sprint 8)
**Location**: `packages/frappe-app/`
**Build**: Python package (no JavaScript build)

#### Hooks (open_agents/hooks.py)
```python
"""
Frappe app lifecycle hooks
"""
app_name = "open_agents"
app_version = "0.1.0"
app_title = "Open-Agents"
app_publisher = "Impertio Studio"
app_description = "Visual agent orchestration for ERPNext"
app_icon = "octicon octicon-workflow"
app_color = "#3498db"

fixtures = [
    {"dt": "DocType", "filters": [["OpenAgentsConfig", "module", "is", "Open Agents"]]}
]
```

#### Desktop Shortcuts (open_agents/config/desktop.py)
```python
"""
Desktop shortcuts for Open-Agents module
"""
def get_desk_items():
    return [
        {
            "label": "Open-Agents Canvas",
            "link": "/app/open-agents-canvas",
            "icon": "octicon octicon-workflow",
        },
        {
            "label": "Agents",
            "link": "/app/agent-config",
            "icon": "octicon octicon-tools",
        },
    ]
```

#### Agent Config DocType (open_agents/open_agents/doctype/agent_config/agent_config.json)
```json
{
  "doctype": "AgentConfig",
  "name": "Agent Configuration",
  "module": "Open Agents",
  "fields": [
    { "label": "Agent Name", "fieldname": "agent_name", "fieldtype": "Data" },
    { "label": "Description", "fieldname": "description", "fieldtype": "Text" },
    { "label": "Model", "fieldname": "model", "fieldtype": "Link", "options": "LLM Model" },
    { "label": "System Prompt", "fieldname": "system_prompt", "fieldtype": "Code", "options": "Markdown" },
    { "label": "Tools", "fieldname": "tools", "fieldtype": "Table", "options": "AgentTool" },
    { "label": "Active", "fieldname": "active", "fieldtype": "Check", "default": 1 }
  ]
}
```

#### Agent Config Class (open_agents/open_agents/doctype/agent_config/agent_config.py)
```python
"""
DocType class for AgentConfig
"""
from frappe.model.document import Document

class AgentConfig(Document):
    """Agent configuration document for ERPNext"""

    def validate(self):
        """Validate agent configuration"""
        # Validation logic

    def on_submit(self):
        """When document is submitted"""
        # Submission logic

    def before_save(self):
        """Before save"""
        # Pre-save logic
```

#### Dependencies
```
# requirements.txt
frappe>=15.0.0
erpnext>=15.0.0
```

---

## 📊 Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    @open-agents/shared                          │
│              (Core Type Definitions - No Build)                 │
└────────┬──────────────────┬──────────────┬───────────────────────┘
         │                  │              │
         │                  │              └──────────────┐
         │                  │                             │
    ┌────▼────┐        ┌────▼─────┐            ┌─────────▼──────┐
    │ frontend │        │ backend  │            │   vscode-ext   │
    │ (React)  │        │(Fastify) │            │   (Extension)  │
    └────┬────┘        └────┬─────┘            └─────────┬──────┘
         │                  │                             │
         │              ┌────▼─────────┐                  │
         │              │ @open-agents/│                  │
         │              │  knowledge   │                  │
         │              └──────────────┘         ┌────────▼──────┐
         │                                       │vscode-webview │
         └───────────────────┬───────────────────┤  (React App)  │
                             │                   └───────────────┘
                      ┌──────▼──────┐
                      │ @frappe-app │
                      │   (Python)  │
                      └─────────────┘
```

## 🔧 Build & Development

### Development Workflow
```bash
# Install dependencies
pnpm install

# Start all services in parallel
pnpm dev

# Individual starts
pnpm dev:frontend      # Vite server on :5173
pnpm dev:backend       # Fastify server on :3001
pnpm dev:ext           # Watch extension build

# Type checking
pnpm typecheck

# Testing
pnpm test
pnpm test:watch

# Building for production
pnpm build
pnpm build:ext
```

### Build Outputs
| Package | Command | Output |
|---------|---------|--------|
| frontend | `vite build` | `dist/index.html` + JS/CSS chunks |
| backend | `tsc` | `dist/server.js` + types |
| knowledge | (source) | `src/**/*.ts` (no bundling) |
| shared | (source) | `src/**/*.ts` (no bundling) |
| vscode-ext | `tsup` | `dist/extension.js` + `dist/mcp-server.js` |
| vscode-webview | `vite build` | `../vscode-extension/media/webview.js` |

---

## 📚 Documentation Generation

### Using This Document

This structure map can be used to generate comprehensive documentation:

1. **API Documentation Generator**: Use route handlers as endpoints reference
2. **Component Storybook**: Use React components list
3. **Type Documentation**: Use shared types section
4. **Architecture Diagrams**: Use dependency graph as base
5. **Plugin/Extension Guide**: Use runtime adapters section
6. **User Guides**: Use pages & components for UI walkthrough

### Key Documentation Needs

- [ ] API endpoint reference (from routes/)
- [ ] React component catalog (from components/)
- [ ] State management guide (from stores/)
- [ ] Type definitions reference (from shared/)
- [ ] Execution engine documentation (from execution-engine.ts)
- [ ] Knowledge base guide (patterns, principles, blocks)
- [ ] Multi-provider LLM integration guide
- [ ] VS Code extension integration guide
- [ ] MCP server documentation

---

**End of Project Structure Documentation**
*Generated: 2026-02-28*
