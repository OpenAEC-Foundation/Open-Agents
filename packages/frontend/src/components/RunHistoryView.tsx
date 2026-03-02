import { useEffect, useState, useCallback, useMemo } from "react";
import type {
  ExecutionStatus,
  AuditEntry,
  AuditStatus,
  AgentTool,
  RunSummary,
} from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";
import { ReplayControls } from "./ReplayControls";

// --------------- Status badge helpers ---------------

const statusBadgeColors: Record<ExecutionStatus, string> = {
  idle: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  running: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
};

const auditStatusColors: Record<AuditStatus, string> = {
  success: "bg-green-500/20 text-green-400 border-green-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  blocked: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const ALL_TOOLS: AgentTool[] = [
  "Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebSearch", "WebFetch",
];

const ALL_AUDIT_STATUSES: AuditStatus[] = ["success", "error", "blocked"];

// --------------- Relative time helper ---------------

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms === null) return "--";
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function formatTimestamp(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

// --------------- Component ---------------

export function RunHistoryView() {
  const runs = useAppStore((s) => s.runs);
  const runsLoading = useAppStore((s) => s.runsLoading);
  const selectedRunId = useAppStore((s) => s.selectedRunId);
  const auditEntries = useAppStore((s) => s.auditEntries);
  const auditFilter = useAppStore((s) => s.auditFilter);
  const isReplaying = useAppStore((s) => s.isReplaying);
  const fetchRuns = useAppStore((s) => s.fetchRuns);
  const selectRun = useAppStore((s) => s.selectRun);
  const setAuditFilter = useAppStore((s) => s.setAuditFilter);
  const startReplay = useAppStore((s) => s.startReplay);

  // --------------- Filter local state ---------------
  const [filterAgent, setFilterAgent] = useState("");
  const [filterTool, setFilterTool] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // --------------- Expandable entries ---------------
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // --------------- Fetch runs on mount ---------------
  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // --------------- Apply filter changes ---------------
  useEffect(() => {
    setAuditFilter({
      ...auditFilter,
      agentName: filterAgent || undefined,
      tool: filterTool || undefined,
      status: (filterStatus as AuditStatus) || undefined,
    });
    // We only want to react to filter changes, not auditFilter itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAgent, filterTool, filterStatus, setAuditFilter]);

  const clearFilters = useCallback(() => {
    setFilterAgent("");
    setFilterTool("");
    setFilterStatus("");
  }, []);

  const toggleEntry = useCallback((entryId: string) => {
    setExpandedEntryId((prev) => (prev === entryId ? null : entryId));
  }, []);

  // --------------- Selected run details ---------------
  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  // --------------- Filtered entries ---------------
  const filteredEntries = useMemo(() => {
    return auditEntries.filter((entry) => {
      if (filterAgent && !entry.agentName.toLowerCase().includes(filterAgent.toLowerCase())) {
        return false;
      }
      if (filterTool && entry.tool !== filterTool) return false;
      if (filterStatus && entry.status !== filterStatus) return false;
      return true;
    });
  }, [auditEntries, filterAgent, filterTool, filterStatus]);

  const hasActiveFilters = filterAgent !== "" || filterTool !== "" || filterStatus !== "";

  return (
    <div className="h-full flex bg-surface-base">
      {/* ====== Left: Run List ====== */}
      <div className="w-80 border-r border-border-default overflow-y-auto p-4 flex-shrink-0">
        <h2 className="text-text-primary text-lg font-semibold mb-1">Run History</h2>
        <p className="text-text-muted text-xs mb-4">
          {runs.length} run{runs.length !== 1 ? "s" : ""}
        </p>

        {runsLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-text-muted text-sm">Loading runs...</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-text-muted text-sm">No runs yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <RunListItem
                key={run.id}
                run={run}
                isSelected={run.id === selectedRunId}
                onSelect={() => selectRun(run.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ====== Right: Run Detail ====== */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {selectedRun ? (
          <div className="p-6 flex-1 flex flex-col">
            {/* Run Detail Header */}
            <div className="flex items-center gap-4 mb-2">
              <h3 className="text-text-primary text-lg font-semibold">
                {selectedRun.configName ?? selectedRun.configId}
              </h3>
              <StatusBadge status={selectedRun.status} />
              <button
                type="button"
                onClick={() => startReplay(selectedRun.id)}
                className="ml-auto px-3 py-1.5 bg-surface-overlay hover:bg-surface-base text-text-secondary text-xs rounded border border-border-default transition-colors"
              >
                Replay
              </button>
            </div>

            <div className="flex gap-4 text-xs text-text-muted mb-4">
              <span>ID: <span className="text-accent-code font-mono">{selectedRun.id}</span></span>
              <span>Started: {relativeTime(selectedRun.startedAt)}</span>
              {selectedRun.totalDurationMs !== undefined && (
                <span>Duration: {formatDuration(selectedRun.totalDurationMs)}</span>
              )}
              <span>Nodes: {selectedRun.nodeCount}</span>
              {selectedRun.entryCounts && (
                <span>
                  {selectedRun.entryCounts.success} ok / {selectedRun.entryCounts.error} err / {selectedRun.entryCounts.blocked} blocked
                </span>
              )}
            </div>

            {/* Filter Bar */}
            <div className="flex gap-2 my-4 items-end">
              <div>
                <label className="block text-text-muted text-xs mb-1">Agent</label>
                <input
                  type="text"
                  className="bg-surface-base text-text-primary text-xs rounded px-2 py-1.5 outline-none border border-border-default focus:border-border-focus w-36"
                  placeholder="Filter by name..."
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-text-muted text-xs mb-1">Tool</label>
                <select
                  className="bg-surface-base text-text-primary text-xs rounded px-2 py-1.5 outline-none border border-border-default focus:border-border-focus"
                  value={filterTool}
                  onChange={(e) => setFilterTool(e.target.value)}
                >
                  <option value="">All tools</option>
                  {ALL_TOOLS.map((tool) => (
                    <option key={tool} value={tool}>{tool}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-text-muted text-xs mb-1">Status</label>
                <select
                  className="bg-surface-base text-text-primary text-xs rounded px-2 py-1.5 outline-none border border-border-default focus:border-border-focus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {ALL_AUDIT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-2 py-1.5 text-text-muted hover:text-text-secondary text-xs transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Audit Timeline */}
            <div className="space-y-2 flex-1">
              {filteredEntries.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-text-muted text-sm">
                  {hasActiveFilters ? "No entries match the current filters." : "No audit entries for this run."}
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <AuditEntryRow
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedEntryId === entry.id}
                    onToggle={() => toggleEntry(entry.id)}
                  />
                ))
              )}
            </div>

            {/* Replay Controls */}
            {isReplaying && <ReplayControls />}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-text-muted text-sm">Select a run to view details</p>
              <p className="text-text-tertiary text-xs mt-1">
                Choose a run from the list on the left to inspect its audit trail.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --------------- Sub-components ---------------

function RunListItem({
  run,
  isSelected,
  onSelect,
}: {
  run: RunSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg p-3 border transition-colors ${
        isSelected
          ? "bg-surface-overlay border-border-focus"
          : "bg-surface-raised border-border-default hover:border-border-focus"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <StatusBadge status={run.status} />
        <span className="text-text-primary text-sm font-medium truncate">
          {run.configName ?? run.id.slice(0, 8)}
        </span>
      </div>
      <div className="flex gap-3 text-xs text-text-muted">
        <span>{relativeTime(run.startedAt)}</span>
        <span>{run.nodeCount} node{run.nodeCount !== 1 ? "s" : ""}</span>
        {run.totalDurationMs !== undefined && (
          <span>{formatDuration(run.totalDurationMs)}</span>
        )}
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: ExecutionStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
        statusBadgeColors[status] ?? statusBadgeColors.idle
      }`}
    >
      {status}
    </span>
  );
}

function AuditEntryRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: AuditEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-lg border transition-colors ${
        isExpanded
          ? "bg-surface-overlay border-border-focus"
          : "bg-surface-raised border-border-default hover:border-border-focus"
      }`}
    >
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 flex items-center gap-3"
      >
        <span className="text-text-muted text-xs font-mono w-16 shrink-0">
          {formatTimestamp(entry.timestamp)}
        </span>
        <span className="text-text-primary text-sm truncate w-28 shrink-0">
          {entry.agentName}
        </span>
        <span className="text-accent-code text-xs font-mono w-20 shrink-0">
          {entry.tool}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${
            auditStatusColors[entry.status] ?? auditStatusColors.success
          }`}
        >
          {entry.status}
        </span>
        <span className="text-text-muted text-xs ml-auto shrink-0">
          {formatDuration(entry.durationMs)}
        </span>
        <span className="text-text-tertiary text-xs shrink-0">
          {isExpanded ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border-default">
          <div className="mt-2">
            <p className="text-text-muted text-xs font-medium mb-1">Input</p>
            <pre className="bg-surface-base text-text-secondary text-xs font-mono p-2 rounded overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
              {entry.input || "(empty)"}
            </pre>
          </div>
          <div className="mt-2">
            <p className="text-text-muted text-xs font-medium mb-1">Output</p>
            <pre className="bg-surface-base text-text-secondary text-xs font-mono p-2 rounded overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
              {entry.output || "(empty)"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
