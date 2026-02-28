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
  ModelProvider,
} from "@open-agents/shared";

// In-memory stores
const runs = new Map<string, ExecutionRun>();
const eventBuffers = new Map<string, SSEEvent[]>();
const emitters = new Map<string, EventEmitter>();

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
// Public API
// ---------------------------------------------------------------------------

export function startRun(config: CanvasConfig): ExecutionRun {
  const runId = nanoid();

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

  // Run execution in background (don't await)
  runExecution(config, run).catch((err) => {
    console.error(`Run ${runId} failed:`, err);
    run.status = "error";
    run.completedAt = new Date().toISOString();
    emitEvent(runId, "run:complete", undefined, `Run failed: ${err.message}`);
  });

  return run;
}

async function runExecution(
  config: CanvasConfig,
  run: ExecutionRun,
): Promise<void> {
  const orderedIds = topologicalSort(config.nodes, config.edges);
  const nodeMap = new Map(config.nodes.map((n) => [n.id, n]));

  // Track outputs per node for passing context along edges
  const outputs = new Map<string, string>();

  for (const nodeId of orderedIds) {
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

    // Mark step as running
    step.status = "running";
    step.startedAt = new Date().toISOString();
    emitEvent(run.id, "step:start", nodeId);

    try {
      // Resolve runtime via provider prefix (D-015)
      const runtime = getRuntimeForModel(node.data.model);
      let lastOutput = "";

      for await (const event of runtime.execute({
        nodeId,
        agent: node.data,
        previousOutput,
      })) {
        if (event.type === "output" && event.data) {
          lastOutput = event.data;
          emitEvent(run.id, "step:output", nodeId, event.data);
        } else if (event.type === "error") {
          throw new Error(event.data ?? "Runtime error");
        }
      }

      step.status = "completed";
      step.output = lastOutput;
      step.completedAt = new Date().toISOString();
      outputs.set(nodeId, lastOutput);
      emitEvent(run.id, "step:complete", nodeId, lastOutput);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error";
      step.status = "error";
      step.error = errorMsg;
      step.completedAt = new Date().toISOString();
      emitEvent(run.id, "step:error", nodeId, errorMsg);
      // Continue with remaining nodes despite error
    }
  }

  // Mark run as complete
  const hasError = run.steps.some((s) => s.status === "error");
  run.status = hasError ? "error" : "completed";
  run.completedAt = new Date().toISOString();
  emitEvent(run.id, "run:complete");
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
