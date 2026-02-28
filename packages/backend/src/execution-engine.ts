import { EventEmitter } from "node:events";
import { nanoid } from "nanoid";
import type {
  CanvasConfig,
  CanvasNode,
  CanvasEdge,
  ExecutionRun,
  SSEEvent,
  SSEEventType,
} from "@open-agents/shared";

// In-memory stores
const runs = new Map<string, ExecutionRun>();
const eventBuffers = new Map<string, SSEEvent[]>();
const emitters = new Map<string, EventEmitter>();

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
// Node execution via Claude Agent SDK
// ---------------------------------------------------------------------------

async function executeNode(
  node: CanvasNode,
  previousOutput: string | undefined,
  runId: string,
): Promise<string> {
  // Dynamic import so the module loads even if SDK is not installed
  const { query } = await import("@anthropic-ai/claude-agent-sdk");

  const prompt = previousOutput
    ? `Previous agent output:\n\n${previousOutput}\n\nNow execute your task based on the above context.`
    : "Execute your task.";

  let result = "";

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: node.data.systemPrompt,
      allowedTools: node.data.tools,
      model: node.data.model,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxTurns: 20,
    },
  })) {
    if ("result" in message) {
      result = (message as { result: string }).result;
      emitEvent(runId, "step:output", node.id, result);
    }
  }

  return result;
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
      const output = await executeNode(node, previousOutput, run.id);
      step.status = "completed";
      step.output = output;
      step.completedAt = new Date().toISOString();
      outputs.set(nodeId, output);
      emitEvent(run.id, "step:complete", nodeId, output);
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
