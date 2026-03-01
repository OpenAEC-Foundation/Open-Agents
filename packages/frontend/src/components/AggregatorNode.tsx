import { useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AggregatorNodeData, ModelId, ExecutionStatus } from "@open-agents/shared";
import { MODEL_CATALOG, getModelMeta } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";
import { STATUS_COLORS, getNodeBorderStyle } from "../constants";

export function AggregatorNode({ id, data }: NodeProps) {
  const d = data as unknown as AggregatorNodeData;
  const updateNodeData = useAppStore((s) => s.updateNodeData);
  const skillLevel = useAppStore((s) => s.skillLevel);
  const nodeStatus: ExecutionStatus = useAppStore((s) => s.nodeStatuses[id] ?? "idle");
  const setSelectedOutputNodeId = useAppStore((s) => s.setSelectedOutputNodeId);

  const updateData = useCallback(
    (patch: Partial<AggregatorNodeData>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

  const handleNodeClick = useCallback(() => {
    if (nodeStatus === "completed" || nodeStatus === "error") {
      setSelectedOutputNodeId(id);
    }
  }, [id, nodeStatus, setSelectedOutputNodeId]);

  const nodeBorderStyle = useMemo(() => getNodeBorderStyle(nodeStatus, "#0e7490"), [nodeStatus]);

  const isSynthesize = d.aggregationStrategy === "synthesize";
  const modelMeta = d.aggregationModel ? getModelMeta(d.aggregationModel) : null;

  return (
    <div
      className={`bg-surface-raised rounded-lg shadow-lg min-w-[240px] max-w-[300px] transition-shadow ${
        nodeStatus === "running" ? "node-running" : ""
      }`}
      style={nodeBorderStyle}
      onClick={handleNodeClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-cyan-500"
      />

      {/* Header */}
      <div className="px-3 py-2 border-b border-cyan-800/40 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[nodeStatus] ?? "bg-border-default"}`} />
        {nodeStatus === "completed" && (
          <span className="text-green-500 text-xs shrink-0" title="Completed">&#10003;</span>
        )}
        {nodeStatus === "error" && (
          <span className="text-red-500 text-xs shrink-0" title="Error">&#10005;</span>
        )}
        {nodeStatus === "running" && (
          <span className="text-blue-400 text-xs shrink-0 animate-spin" title="Running">&#10227;</span>
        )}
        <span className="text-cyan-400 text-xs shrink-0" title="Aggregator">&#8721;</span>
        <input
          className="nopan nodrag bg-transparent text-text-primary text-sm font-medium outline-none border-b border-transparent focus:border-border-focus w-full min-w-0"
          value={d.name}
          onChange={(e) => updateData({ name: e.target.value })}
        />
      </div>

      {/* Strategy + config */}
      <div className="px-3 py-2">
        <div className="flex gap-1 mb-2">
          <button
            type="button"
            className={`nopan nodrag text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
              !isSynthesize
                ? "bg-cyan-600 text-white"
                : "bg-surface-overlay text-text-muted"
            }`}
            onClick={() => updateData({ aggregationStrategy: "concatenate" })}
          >
            {skillLevel === "beginner" ? "Join outputs" : "Concatenate"}
          </button>
          <button
            type="button"
            className={`nopan nodrag text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
              isSynthesize
                ? "bg-cyan-600 text-white"
                : "bg-surface-overlay text-text-muted"
            }`}
            onClick={() => updateData({ aggregationStrategy: "synthesize" })}
          >
            {skillLevel === "beginner" ? "AI merge" : "Synthesize"}
          </button>
        </div>

        {isSynthesize && (
          <>
            <select
              className="nopan nodrag w-full text-xs px-1.5 py-1 rounded text-text-primary bg-surface-base outline-none border border-border-default focus:border-cyan-500/50 mb-2"
              value={d.aggregationModel ?? ""}
              onChange={(e) => updateData({ aggregationModel: (e.target.value || undefined) as ModelId | undefined })}
            >
              <option value="" className="bg-surface-raised">Select model...</option>
              {MODEL_CATALOG.map((m) => (
                <option key={m.id} value={m.id} className="bg-surface-raised">
                  {m.labels[skillLevel]}
                </option>
              ))}
            </select>

            <textarea
              className="nopan nodrag w-full bg-surface-base text-text-secondary text-xs leading-relaxed rounded p-2 resize-y outline-none border border-border-default focus:border-cyan-500/50 min-h-[40px]"
              rows={2}
              placeholder={skillLevel === "beginner" ? "How should outputs be combined?" : "Aggregation prompt..."}
              value={d.aggregationPrompt ?? ""}
              onChange={(e) => updateData({ aggregationPrompt: e.target.value || undefined })}
            />
          </>
        )}

        {modelMeta && isSynthesize && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded text-white mt-1 inline-block ${modelMeta.color}`}
          >
            {modelMeta.labels[skillLevel]}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-cyan-500"
      />
    </div>
  );
}
