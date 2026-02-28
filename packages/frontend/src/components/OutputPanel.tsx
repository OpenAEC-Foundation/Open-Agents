import { useEffect, useRef, useState } from "react";
import type { ExecutionStatus } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

const statusBadgeClasses: Record<ExecutionStatus, string> = {
  idle: "bg-zinc-600 text-zinc-300",
  running: "bg-yellow-600 text-yellow-100 animate-pulse",
  completed: "bg-green-600 text-green-100",
  error: "bg-red-600 text-red-100",
};

export function OutputPanel() {
  const activeRun = useAppStore((s) => s.activeRun);
  const nodeStatuses = useAppStore((s) => s.nodeStatuses);
  const nodeOutputs = useAppStore((s) => s.nodeOutputs);
  const runError = useAppStore((s) => s.runError);
  const isRunning = useAppStore((s) => s.isRunning);
  const resetExecution = useAppStore((s) => s.resetExecution);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

          return (
            <div
              key={step.nodeId}
              className="border-b border-border-default last:border-b-0"
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
                <span className="text-text-primary text-sm font-medium truncate">
                  {step.nodeId}
                </span>
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
