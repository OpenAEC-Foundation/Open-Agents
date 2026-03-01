import { useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AgentNodeData, ModelId, AgentTool, ExecutionStatus } from "@open-agents/shared";
import { TOOL_DISPLAY, MODEL_CATALOG, getModelMeta } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";
import { STATUS_COLORS, getNodeBorderStyle } from "../constants";

const allTools: AgentTool[] = [
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
];

export function AgentNode({ id, data }: NodeProps) {
  const agentData = data as unknown as AgentNodeData;
  const updateNodeData = useAppStore((s) => s.updateNodeData);
  const skillLevel = useAppStore((s) => s.skillLevel);
  const nodeStatus: ExecutionStatus = useAppStore((s) => s.nodeStatuses[id] ?? "idle");
  const setSelectedOutputNodeId = useAppStore((s) => s.setSelectedOutputNodeId);

  const updateData = useCallback(
    (patch: Partial<AgentNodeData>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

  const handleNodeClick = useCallback(() => {
    if (nodeStatus === "completed" || nodeStatus === "error") {
      setSelectedOutputNodeId(id);
    }
  }, [id, nodeStatus, setSelectedOutputNodeId]);

  const nodeBorderStyle = useMemo(() => getNodeBorderStyle(nodeStatus, "#333333"), [nodeStatus]);

  const modelMeta = getModelMeta(agentData.model);
  const modelLabel = modelMeta.labels[skillLevel];

  const toggleTool = useCallback(
    (tool: AgentTool) => {
      const current = agentData.tools;
      const next = current.includes(tool)
        ? current.filter((t) => t !== tool)
        : [...current, tool];
      updateData({ tools: next });
    },
    [agentData.tools, updateData],
  );

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
        className="!bg-accent-primary"
      />

      {/* Header: editable name + model selector */}
      <div className="px-3 py-2 border-b border-border-default flex items-center gap-2">
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
        <input
          className="nopan nodrag bg-transparent text-text-primary text-sm font-medium outline-none border-b border-transparent focus:border-border-focus w-full min-w-0"
          value={agentData.name}
          onChange={(e) => updateData({ name: e.target.value })}
        />
        <select
          className="nopan nodrag ml-auto text-xs px-1.5 py-0.5 rounded text-text-primary appearance-none cursor-pointer outline-none border-none shrink-0"
          style={{ backgroundColor: "transparent" }}
          value={agentData.model}
          onChange={(e) => updateData({ model: e.target.value as ModelId })}
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

      {/* System prompt textarea */}
      <div className="px-3 py-2">
        <textarea
          className="nopan nodrag w-full bg-surface-base text-text-secondary text-xs leading-relaxed rounded p-2 resize-y outline-none border border-border-default focus:border-border-focus min-h-[60px]"
          rows={3}
          placeholder={skillLevel === "beginner" ? "What should this agent do?" : "System prompt..."}
          value={agentData.systemPrompt}
          onChange={(e) => updateData({ systemPrompt: e.target.value })}
        />

        {/* Tool toggles */}
        <div className="flex flex-wrap gap-1 mt-2">
          {allTools.map((tool) => {
            const active = agentData.tools.includes(tool);
            const display = TOOL_DISPLAY[skillLevel][tool];
            return (
              <button
                key={tool}
                type="button"
                title={display.tooltip}
                className={`nopan nodrag text-xs px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  active
                    ? "bg-accent-primary text-text-primary"
                    : "bg-surface-overlay text-text-muted"
                }`}
                onClick={() => toggleTool(tool)}
              >
                {display.label}
              </button>
            );
          })}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-accent-primary"
      />
    </div>
  );
}
