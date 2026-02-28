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
  ModelProvider,
} from "@open-agents/shared";
import { resolveRules } from "./safety-store.js";
import { logEntry, createRunSummary, updateRunSummary } from "./audit-store.js";

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
// Core execution loop
// ---------------------------------------------------------------------------

async function runExecution(
  config: CanvasConfig,
  run: ExecutionRun,
  signal: AbortSignal,
  resumeFromNodeId: string | null,
): Promise<void> {
  const orderedIds = topologicalSort(config.nodes, config.edges);
  const nodeMap = new Map(config.nodes.map((n) => [n.id, n]));

  // Track outputs per node for passing context along edges
  const outputs = new Map<string, string>();

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

    // Find previous output: look at inbound edges for this node
    const inboundEdges = config.edges.filter((e) => e.target === nodeId);
    let previousOutput: string | undefined;
    if (inboundEdges.length > 0) {
      const parts = inboundEdges
        .map((e) => outputs.get(e.source))
        .filter(Boolean) as string[];
      if (parts.length > 0) {
        previousOutput = parts.join("\n\n---\n\n");
      }
    }

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
        // Apply safety rules before execution (D-034)
        const effectiveRules = resolveRules(nodeId, node.data.tools);
        const safeAgent: AgentNodeData = {
          ...node.data,
          tools: effectiveRules.allowedTools,
        };

        // Resolve runtime via provider prefix (D-015)
        const runtime = getRuntimeForModel(node.data.model);
        let lastOutput = "";

        for await (const event of runtime.execute({
          nodeId,
          agent: safeAgent,
          previousOutput,
          abortSignal: signal,
        })) {
          if (signal.aborted) break;

          if (event.type === "output" && event.data) {
            lastOutput = event.data;
            emitEvent(run.id, "step:output", nodeId, event.data);
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
          agentName: node.data.name,
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
          agentName: node.data.name,
          tool: node.data.tools.join(", "),
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
