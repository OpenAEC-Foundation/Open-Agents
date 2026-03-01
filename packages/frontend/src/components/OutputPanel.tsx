import { useEffect, useRef, useState, useCallback } from "react";
import type { ExecutionStatus } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const statusBadgeClasses: Record<ExecutionStatus, string> = {
  idle: "bg-zinc-600 text-zinc-300",
  running: "bg-yellow-600 text-yellow-100 animate-pulse",
  completed: "bg-green-600 text-green-100",
  error: "bg-red-600 text-red-100",
  paused: "bg-yellow-600 text-yellow-100",
  cancelled: "bg-zinc-600 text-zinc-300",
};

/** Derive a display label from a node ID (e.g. "dispatcher-3" → "Dispatcher 3") */
function nodeLabel(nodeId: string): { label: string; icon: string | null } {
  if (nodeId.startsWith("dispatcher-")) return { label: `Dispatcher ${nodeId.split("-")[1]}`, icon: "\u21C4" };
  if (nodeId.startsWith("aggregator-")) return { label: `Aggregator ${nodeId.split("-")[1]}`, icon: "\u2211" };
  return { label: nodeId, icon: null };
}

export function OutputPanel() {
  const activeRun = useAppStore((s) => s.activeRun);
  const nodeStatuses = useAppStore((s) => s.nodeStatuses);
  const nodeOutputs = useAppStore((s) => s.nodeOutputs);
  const runError = useAppStore((s) => s.runError);
  const isRunning = useAppStore((s) => s.isRunning);
  const resetExecution = useAppStore((s) => s.resetExecution);
  const stepElapsed = useAppStore((s) => s.stepElapsed);
  const selectedOutputNodeId = useAppStore((s) => s.selectedOutputNodeId);
  const setSelectedOutputNodeId = useAppStore((s) => s.setSelectedOutputNodeId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const setNodeRef = useCallback(
    (nodeId: string) => (el: HTMLDivElement | null) => {
      nodeRefs.current[nodeId] = el;
    },
    [],
  );

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [nodeOutputs]);

  // Auto-expand nodes when they start running
  useEffect(() => {
    for (const [nodeId, status] of Object.entries(nodeStatuses)) {
      if (status === "running") {
        setCollapsed((prev) => ({ ...prev, [nodeId]: false }));
      }
    }
  }, [nodeStatuses]);

  // Focus scroll when a node is selected from the canvas
  useEffect(() => {
    if (!selectedOutputNodeId) return;
    // Expand the section
    setCollapsed((prev) => ({ ...prev, [selectedOutputNodeId]: false }));
    // Scroll into view after a tick (so section expands first)
    requestAnimationFrame(() => {
      nodeRefs.current[selectedOutputNodeId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
    // Clear selection after focusing
    const timer = setTimeout(() => setSelectedOutputNodeId(null), 1500);
    return () => clearTimeout(timer);
  }, [selectedOutputNodeId, setSelectedOutputNodeId]);

  if (!activeRun) return null;

  const toggleCollapsed = (nodeId: string) => {
    setCollapsed((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface-base/95 border-t border-border-default z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default">
        <div className="flex items-center gap-2">
          <span className="text-text-primary text-sm font-medium">
            Execution Output
          </span>
          {isRunning && (
            <span className="text-xs text-yellow-400 animate-pulse">
              Running...
            </span>
          )}
        </div>
        <button
          onClick={resetExecution}
          className="text-text-tertiary hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="max-h-72 overflow-y-auto">
        {/* Global error banner */}
        {runError && (
          <div className="px-4 py-2 bg-red-900/50 border-b border-red-700 text-red-200 text-sm">
            {runError}
          </div>
        )}

        {/* Per-node sections */}
        {activeRun.steps.map((step) => {
          const status = nodeStatuses[step.nodeId] ?? "idle";
          const output = nodeOutputs[step.nodeId];
          const isCollapsed = collapsed[step.nodeId] ?? true;

          const elapsed = stepElapsed[step.nodeId];
          const isSelected = selectedOutputNodeId === step.nodeId;

          return (
            <div
              key={step.nodeId}
              ref={setNodeRef(step.nodeId)}
              className={`border-b border-border-default last:border-b-0 transition-colors ${
                isSelected ? "ring-1 ring-blue-500/40 bg-blue-950/20" : ""
              }`}
            >
              {/* Node header */}
              <button
                type="button"
                onClick={() => toggleCollapsed(step.nodeId)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-surface-overlay/50 transition-colors"
              >
                <span className="text-text-muted text-xs select-none">
                  {isCollapsed ? "\u25B6" : "\u25BC"}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${statusBadgeClasses[status]}`}
                >
                  {status}
                </span>
                {nodeLabel(step.nodeId).icon && (
                  <span className={`text-xs shrink-0 ${
                    step.nodeId.startsWith("dispatcher") ? "text-amber-400" : "text-cyan-400"
                  }`}>{nodeLabel(step.nodeId).icon}</span>
                )}
                <span className="text-text-primary text-sm font-medium truncate">
                  {nodeLabel(step.nodeId).label}
                </span>
                {elapsed !== undefined && (
                  <span className="ml-auto text-xs text-text-muted tabular-nums">
                    {formatElapsed(elapsed)}
                  </span>
                )}
              </button>

              {/* Node body */}
              {!isCollapsed && (
                <div className="px-4 pb-3">
                  {step.error ? (
                    <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap">
                      {step.error}
                    </pre>
                  ) : output ? (
                    <pre className="text-xs text-accent-code font-mono whitespace-pre-wrap">
                      {output}
                    </pre>
                  ) : (
                    <span className="text-xs text-text-muted">
                      No output yet
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
