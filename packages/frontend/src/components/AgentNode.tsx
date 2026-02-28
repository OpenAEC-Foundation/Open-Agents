import { useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AgentNodeData, ModelId, AgentTool, ExecutionStatus } from "@open-agents/shared";
import { TOOL_DISPLAY } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

const statusColors: Record<ExecutionStatus, string> = {
  idle: "bg-border-default",
  running: "bg-yellow-400 animate-pulse",
  completed: "bg-green-500",
  error: "bg-red-500",
};

interface ModelMeta {
  id: ModelId;
  labels: { beginner: string; intermediate: string; advanced: string };
  color: string;
}

const models: ModelMeta[] = [
  { id: "anthropic/claude-haiku-4-5", labels: { beginner: "Fast & cheap", intermediate: "Haiku", advanced: "Haiku" }, color: "bg-emerald-500" },
  { id: "anthropic/claude-sonnet-4-6", labels: { beginner: "Balanced", intermediate: "Sonnet", advanced: "Sonnet" }, color: "bg-blue-500" },
  { id: "anthropic/claude-opus-4-6", labels: { beginner: "Most capable", intermediate: "Opus", advanced: "Opus" }, color: "bg-purple-500" },
  { id: "openai/gpt-4o", labels: { beginner: "GPT (fast)", intermediate: "GPT-4o", advanced: "GPT-4o" }, color: "bg-teal-500" },
  { id: "openai/o3", labels: { beginner: "GPT (reasoning)", intermediate: "o3", advanced: "o3" }, color: "bg-teal-500" },
  { id: "mistral/mistral-large", labels: { beginner: "Mistral (large)", intermediate: "Mistral L", advanced: "Mistral L" }, color: "bg-orange-500" },
];

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

  const updateData = useCallback(
    (patch: Partial<AgentNodeData>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

  const modelMeta = models.find((m) => m.id === agentData.model) ?? models[1];
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
    <div className="bg-surface-raised border border-border-subtle rounded-lg shadow-lg min-w-[240px] max-w-[300px]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-accent-primary"
      />

      {/* Header: editable name + model selector */}
      <div className="px-3 py-2 border-b border-border-default flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full shrink-0 ${statusColors[nodeStatus]}`} />
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
          {models.map((m) => (
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
