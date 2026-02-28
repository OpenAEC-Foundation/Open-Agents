import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "../stores/appStore";

export function ExecutionToolbar() {
  const nodes = useAppStore((s) => s.nodes);
  const isRunning = useAppStore((s) => s.isRunning);
  const isPaused = useAppStore((s) => s.isPaused);
  const isCancelled = useAppStore((s) => s.isCancelled);
  const activeRun = useAppStore((s) => s.activeRun);
  const getCanvasConfig = useAppStore((s) => s.getCanvasConfig);
  const startExecution = useAppStore((s) => s.startExecution);
  const pauseExecution = useAppStore((s) => s.pauseExecution);
  const resumeExecution = useAppStore((s) => s.resumeExecution);
  const cancelExecution = useAppStore((s) => s.cancelExecution);
  const restartExecution = useAppStore((s) => s.restartExecution);
  const templates = useAppStore((s) => s.templates);
  const loadTemplates = useAppStore((s) => s.loadTemplates);
  const applyTemplate = useAppStore((s) => s.applyTemplate);
  const setExportedJson = useAppStore((s) => s.setExportedJson);

  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleRun = useCallback(() => {
    const config = getCanvasConfig();
    startExecution(config);
    setExportedJson(null);
  }, [getCanvasConfig, startExecution, setExportedJson]);

  const handleLoadTemplate = useCallback(
    (templateId: string) => {
      applyTemplate(templateId);
      setShowTemplates(false);
    },
    [applyTemplate],
  );

  const isIdle =
    !isRunning &&
    !isPaused &&
    !isCancelled &&
    (!activeRun || activeRun.status === "completed" || activeRun.status === "error");
  const isCompleted = activeRun?.status === "completed" || activeRun?.status === "error" || isCancelled;

  return (
    <div className="flex items-center gap-2 bg-surface-raised border border-border-default rounded-lg px-3 py-2 shadow-lg">
      {/* Idle state: Run + Load Template */}
      {isIdle && (
        <>
          <button
            onClick={handleRun}
            disabled={nodes.length === 0}
            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run
          </button>

          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1.5 bg-surface-overlay text-text-primary rounded text-sm hover:bg-surface-base"
            >
              Load Template
            </button>
            {showTemplates && templates.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-surface-raised border border-border-default rounded-lg shadow-xl z-50 min-w-[220px]">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleLoadTemplate(t.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-overlay first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="font-medium text-text-primary">{t.name}</div>
                    <div className="text-text-muted text-xs">{t.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Running state: Pause + Cancel */}
      {isRunning && !isPaused && (
        <>
          <span className="text-xs text-yellow-400 animate-pulse">Running...</span>
          <button
            onClick={pauseExecution}
            className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-500"
          >
            Pause
          </button>
          <button
            onClick={cancelExecution}
            className="px-3 py-1.5 bg-red-700 text-white rounded text-sm hover:bg-red-600"
          >
            Cancel
          </button>
        </>
      )}

      {/* Paused state: Resume + Restart + Cancel */}
      {isPaused && (
        <>
          <span className="text-xs text-yellow-400">Paused</span>
          <button
            onClick={resumeExecution}
            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-500"
          >
            Resume
          </button>
          <button
            onClick={restartExecution}
            className="px-3 py-1.5 bg-surface-overlay text-text-primary rounded text-sm hover:bg-surface-base"
          >
            Restart
          </button>
          <button
            onClick={cancelExecution}
            className="px-3 py-1.5 bg-red-700 text-white rounded text-sm hover:bg-red-600"
          >
            Cancel
          </button>
        </>
      )}

      {/* Completed/Error/Cancelled state: Restart */}
      {!isRunning && !isPaused && isCompleted && (
        <>
          <span className="text-xs text-text-muted">
            {activeRun?.status === "completed"
              ? "Completed"
              : isCancelled
                ? "Cancelled"
                : "Error"}
          </span>
          <button
            onClick={restartExecution}
            className="px-3 py-1.5 bg-surface-overlay text-text-primary rounded text-sm hover:bg-surface-base"
          >
            Restart
          </button>
        </>
      )}
    </div>
  );
}
