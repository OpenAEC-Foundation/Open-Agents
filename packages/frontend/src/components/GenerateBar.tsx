import { useState, useCallback, type FormEvent } from "react";
import { useAppStore } from "../stores/appStore";

export function GenerateBar() {
  const [description, setDescription] = useState("");
  const assemblyLoading = useAppStore((s) => s.assemblyLoading);
  const assemblyError = useAppStore((s) => s.assemblyError);
  const assemblyResult = useAppStore((s) => s.assemblyResult);
  const generateFromDescription = useAppStore((s) => s.generateFromDescription);
  const applyAssemblyResult = useAppStore((s) => s.applyAssemblyResult);
  const clearAssembly = useAppStore((s) => s.clearAssembly);
  const setPatternLibraryOpen = useAppStore((s) => s.setPatternLibraryOpen);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!description.trim() || assemblyLoading) return;
      generateFromDescription(description.trim());
    },
    [description, assemblyLoading, generateFromDescription],
  );

  const handleApply = useCallback(() => {
    applyAssemblyResult();
    setDescription("");
  }, [applyAssemblyResult]);

  return (
    <div className="w-full">
      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your agent team... e.g. 'A team that reviews code for quality, security and performance'"
          className="flex-1 px-4 py-2.5 bg-surface-input border border-border-default rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
          disabled={assemblyLoading}
        />
        <button
          type="submit"
          disabled={!description.trim() || assemblyLoading}
          className="px-4 py-2.5 bg-accent-primary text-text-primary rounded-lg text-sm font-medium hover:bg-accent-primary-hover disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {assemblyLoading ? "Generating..." : "Generate"}
        </button>
        <button
          type="button"
          onClick={() => setPatternLibraryOpen(true)}
          className="px-3 py-2.5 bg-surface-raised border border-border-default rounded-lg text-text-secondary text-sm hover:text-text-primary hover:border-border-focus"
          title="Browse pattern library"
        >
          Patterns
        </button>
      </form>

      {/* Error */}
      {assemblyError && (
        <div className="mt-2 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded text-red-300 text-xs">
          {assemblyError}
          <button
            onClick={clearAssembly}
            className="ml-2 text-red-400 hover:text-red-200 underline"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Result preview */}
      {assemblyResult && (
        <div className="mt-2 p-3 bg-surface-raised border border-border-default rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-primary text-sm font-medium">
              Generated: {assemblyResult.config?.nodes.length ?? 0} nodes
            </span>
            <div className="flex gap-2">
              {assemblyResult.costEstimate && (
                <span className="text-xs text-text-tertiary">
                  Est. ${assemblyResult.costEstimate.totalCostUSD.toFixed(4)}
                </span>
              )}
              <button
                onClick={handleApply}
                className="px-3 py-1 bg-accent-secondary text-surface-base rounded text-xs font-medium hover:opacity-90"
              >
                Apply to Canvas
              </button>
              <button
                onClick={clearAssembly}
                className="px-3 py-1 bg-surface-overlay border border-border-default text-text-secondary rounded text-xs hover:text-text-primary"
              >
                Discard
              </button>
            </div>
          </div>

          {/* Intent summary */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded">
              {assemblyResult.intent.taskType}
            </span>
            <span className="px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded">
              {assemblyResult.intent.complexity}
            </span>
            {assemblyResult.intent.needsParallel && (
              <span className="px-2 py-0.5 bg-amber-900/40 text-amber-300 rounded">
                parallel
              </span>
            )}
            {assemblyResult.patternMatches[0] && (
              <span className="px-2 py-0.5 bg-emerald-900/40 text-emerald-300 rounded">
                {assemblyResult.patternMatches[0].pattern.name} ({assemblyResult.patternMatches[0].score})
              </span>
            )}
          </div>

          {/* Validation warnings */}
          {assemblyResult.validation && !assemblyResult.validation.valid && (
            <div className="mt-2 text-xs text-amber-400">
              {assemblyResult.validation.errors.map((e, i) => (
                <div key={i}>Error: {e.message}</div>
              ))}
            </div>
          )}
          {assemblyResult.validation?.warnings.length ? (
            <div className="mt-1 text-xs text-text-muted">
              {assemblyResult.validation.warnings.length} warning(s)
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
