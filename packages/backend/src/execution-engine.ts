import { EventEmitter } from "node:events";
import { nanoid } from "nanoid";
import type {
  CanvasConfig,
  CanvasNode,
  CanvasEdge,
  ExecutionRun,
  SSEEvent,
  SSEEventType,
  AgentRuntime,
  AgentNodeData,
  DispatcherNodeData,
  AggregatorNodeData,
  ModelProvider,
} from "@open-agents/shared";
import { isAgentNode, isDispatcherNode, isAggregatorNode } from "@open-agents/shared";
import { resolveRules, buildSafetyPromptBlock } from "./safety-store.js";
import { logEntry, createRunSummary, updateRunSummary } from "./audit-store.js";
import { scanOutputForViolations } from "./safety-scanner.js";
import { classifyTask } from "./dispatcher-classifier.js";
import { getInstructionText } from "./instructions-store.js";

// In-memory stores
const runs = new Map<string, ExecutionRun>();
const eventBuffers = new Map<string, SSEEvent[]>();
const emitters = new Map<string, EventEmitter>();

// Sprint 3: Per-run control state
interface RunControl {
  abortController: AbortController;
  pauseRequested: boolean;
  errorDecision: { resolve: (d: "retry" | "skip" | "abort") => void } | null;
}
const runControls = new Map<string, RunControl>();
const configs = new Map<string, CanvasConfig>();

// Sprint 10: TTL-based cleanup for completed runs to prevent memory leaks.
const RUN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes
const MAX_COMPLETED_RUNS = 50; // hard cap on stored completed runs

function cleanupCompletedRuns(): void {
  const now = Date.now();
  const completedStatuses = new Set(["completed", "error", "cancelled"]);

  for (const [runId, run] of runs) {
    if (!completedStatuses.has(run.status) || !run.completedAt) continue;
    const completedAt = new Date(run.completedAt).getTime();
    if (now - completedAt > RUN_TTL_MS) {
      runs.delete(runId);
      eventBuffers.delete(runId);
      emitters.delete(runId);
      runControls.delete(runId);
      configs.delete(runId);
    }
  }

  // Hard cap: if still too many completed runs, remove oldest first
  const completedRuns = [...runs.entries()]
    .filter(([, r]) => completedStatuses.has(r.status))
    .sort((a, b) => (a[1].completedAt ?? "").localeCompare(b[1].completedAt ?? ""));

  while (completedRuns.length > MAX_COMPLETED_RUNS) {
    const [runId] = completedRuns.shift()!;
    runs.delete(runId);
    eventBuffers.delete(runId);
    emitters.delete(runId);
    runControls.delete(runId);
    configs.delete(runId);
  }
}

setInterval(cleanupCompletedRuns, CLEANUP_INTERVAL_MS);

// Runtime registry: provider → AgentRuntime
const runtimes = new Map<string, AgentRuntime>();

/** Register a runtime adapter for a provider */
export function registerRuntime(runtime: AgentRuntime): void {
  runtimes.set(runtime.provider, runtime);
}

/** Get the runtime for a model's provider (e.g. "anthropic" from "anthropic/claude-sonnet-4-6") */
function getRuntimeForModel(model: string): AgentRuntime {
  const provider = model.split("/")[0] as ModelProvider;
  const runtime = runtimes.get(provider);
  if (!runtime) {
    throw new Error(
      `No runtime registered for provider "${provider}". Available: ${[...runtimes.keys()].join(", ") || "none"}`,
    );
  }
  return runtime;
}

// ---------------------------------------------------------------------------
// Topological sort (Kahn's algorithm)
// ---------------------------------------------------------------------------

