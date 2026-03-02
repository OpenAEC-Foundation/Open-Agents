import { useMemo } from "react";
import type { SSEEvent } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

export function ReplayControls() {
  const replayEvents = useAppStore((s) => s.replayEvents);
  const replayIndex = useAppStore((s) => s.replayIndex);
  const stepReplay = useAppStore((s) => s.stepReplay);
  const stopReplay = useAppStore((s) => s.stopReplay);

  const currentEvent: SSEEvent | undefined = useMemo(
    () => replayEvents[replayIndex],
    [replayEvents, replayIndex],
  );

  const isAtEnd = replayIndex >= replayEvents.length - 1;
  const isAtStart = replayIndex <= 0;

  return (
    <div className="sticky bottom-0 bg-surface-raised border-t border-border-default p-3 flex items-center gap-4">
      {/* Previous (disabled — stepping backward is not supported) */}
      <button
        type="button"
        disabled={isAtStart}
        className="px-3 py-1.5 bg-surface-overlay text-text-secondary text-xs rounded border border-border-default transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-surface-base"
        title="Previous step is not available"
      >
        Previous
      </button>

      {/* Step counter */}
      <span className="text-text-secondary text-sm font-mono">
        Step {replayIndex + 1} of {replayEvents.length}
      </span>

      {/* Next */}
      <button
        type="button"
        onClick={stepReplay}
        disabled={isAtEnd}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>

      {/* Stop */}
      <button
        type="button"
        onClick={stopReplay}
        className="px-3 py-1.5 bg-surface-overlay hover:bg-red-600/20 text-red-400 text-xs rounded border border-border-default transition-colors"
      >
        Stop
      </button>

      {/* Current event display */}
      {currentEvent && (
        <div className="ml-4 text-xs text-text-secondary truncate">
          <span className="text-accent-code font-mono">{currentEvent.type}</span>
          <span className="text-text-muted mx-1.5">&mdash;</span>
          <span className="text-text-secondary">{currentEvent.nodeId ?? "run"}</span>
          <span className="text-text-muted mx-1.5">&mdash;</span>
          <span className="text-text-muted">{currentEvent.timestamp}</span>
        </div>
      )}
    </div>
  );
}
