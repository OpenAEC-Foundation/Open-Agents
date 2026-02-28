import { useEffect, useState, useMemo } from "react";
import type { RoutingPattern, PatternCategory } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

const CATEGORY_LABELS: Record<PatternCategory, string> = {
  linear: "Linear",
  pyramid: "Pyramid",
  parallel: "Parallel",
  iterative: "Iterative",
  validation: "Validation",
  efficiency: "Efficiency",
  specialist: "Specialist",
};

const CATEGORY_COLORS: Record<PatternCategory, string> = {
  linear: "bg-blue-900/40 text-blue-300",
  pyramid: "bg-purple-900/40 text-purple-300",
  parallel: "bg-amber-900/40 text-amber-300",
  iterative: "bg-emerald-900/40 text-emerald-300",
  validation: "bg-red-900/40 text-red-300",
  efficiency: "bg-teal-900/40 text-teal-300",
  specialist: "bg-orange-900/40 text-orange-300",
};

export function PatternLibrary() {
  const patternLibraryOpen = useAppStore((s) => s.patternLibraryOpen);
  const setPatternLibraryOpen = useAppStore((s) => s.setPatternLibraryOpen);
  const allPatterns = useAppStore((s) => s.allPatterns);
  const patternsLoading = useAppStore((s) => s.patternsLoading);
  const fetchPatterns = useAppStore((s) => s.fetchPatterns);
  const generateFromDescription = useAppStore((s) => s.generateFromDescription);
  const assemblyLoading = useAppStore((s) => s.assemblyLoading);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<PatternCategory | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch patterns on first open
  useEffect(() => {
    if (patternLibraryOpen && allPatterns.length === 0) {
      fetchPatterns();
    }
  }, [patternLibraryOpen, allPatterns.length, fetchPatterns]);

  const filteredPatterns = useMemo(() => {
    let result = allPatterns;

    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [allPatterns, categoryFilter, search]);

  // Group by category for display
  const groupedPatterns = useMemo(() => {
    const groups = new Map<PatternCategory, RoutingPattern[]>();
    for (const p of filteredPatterns) {
      const list = groups.get(p.category) ?? [];
      list.push(p);
      groups.set(p.category, list);
    }
    return groups;
  }, [filteredPatterns]);

  if (!patternLibraryOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[800px] max-h-[80vh] bg-surface-base border border-border-default rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Pattern Library</h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              {allPatterns.length} routing patterns across {Object.keys(CATEGORY_LABELS).length} categories
            </p>
          </div>
          <button
            onClick={() => setPatternLibraryOpen(false)}
            className="text-text-tertiary hover:text-text-primary text-lg"
          >
            &times;
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-6 py-3 border-b border-border-subtle">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patterns..."
            className="flex-1 px-3 py-1.5 bg-surface-input border border-border-default rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as PatternCategory | "all")}
            className="px-3 py-1.5 bg-surface-input border border-border-default rounded text-sm text-text-primary"
          >
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Pattern list */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {patternsLoading ? (
            <div className="text-center text-text-muted py-8">Loading patterns...</div>
          ) : filteredPatterns.length === 0 ? (
            <div className="text-center text-text-muted py-8">No patterns found</div>
          ) : (
            [...groupedPatterns.entries()].map(([category, patterns]) => (
              <div key={category} className="mb-4">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  {CATEGORY_LABELS[category]} ({patterns.length})
                </h3>
                <div className="space-y-2">
                  {patterns.map((pattern) => (
                    <PatternCard
                      key={pattern.id}
                      pattern={pattern}
                      expanded={expandedId === pattern.id}
                      onToggle={() => setExpandedId(expandedId === pattern.id ? null : pattern.id)}
                      onUse={() => {
                        setPatternLibraryOpen(false);
                        // Generate using this specific pattern
                        const desc = prompt("Describe your agent team for this pattern:");
                        if (desc) {
                          generateFromDescription(desc, pattern.id);
                        }
                      }}
                      generating={assemblyLoading}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PatternCard({
  pattern,
  expanded,
  onToggle,
  onUse,
  generating,
}: {
  pattern: RoutingPattern;
  expanded: boolean;
  onToggle: () => void;
  onUse: () => void;
  generating: boolean;
}) {
  return (
    <div className="bg-surface-raised border border-border-subtle rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-overlay/50"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{pattern.name}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${CATEGORY_COLORS[pattern.category]}`}>
              {pattern.category}
            </span>
          </div>
          <p className="text-xs text-text-tertiary mt-0.5 truncate">{pattern.description.slice(0, 120)}...</p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <span className="text-[10px] text-text-muted">
            {pattern.minNodes}-{pattern.maxNodes} nodes
          </span>
          <span className="text-text-muted text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border-subtle">
          {/* Diagram */}
          <pre className="mt-3 p-3 bg-surface-base rounded text-[11px] text-accent-code font-mono overflow-x-auto">
            {pattern.diagram}
          </pre>

          {/* When to use */}
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-text-secondary mb-1">When to Use</h4>
            <p className="text-xs text-text-tertiary">{pattern.whenToUse}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-3">
            {pattern.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-surface-overlay text-text-muted rounded text-[10px]">
                {tag}
              </span>
            ))}
          </div>

          {/* Node templates */}
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-text-secondary mb-1">
              Node Templates ({pattern.nodeTemplates.length})
            </h4>
            <div className="space-y-1">
              {pattern.nodeTemplates.map((nt, i) => (
                <div key={i} className="text-xs text-text-tertiary">
                  <span className="text-text-secondary">{nt.role}</span>
                  {" — "}
                  <span className="text-text-muted">{nt.modelHint}</span>
                  {nt.tools.length > 0 && (
                    <span className="text-text-muted"> [{nt.tools.join(", ")}]</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cost info */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
            <div className="text-[10px] text-text-muted">
              Cost multiplier: {pattern.tokenProfile.costMultiplier}x
              {" | "}
              ~{pattern.tokenProfile.avgInputPerNode} in / ~{pattern.tokenProfile.avgOutputPerNode} out tokens per node
            </div>
            <button
              onClick={onUse}
              disabled={generating}
              className="px-3 py-1.5 bg-accent-primary text-text-primary rounded text-xs font-medium hover:bg-accent-primary-hover disabled:opacity-40"
            >
              {generating ? "Generating..." : "Use Pattern"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
