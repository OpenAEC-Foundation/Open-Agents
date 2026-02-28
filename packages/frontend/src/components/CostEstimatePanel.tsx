import { useAppStore } from "../stores/appStore";

export function CostEstimatePanel() {
  const assemblyResult = useAppStore((s) => s.assemblyResult);

  if (!assemblyResult?.costEstimate) return null;

  const { totalInputTokens, totalOutputTokens, totalCostUSD, breakdown } =
    assemblyResult.costEstimate;

  return (
    <div className="p-3 bg-surface-raised border border-border-default rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-text-primary">Cost Estimate</h3>
        <span className="text-sm font-semibold text-accent-primary">
          ${totalCostUSD.toFixed(4)}
        </span>
      </div>

      {/* Token totals */}
      <div className="flex gap-4 text-xs text-text-tertiary mb-3">
        <span>{totalInputTokens.toLocaleString()} input tokens</span>
        <span>{totalOutputTokens.toLocaleString()} output tokens</span>
      </div>

      {/* Per-node breakdown */}
      <div className="space-y-1.5">
        {breakdown.map((node) => (
          <div
            key={node.nodeId}
            className="flex items-center justify-between text-xs py-1 px-2 bg-surface-base rounded"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-text-primary truncate">{node.nodeName}</span>
              <span className="text-text-muted shrink-0">
                {node.model.split("/")[1]}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-text-muted">
                {node.estimatedInputTokens.toLocaleString()} in
              </span>
              <span className="text-text-muted">
                {node.estimatedOutputTokens.toLocaleString()} out
              </span>
              <span className="text-text-secondary font-medium w-16 text-right">
                ${node.costUSD.toFixed(4)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
