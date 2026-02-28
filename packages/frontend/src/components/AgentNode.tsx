import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AgentNodeData } from "@open-agents/shared";

const modelLabels: Record<string, string> = {
  "claude-haiku-4-5": "Haiku",
  "claude-sonnet-4-6": "Sonnet",
  "claude-opus-4-6": "Opus",
};

const modelColors: Record<string, string> = {
  "claude-haiku-4-5": "bg-emerald-500",
  "claude-sonnet-4-6": "bg-blue-500",
  "claude-opus-4-6": "bg-purple-500",
};

export function AgentNode({ data }: NodeProps) {
  const agentData = data as unknown as AgentNodeData;

  return (
    <div className="bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg min-w-[200px] max-w-[280px]">
      <Handle type="target" position={Position.Left} className="!bg-blue-400" />

      <div className="px-3 py-2 border-b border-zinc-700 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-zinc-500" />
        <span className="text-white text-sm font-medium">{agentData.name}</span>
        <span
          className={`ml-auto text-xs px-1.5 py-0.5 rounded text-white ${modelColors[agentData.model] ?? "bg-zinc-500"}`}
        >
          {modelLabels[agentData.model] ?? agentData.model}
        </span>
      </div>

      <div className="px-3 py-2">
        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">
          {agentData.systemPrompt}
        </p>
        {agentData.tools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {agentData.tools.map((tool) => (
              <span
                key={tool}
                className="text-xs px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded"
              >
                {tool}
              </span>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-blue-400" />
    </div>
  );
}
