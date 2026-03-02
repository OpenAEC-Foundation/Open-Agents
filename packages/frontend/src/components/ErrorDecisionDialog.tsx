import { useAppStore } from "../stores/appStore";

export function ErrorDecisionDialog() {
  const pendingErrorNodeId = useAppStore((s) => s.pendingErrorNodeId);
  const nodeOutputs = useAppStore((s) => s.nodeOutputs);
  const submitErrorDecision = useAppStore((s) => s.submitErrorDecision);

  if (!pendingErrorNodeId) return null;

  const errorText = nodeOutputs[pendingErrorNodeId] ?? "Unknown error";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-border-default rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-text-primary font-semibold mb-2">Node Error</h3>
        <p className="text-text-muted text-sm mb-1">
          Node: <code className="text-accent-code">{pendingErrorNodeId}</code>
        </p>
        <pre className="bg-surface-base rounded p-3 text-xs text-red-400 font-mono mb-4 max-h-32 overflow-auto whitespace-pre-wrap">
          {errorText}
        </pre>
        <p className="text-text-secondary text-sm mb-4">
          How would you like to proceed?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => submitErrorDecision("retry")}
            className="flex-1 px-3 py-2 bg-accent-primary text-white rounded text-sm hover:bg-accent-primary-hover"
          >
            Retry
          </button>
          <button
            onClick={() => submitErrorDecision("skip")}
            className="flex-1 px-3 py-2 bg-surface-overlay text-text-primary rounded text-sm hover:bg-surface-base"
          >
            Skip Node
          </button>
          <button
            onClick={() => submitErrorDecision("abort")}
            className="flex-1 px-3 py-2 bg-red-700 text-white rounded text-sm hover:bg-red-600"
          >
            Abort Flow
          </button>
        </div>
      </div>
    </div>
  );
}
