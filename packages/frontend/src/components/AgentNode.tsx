import { useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import type { AgentNodeData, ModelId, AgentTool } from "@open-agents/shared";

const models: { id: ModelId; label: string; color: string }[] = [
  { id: "anthropic/claude-haiku-4-5", label: "Haiku", color: "bg-emerald-500" },
  { id: "anthropic/claude-sonnet-4-6", label: "Sonnet", color: "bg-blue-500" },
  { id: "anthropic/claude-opus-4-6", label: "Opus", color: "bg-purple-500" },
  { id: "openai/gpt-4o", label: "GPT-4o", color: "bg-teal-500" },
  { id: "openai/o3", label: "o3", color: "bg-teal-500" },
  { id: "mistral/mistral-large", label: "Mistral L", color: "bg-orange-500" },
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
  const { setNodes } = useReactFlow();

  const updateData = useCallback(
    (patch: Partial<AgentNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
        ),
      );
    },
    [id, setNodes],
  );

  const modelMeta = models.find((m) => m.id === agentData.model) ?? models[1];

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
    <div className="bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg min-w-[240px] max-w-[300px]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-400"
      />

      {/* Header: editable name + model selector */}
      <div className="px-3 py-2 border-b border-zinc-700 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
        <input
          className="nopan nodrag bg-transparent text-white text-sm font-medium outline-none border-b border-transparent focus:border-blue-400 w-full min-w-0"
          value={agentData.name}
          onChange={(e) => updateData({ name: e.target.value })}
        />
        <select
          className="nopan nodrag ml-auto text-xs px-1.5 py-0.5 rounded text-white appearance-none cursor-pointer outline-none border-none shrink-0"
          style={{ backgroundColor: "transparent" }}
          value={agentData.model}
          onChange={(e) => updateData({ model: e.target.value as ModelId })}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id} className="bg-zinc-800">
              {m.label}
            </option>
          ))}
        </select>
        <span
          className={`text-xs px-1.5 py-0.5 rounded text-white pointer-events-none shrink-0 ${modelMeta.color}`}
        >
          {modelMeta.label}
        </span>
      </div>

      {/* System prompt textarea */}
      <div className="px-3 py-2">
        <textarea
          className="nopan nodrag w-full bg-zinc-900 text-zinc-300 text-xs leading-relaxed rounded p-2 resize-y outline-none border border-zinc-700 focus:border-blue-400 min-h-[60px]"
          rows={3}
          placeholder="System prompt..."
          value={agentData.systemPrompt}
          onChange={(e) => updateData({ systemPrompt: e.target.value })}
        />

        {/* Tool toggles */}
        <div className="flex flex-wrap gap-1 mt-2">
          {allTools.map((tool) => {
            const active = agentData.tools.includes(tool);
            return (
              <button
                key={tool}
                type="button"
                className={`nopan nodrag text-xs px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-700 text-zinc-500"
                }`}
                onClick={() => toggleTool(tool)}
              >
                {tool}
              </button>
            );
          })}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-400"
      />
    </div>
  );
}