function topologicalSort(nodes: CanvasNode[], edges: CanvasEdge[]): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjacency.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // If not all nodes are sorted, there's a cycle — append remaining
  for (const id of nodeIds) {
    if (!sorted.includes(id)) sorted.push(id);
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

function emitEvent(
  runId: string,
  type: SSEEventType,
  nodeId?: string,
  data?: string,
): void {
  const event: SSEEvent = {
    type,
    runId,
    nodeId,
    data,
    timestamp: new Date().toISOString(),
  };

  const buffer = eventBuffers.get(runId);
  if (buffer) buffer.push(event);

  const emitter = emitters.get(runId);
  if (emitter) emitter.emit("event", event);
}

// ---------------------------------------------------------------------------
// Sprint 3: Error decision helper
// ---------------------------------------------------------------------------

function waitForErrorDecision(runId: string): Promise<"retry" | "skip" | "abort"> {
  return new Promise((resolve) => {
    const control = runControls.get(runId);
    if (control) control.errorDecision = { resolve };
  });
}

/** Get previous output by collecting inbound edge outputs */
function getPreviousOutput(
  nodeId: string,
  edges: CanvasEdge[],
  outputs: Map<string, string>,
): string | undefined {
  const inboundEdges = edges.filter((e) => e.target === nodeId);
  if (inboundEdges.length === 0) return undefined;
  const parts = inboundEdges
    .map((e) => outputs.get(e.source))
    .filter(Boolean) as string[];
  return parts.length > 0 ? parts.join("\n\n---\n\n") : undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startRun(config: CanvasConfig): ExecutionRun {
  const runId = nanoid();
  const abortController = new AbortController();

  const run: ExecutionRun = {
    id: runId,
    configId: config.id ?? "inline",
    status: "running",
    steps: config.nodes.map((node) => ({
      nodeId: node.id,
      status: "idle",
    })),
    startedAt: new Date().toISOString(),
  };

  runs.set(runId, run);
  eventBuffers.set(runId, []);
  emitters.set(runId, new EventEmitter());
  configs.set(runId, config);
  runControls.set(runId, {
    abortController,
    pauseRequested: false,
    errorDecision: null,
  });

  // Create audit run summary (D-035)
  createRunSummary(runId, config.id ?? "inline", config.name, config.nodes.length, run.startedAt);

  // Run execution in background (don't await)
  runExecution(config, run, abortController.signal, null).catch((err) => {
    console.error(`Run ${runId} failed:`, err);
    run.status = "error";
    run.completedAt = new Date().toISOString();
    emitEvent(runId, "run:complete", undefined, `Run failed: ${err.message}`);
  });

  return run;
}

// ---------------------------------------------------------------------------
// Sprint 3: Pause / Cancel / Resume / Error Decision
// ---------------------------------------------------------------------------

/** Request a pause — engine stops after current step */
export function pauseRun(runId: string): boolean {
  const control = runControls.get(runId);
  const run = runs.get(runId);
  if (!control || !run || run.status !== "running") return false;
  control.pauseRequested = true;
  return true;
}

/** Cancel a running or paused run immediately */
export function cancelRun(runId: string): boolean {
  const control = runControls.get(runId);
  const run = runs.get(runId);
  if (!control || !run || (run.status !== "running" && run.status !== "paused")) return false;
  run.status = "cancelled";
  run.completedAt = new Date().toISOString();
  control.abortController.abort();
  emitEvent(runId, "run:cancelled");
  return true;
}

/** Resume a paused run from the first incomplete step */
export function resumeRun(runId: string): boolean {
  const control = runControls.get(runId);
  const run = runs.get(runId);
  const config = configs.get(runId);
  if (!control || !run || !config || run.status !== "paused") return false;

  // Find first incomplete step
  const firstIncompleteId = run.steps.find((s) => s.status !== "completed")?.nodeId ?? null;

  run.status = "running";
  run.pausedAt = undefined;

  // Fresh abort controller
  const newAbortController = new AbortController();
  control.abortController = newAbortController;
  control.pauseRequested = false;

  runExecution(config, run, newAbortController.signal, firstIncompleteId).catch((err) => {
    console.error(`Run ${runId} resume failed:`, err);
    run.status = "error";
    run.completedAt = new Date().toISOString();
    emitEvent(runId, "run:complete", undefined, `Run failed: ${err.message}`);
  });

  return true;
}

/** Submit a user decision for a failed step */
export function submitErrorDecision(
  runId: string,
  decision: "retry" | "skip" | "abort",
): boolean {
  const control = runControls.get(runId);
  if (!control?.errorDecision) return false;
  control.errorDecision.resolve(decision);
  control.errorDecision = null;
  return true;
}

// ---------------------------------------------------------------------------
// Sprint 4: Dispatcher group execution (pool pattern)
// ---------------------------------------------------------------------------

/**
 * Execute a dispatcher group: classify task, run selected agents in parallel,
 * then continue to aggregator if present.
 */
async function executeDispatcherGroup(
  dispatcherNode: CanvasNode,
  config: CanvasConfig,
  run: ExecutionRun,
  outputs: Map<string, string>,
  nodeMap: Map<string, CanvasNode>,
  processedInParallel: Set<string>,
  signal: AbortSignal,
  userInstructions?: string,
): Promise<void> {
  const dispatcherData = dispatcherNode.data as DispatcherNodeData;
  const step = run.steps.find((s) => s.nodeId === dispatcherNode.id);
  if (!step) return;

  // 1. Get input from inbound edges
  const inputContext = getPreviousOutput(dispatcherNode.id, config.edges, outputs) ?? "";

  // 2. Find connected downstream agent nodes
  const outboundEdges = config.edges.filter((e) => e.source === dispatcherNode.id);
  const connectedAgents = outboundEdges
    .map((e) => nodeMap.get(e.target))
    .filter((n): n is CanvasNode => n != null && n.type === "agent");

  // 3. Mark dispatcher as running
  step.status = "running";
  step.startedAt = new Date().toISOString();
  const stepStartTime = Date.now();
  emitEvent(run.id, "step:start", dispatcherNode.id);

  try {
    // 4. Classify via LLM
    const classification = await classifyTask(
      dispatcherData,
      connectedAgents.map((a) => ({
        id: a.id,
        name: (a.data as AgentNodeData).name,
        description: (a.data as AgentNodeData).description,
      })),
      inputContext,
      getRuntimeForModel,
    );

    // 5. Mark dispatcher complete
    const elapsed = Date.now() - stepStartTime;
    step.status = "completed";
    step.output = classification.reasoning;
    step.completedAt = new Date().toISOString();
    step.elapsedMs = elapsed;
    outputs.set(dispatcherNode.id, classification.reasoning);
    emitEvent(run.id, "step:complete", dispatcherNode.id, classification.reasoning);
    emitEvent(run.id, "step:timing", dispatcherNode.id, JSON.stringify({ elapsed }));

    logEntry({
      runId: run.id,
      nodeId: dispatcherNode.id,
      agentName: dispatcherData.name,
      tool: "classifier",
      input: inputContext,
      output: classification.reasoning,
      status: "success",
      timestamp: step.startedAt,
      durationMs: elapsed,
    });

    // 6. Emit pool:start with selected agent IDs
    emitEvent(run.id, "pool:start", dispatcherNode.id, JSON.stringify(classification.selectedAgentIds));

    // 7. Execute selected agents in parallel
    const selectedNodes = classification.selectedAgentIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is CanvasNode => n != null && n.type === "agent")
      .slice(0, dispatcherData.maxParallel);

    const agentPromises = selectedNodes.map((agentNode) => {
      processedInParallel.add(agentNode.id);
      return executeAgentNodeWithTimeout(
        agentNode, run, outputs, inputContext, dispatcherData.timeoutMs, signal, userInstructions,
      );
    });

    // 8. Mark non-selected agents as skipped
    for (const agent of connectedAgents) {
      if (!classification.selectedAgentIds.includes(agent.id)) {
        processedInParallel.add(agent.id);
        const agentStep = run.steps.find((s) => s.nodeId === agent.id);
        if (agentStep) agentStep.status = "idle";
        emitEvent(run.id, "step:skipped", agent.id, "Not selected by dispatcher");
      }
    }

    // 9. Wait for all parallel agents (allSettled — failures don't block others)
    await Promise.allSettled(agentPromises);

    // 10. Emit pool:complete
    emitEvent(run.id, "pool:complete", dispatcherNode.id);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    const elapsed = Date.now() - stepStartTime;
    step.status = "error";
    step.error = errorMsg;
    step.completedAt = new Date().toISOString();
    step.elapsedMs = elapsed;
    emitEvent(run.id, "step:error", dispatcherNode.id, errorMsg);

    logEntry({
      runId: run.id,
      nodeId: dispatcherNode.id,
      agentName: dispatcherData.name,
      tool: "classifier",
      input: inputContext,
      output: errorMsg,
      status: "error",
      timestamp: step.startedAt!,
      durationMs: elapsed,
    });
  }
}

/**
 * Execute a single agent node with a timeout.
 * Used for parallel pool agents — no retry/user-decision (failures are tolerated).
 */
async function executeAgentNodeWithTimeout(
  node: CanvasNode,
  run: ExecutionRun,
  outputs: Map<string, string>,
  inputContext: string,
  timeoutMs: number,
  parentSignal: AbortSignal,
  userInstructions?: string,
): Promise<void> {
  const step = run.steps.find((s) => s.nodeId === node.id);
  if (!step) return;

  const agentData = node.data as AgentNodeData;

  step.status = "running";
  step.startedAt = new Date().toISOString();
  const stepStartTime = Date.now();
  emitEvent(run.id, "step:start", node.id);

  // Create timeout abort controller that also respects parent cancellation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = () => controller.abort();
  parentSignal.addEventListener("abort", onParentAbort, { once: true });

  try {
    // Apply safety rules (D-035)
    const effectiveRules = resolveRules(node.id, agentData.tools);

    // Build layered system prompt: user instructions + safety constraints + original
    const safetyBlock = buildSafetyPromptBlock(effectiveRules);
    let enrichedPrompt = agentData.systemPrompt;
    if (safetyBlock) {
      enrichedPrompt = `${safetyBlock}\n\n${enrichedPrompt}`;
    }
    if (userInstructions) {
      enrichedPrompt = `<user-instructions>\n${userInstructions}\n</user-instructions>\n\n${enrichedPrompt}`;
    }

    const safeAgent: AgentNodeData = { ...agentData, systemPrompt: enrichedPrompt, tools: effectiveRules.allowedTools };

    const runtime = getRuntimeForModel(agentData.model);
    let lastOutput = "";

    for await (const event of runtime.execute({
      nodeId: node.id,
      agent: safeAgent,
      previousOutput: inputContext,
      abortSignal: controller.signal,
      safetyRules: {
        bashBlacklist: effectiveRules.bashBlacklist,
        fileWhitelist: effectiveRules.fileWhitelist,
      },
    })) {
      if (controller.signal.aborted) break;

      if (event.type === "output" && event.data) {
        lastOutput = event.data;
        emitEvent(run.id, "step:output", node.id, event.data);

        // Post-hoc bash blacklist scanning (D-035)
        if (effectiveRules.bashBlacklist.length > 0) {
          const violations = scanOutputForViolations(event.data, effectiveRules.bashBlacklist);
          for (const v of violations) {
            emitEvent(run.id, "safety:violation", node.id, JSON.stringify(v));
            logEntry({
              runId: run.id,
              nodeId: node.id,
              agentName: agentData.name,
              tool: "Bash",
              input: v.match,
              output: `Blacklist violation detected: /${v.pattern}/`,
              status: "blocked",
              timestamp: new Date().toISOString(),
              durationMs: 0,
            });
          }
        }
      } else if (event.type === "error") {
        throw new Error(event.data ?? "Runtime error");
      }
    }

    const elapsed = Date.now() - stepStartTime;
    step.status = "completed";
    step.output = lastOutput;
    step.completedAt = new Date().toISOString();
    step.elapsedMs = elapsed;
    outputs.set(node.id, lastOutput);
    emitEvent(run.id, "step:complete", node.id, lastOutput);
    emitEvent(run.id, "step:timing", node.id, JSON.stringify({ elapsed }));

    logEntry({
      runId: run.id,
      nodeId: node.id,
      agentName: agentData.name,
      tool: effectiveRules.allowedTools.join(", "),
      input: inputContext,
      output: lastOutput,
      status: "success",
      timestamp: step.startedAt,
      durationMs: elapsed,
    });
  } catch (err: unknown) {
    const elapsed = Date.now() - stepStartTime;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const errorMsg = isTimeout
      ? `Agent timed out after ${timeoutMs / 1000}s`
      : err instanceof Error ? err.message : "Unknown error";

    step.status = "error";
    step.error = errorMsg;
    step.completedAt = new Date().toISOString();
    step.elapsedMs = elapsed;
    emitEvent(run.id, "step:error", node.id, errorMsg);
    emitEvent(run.id, "step:timing", node.id, JSON.stringify({ elapsed }));

    logEntry({
      runId: run.id,
      nodeId: node.id,
      agentName: agentData.name,
      tool: agentData.tools.join(", "),
      input: inputContext,
      output: errorMsg,
      status: "error",
      timestamp: step.startedAt!,
      durationMs: elapsed,
    });
  } finally {
    clearTimeout(timeoutId);
    parentSignal.removeEventListener("abort", onParentAbort);
  }
}

/**
 * Execute an aggregator node — collects outputs from inbound pool agents.
 */
async function executeAggregator(
  node: CanvasNode,
  config: CanvasConfig,
  run: ExecutionRun,
  outputs: Map<string, string>,
  nodeMap: Map<string, CanvasNode>,
  signal: AbortSignal,
): Promise<void> {
  const aggData = node.data as AggregatorNodeData;
  const step = run.steps.find((s) => s.nodeId === node.id);
  if (!step) return;

  step.status = "running";
  step.startedAt = new Date().toISOString();
  const stepStartTime = Date.now();
  emitEvent(run.id, "step:start", node.id);

  try {
    // Collect all inbound outputs
    const inboundEdges = config.edges.filter((e) => e.target === node.id);
    const inputParts: Array<{ nodeName: string; output: string }> = [];

    for (const edge of inboundEdges) {
      const sourceOutput = outputs.get(edge.source);
      if (sourceOutput) {
        const sourceNode = nodeMap.get(edge.source);
        const name = sourceNode?.data?.name ?? edge.source;
        inputParts.push({ nodeName: name as string, output: sourceOutput });
      }
    }

    let result: string;

    if (aggData.aggregationStrategy === "synthesize" && aggData.aggregationModel) {
      // LLM-based synthesis
      const synthesisPrompt = aggData.aggregationPrompt ??
        "Synthesize the following outputs from multiple agents into a single coherent result. Maintain all important findings.";

      const combinedInput = inputParts
        .map((p) => `## Output from ${p.nodeName}\n\n${p.output}`)
        .join("\n\n---\n\n");

      const runtime = getRuntimeForModel(aggData.aggregationModel);
      let synthesized = "";

      for await (const event of runtime.execute({
        nodeId: node.id,
        agent: {
          name: aggData.name,
          model: aggData.aggregationModel,
          systemPrompt: synthesisPrompt,
          tools: [],
        } as AgentNodeData,
        previousOutput: combinedInput,
        abortSignal: signal,
      })) {
        if (signal.aborted) break;
        if (event.type === "output" && event.data) {
          synthesized = event.data;
          emitEvent(run.id, "step:output", node.id, event.data);
        } else if (event.type === "error") {
          throw new Error(event.data ?? "Synthesis runtime error");
        }
      }

      result = synthesized;
    } else {
      // Simple concatenation with headers
      result = inputParts
        .map((p) => `## Output from ${p.nodeName}\n\n${p.output}`)
        .join("\n\n---\n\n");
    }

    const elapsed = Date.now() - stepStartTime;
    step.status = "completed";
    step.output = result;
    step.completedAt = new Date().toISOString();
    step.elapsedMs = elapsed;
    outputs.set(node.id, result);
    emitEvent(run.id, "step:complete", node.id, result);
    emitEvent(run.id, "step:timing", node.id, JSON.stringify({ elapsed }));

    logEntry({
      runId: run.id,
      nodeId: node.id,
      agentName: aggData.name,
      tool: aggData.aggregationStrategy,
      input: inputParts.map((p) => p.nodeName).join(", "),
      output: result.slice(0, 500),
      status: "success",
      timestamp: step.startedAt,
      durationMs: elapsed,
    });
  } catch (err: unknown) {
    const elapsed = Date.now() - stepStartTime;
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    step.status = "error";
    step.error = errorMsg;
    step.completedAt = new Date().toISOString();
    step.elapsedMs = elapsed;
    emitEvent(run.id, "step:error", node.id, errorMsg);
    emitEvent(run.id, "step:timing", node.id, JSON.stringify({ elapsed }));

    logEntry({
      runId: run.id,
      nodeId: node.id,
      agentName: aggData.name,
      tool: aggData.aggregationStrategy,
      input: "",
      output: errorMsg,
      status: "error",
      timestamp: step.startedAt!,
      durationMs: elapsed,
    });
  }
}

// ---------------------------------------------------------------------------
// Core execution loop (handles both flow and pool patterns)
// ---------------------------------------------------------------------------

async function runExecution(
  config: CanvasConfig,
  run: ExecutionRun,
  signal: AbortSignal,
  resumeFromNodeId: string | null,
): Promise<void> {
  const orderedIds = topologicalSort(config.nodes, config.edges);
  const nodeMap = new Map(config.nodes.map((n) => [n.id, n]));

  // Load user instructions once per run (D-038: injected into all agent system prompts)
  const userInstructions = await getInstructionText();

  // Track outputs per node for passing context along edges
  const outputs = new Map<string, string>();

  // Sprint 4: Track nodes already processed in a parallel pool group
  const processedInParallel = new Set<string>();

  // Pre-populate outputs from already-completed steps (for resume)
  for (const step of run.steps) {
    if (step.status === "completed" && step.output !== undefined) {
      outputs.set(step.nodeId, step.output);
    }
  }

  // Determine where to start (skip already completed nodes on resume)
  let skip = resumeFromNodeId !== null;

  for (const nodeId of orderedIds) {
    // Skip nodes before the resume point
    if (skip) {
      if (nodeId === resumeFromNodeId) {
        skip = false;
      } else {
        continue;
      }
    }

    // Skip nodes already processed in a parallel pool group
    if (processedInParallel.has(nodeId)) continue;

    // Check abort signal at step boundary
    if (signal.aborted) return;

    // Check pause request at step boundary
    const control = runControls.get(run.id);
    if (control?.pauseRequested) {
      run.status = "paused";
      run.pausedAt = new Date().toISOString();
      emitEvent(run.id, "run:paused", nodeId);
      return;
    }

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const step = run.steps.find((s) => s.nodeId === nodeId);
    if (!step) continue;

    // Sprint 4: Route based on node type
    if (isDispatcherNode(node)) {
      await executeDispatcherGroup(
        node, config, run, outputs, nodeMap, processedInParallel, signal, userInstructions,
      );
      continue;
    }

    if (isAggregatorNode(node)) {
      await executeAggregator(node, config, run, outputs, nodeMap, signal);
      continue;
    }

    // Default: sequential agent execution (existing flow pattern)
    const previousOutput = getPreviousOutput(nodeId, config.edges, outputs);

    // Retry loop for error handling
    let retryCount = 0;
    const MAX_RETRIES = 3;

    nodeLoop: while (true) {
      // Mark step as running
      step.status = "running";
      step.startedAt = new Date().toISOString();
      step.error = undefined;
      const stepStartTime = Date.now();
      emitEvent(run.id, "step:start", nodeId);

      try {
        // Apply safety rules before execution (D-035)
        const agentData = node.data as AgentNodeData;
        const effectiveRules = resolveRules(nodeId, agentData.tools);

        // Build layered system prompt: user instructions + safety constraints + original
        const safetyBlock = buildSafetyPromptBlock(effectiveRules);
        let enrichedPrompt = agentData.systemPrompt;
        if (safetyBlock) {
          enrichedPrompt = `${safetyBlock}\n\n${enrichedPrompt}`;
        }
        if (userInstructions) {
          enrichedPrompt = `<user-instructions>\n${userInstructions}\n</user-instructions>\n\n${enrichedPrompt}`;
        }

        const safeAgent: AgentNodeData = {
          ...agentData,
          systemPrompt: enrichedPrompt,
          tools: effectiveRules.allowedTools,
        };

        // Resolve runtime via provider prefix (D-015)
        const runtime = getRuntimeForModel(agentData.model);
        let lastOutput = "";

        for await (const event of runtime.execute({
          nodeId,
          agent: safeAgent,
          previousOutput,
          abortSignal: signal,
          safetyRules: {
            bashBlacklist: effectiveRules.bashBlacklist,
            fileWhitelist: effectiveRules.fileWhitelist,
          },
        })) {
          if (signal.aborted) break;

          if (event.type === "output" && event.data) {
            lastOutput = event.data;
            emitEvent(run.id, "step:output", nodeId, event.data);

            // Post-hoc bash blacklist scanning (D-035)
            if (effectiveRules.bashBlacklist.length > 0) {
              const violations = scanOutputForViolations(event.data, effectiveRules.bashBlacklist);
              for (const v of violations) {
                emitEvent(run.id, "safety:violation", nodeId, JSON.stringify(v));
                logEntry({
                  runId: run.id,
                  nodeId,
                  agentName: agentData.name,
                  tool: "Bash",
                  input: v.match,
                  output: `Blacklist violation detected: /${v.pattern}/`,
                  status: "blocked",
                  timestamp: new Date().toISOString(),
                  durationMs: 0,
                });
              }
            }
          } else if (event.type === "error") {
            throw new Error(event.data ?? "Runtime error");
          }
        }

        // Success
        const elapsed = Date.now() - stepStartTime;
        step.status = "completed";
        step.output = lastOutput;
        step.completedAt = new Date().toISOString();
        step.elapsedMs = elapsed;
        outputs.set(nodeId, lastOutput);
        emitEvent(run.id, "step:complete", nodeId, lastOutput);
        emitEvent(run.id, "step:timing", nodeId, JSON.stringify({ elapsed }));

        // Log audit entry for successful step (D-035)
        logEntry({
          runId: run.id,
          nodeId,
          agentName: agentData.name,
          tool: effectiveRules.allowedTools.join(", "),
          input: previousOutput ?? "",
          output: lastOutput,
          status: "success",
          timestamp: step.startedAt!,
          durationMs: elapsed,
        });

        break nodeLoop; // success — move to next node
      } catch (err: unknown) {
        // Handle abort gracefully
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        const agentData = node.data as AgentNodeData;
        const elapsed = Date.now() - stepStartTime;
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        step.status = "error";
        step.error = errorMsg;
        step.completedAt = new Date().toISOString();
        step.elapsedMs = elapsed;
        emitEvent(run.id, "step:error", nodeId, errorMsg);
        emitEvent(run.id, "step:timing", nodeId, JSON.stringify({ elapsed }));

        // Log audit entry for failed step (D-035)
        logEntry({
          runId: run.id,
          nodeId,
          agentName: agentData.name,
          tool: agentData.tools.join(", "),
          input: previousOutput ?? "",
          output: errorMsg,
          status: "error",
          timestamp: step.startedAt!,
          durationMs: elapsed,
        });

        // Sprint 3: Wait for user decision
        emitEvent(run.id, "run:error:awaiting-decision", nodeId, errorMsg);

        const decision = await waitForErrorDecision(run.id);

        if (decision === "abort") {
          run.status = "error";
          run.completedAt = new Date().toISOString();
          emitEvent(run.id, "run:complete", undefined, "Aborted by user");
          updateRunSummary(run.id, {
            status: run.status,
            completedAt: run.completedAt,
            totalDurationMs: new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime(),
            entryCounts: {
              success: run.steps.filter((s) => s.status === "completed").length,
              error: run.steps.filter((s) => s.status === "error").length,
              blocked: 0,
            },
          });
          return;
        } else if (decision === "skip") {
          emitEvent(run.id, "step:skipped", nodeId);
          break nodeLoop; // skip — move to next node
        } else if (decision === "retry") {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            run.status = "error";
            run.completedAt = new Date().toISOString();
            emitEvent(run.id, "run:complete", undefined, `Max retries (${MAX_RETRIES}) exceeded for node ${nodeId}`);
            return;
          }
          continue nodeLoop; // retry
        }
      }
    }
  }

  // Mark run as complete
  const hasError = run.steps.some((s) => s.status === "error");
  run.status = hasError ? "error" : "completed";
  run.completedAt = new Date().toISOString();
  emitEvent(run.id, "run:complete");

  // Update audit run summary (D-035)
  const successCount = run.steps.filter((s) => s.status === "completed").length;
  const errorCount = run.steps.filter((s) => s.status === "error").length;
  updateRunSummary(run.id, {
    status: run.status,
    completedAt: run.completedAt,
    totalDurationMs: new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime(),
    entryCounts: { success: successCount, error: errorCount, blocked: 0 },
  });
}

export function getRun(id: string): ExecutionRun | undefined {
  return runs.get(id);
}

export function getEvents(id: string): SSEEvent[] {
  return eventBuffers.get(id) ?? [];
}

export function subscribe(
  id: string,
  listener: (event: SSEEvent) => void,
): () => void {
  const emitter = emitters.get(id);
  if (!emitter) return () => {};

  emitter.on("event", listener);
  return () => {
    emitter.off("event", listener);
  };
}
