import { useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DispatcherNodeData, ModelId, ExecutionStatus } from "@open-agents/shared";
import { MODEL_CATALOG, getModelMeta } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";
import { STATUS_COLORS } from "../constants";

export function DispatcherNode({ id, data }: NodeProps) {
  const d = data as unknown as DispatcherNodeData;
  const updateNodeData = useAppStore((s) => s.updateNodeData);
  const skillLevel = useAppStore((s) => s.skillLevel);
  const nodeStatus: ExecutionStatus = useAppStore((s) => s.nodeStatuses[id] ?? "idle");
  const setSelectedOutputNodeId = useAppStore((s) => s.setSelectedOutputNodeId);

  const updateData = useCallback(
    (patch: Partial<DispatcherNodeData>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

  const handleNodeClick = useCallback(() => {
    if (nodeStatus === "completed" || nodeStatus === "error") {
      setSelectedOutputNodeId(id);
    }
  }, [id, nodeStatus, setSelectedOutputNodeId]);

  const nodeBorderStyle = useMemo((): React.CSSProperties => ({
    boxShadow:
      nodeStatus === "running"
        ? undefined
        : nodeStatus === "completed"
          ? "0 0 0 2px #22c55e"
          : nodeStatus === "error"
            ? "0 0 0 2px #ef4444"
            : nodeStatus === "paused"
              ? "0 0 0 2px #eab308"
              : "0 0 0 1px #b45309",
  }), [nodeStatus]);

  const modelMeta = getModelMeta(d.routingModel);
  const modelLabel = modelMeta.labels[skillLevel];

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
        className="!bg-amber-500"
      />

      {/* Header */}
      <div className="px-3 py-2 border-b border-amber-800/40 flex items-center gap-2">
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
        <span className="text-amber-400 text-xs shrink-0" title="Dispatcher">&#8644;</span>
        <input
          className="nopan nodrag bg-transparent text-text-primary text-sm font-medium outline-none border-b border-transparent focus:border-border-focus w-full min-w-0"
          value={d.name}
          onChange={(e) => updateData({ name: e.target.value })}
        />
        <select
          className="nopan nodrag ml-auto text-xs px-1.5 py-0.5 rounded text-text-primary appearance-none cursor-pointer outline-none border-none shrink-0"
          style={{ backgroundColor: "transparent" }}
          value={d.routingModel}
          onChange={(e) => updateData({ routingModel: e.target.value as ModelId })}
        >
          {MODEL_CATALOG.map((m) => (
            <option key={m.id} value={m.id} className="bg-surface-raised">
              {m.labels[skillLevel]}
            </option>
          ))}
        </select>
        <span
          className={`text-xs px-1.5 py-0.5 rounded text-white pointer-events-none shrink-0 ${modelMeta.color}`}
        >
          {modelLabel}
        </span>
      </div>

      {/* Routing prompt */}
      <div className="px-3 py-2">
        <textarea
          className="nopan nodrag w-full bg-surface-base text-text-secondary text-xs leading-relaxed rounded p-2 resize-y outline-none border border-border-default focus:border-amber-500/50 min-h-[60px]"
          rows={3}
          placeholder={skillLevel === "beginner" ? "How should tasks be routed to agents?" : "Routing prompt..."}
          value={d.routingPrompt}
          onChange={(e) => updateData({ routingPrompt: e.target.value })}
        />

        {/* Config row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
          <label className="flex items-center gap-1">
            <span>Max parallel:</span>
            <input
              type="number"
              min={1}
              max={10}
              className="nopan nodrag w-10 bg-surface-base text-text-primary text-xs rounded px-1 py-0.5 outline-none border border-border-default focus:border-amber-500/50 text-center"
              value={d.maxParallel}
              onChange={(e) => updateData({ maxParallel: Math.max(1, parseInt(e.target.value) || 1) })}
            />
          </label>
          <label className="flex items-center gap-1">
            <span>Timeout:</span>
            <input
              type="number"
              min={1000}
              step={1000}
              className="nopan nodrag w-16 bg-surface-base text-text-primary text-xs rounded px-1 py-0.5 outline-none border border-border-default focus:border-amber-500/50 text-center"
              value={d.timeoutMs}
              onChange={(e) => updateData({ timeoutMs: Math.max(1000, parseInt(e.target.value) || 30000) })}
            />
            <span>ms</span>
          </label>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-amber-500"
      />
    </div>
  );
}
