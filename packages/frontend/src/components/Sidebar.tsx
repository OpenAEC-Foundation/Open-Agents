import type { DragEvent } from "react";
import type { AgentNodeData } from "@open-agents/shared";

interface AgentPreset {
  label: string;
  description: string;
  data: AgentNodeData;
}

const modelMeta: Record<string, { label: string; color: string }> = {
  "anthropic/claude-haiku-4-5": { label: "Haiku", color: "bg-emerald-500" },
  "anthropic/claude-sonnet-4-6": { label: "Sonnet", color: "bg-blue-500" },
  "anthropic/claude-opus-4-6": { label: "Opus", color: "bg-purple-500" },
  "openai/gpt-4o": { label: "GPT-4o", color: "bg-teal-500" },
  "openai/o3": { label: "o3", color: "bg-teal-500" },
  "mistral/mistral-large": { label: "Mistral L", color: "bg-orange-500" },
};

function getModelMeta(id: string) {
  return modelMeta[id] ?? { label: id.split("/").pop() ?? id, color: "bg-zinc-500" };
}

const presets: AgentPreset[] = [
  {
    label: "Analyst",
    description: "Analyses code and identifies patterns",
    data: {
      name: "Analyst",
      model: "anthropic/claude-sonnet-4-6",
      systemPrompt: "Analyse the codebase and identify key patterns.",
      tools: ["Read", "Glob", "Grep"],
    },
  },
  {
    label: "Coder",
    description: "Writes and edits code",
    data: {
      name: "Coder",
      model: "anthropic/claude-sonnet-4-6",
      systemPrompt: "Write clean, well-structured code based on the given task.",
      tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    },
  },
  {
    label: "Reviewer",
    description: "Reviews code for quality and bugs",
    data: {
      name: "Reviewer",
      model: "anthropic/claude-opus-4-6",
      systemPrompt:
        "Review the code for bugs, security issues, and quality improvements.",
      tools: ["Read", "Glob", "Grep"],
    },
  },
  {
    label: "Writer",
    description: "Writes documentation and reports",
    data: {
      name: "Writer",
      model: "anthropic/claude-haiku-4-5",
      systemPrompt: "Write clear, concise documentation or reports.",
      tools: ["Read", "Write", "WebSearch"],
    },
  },
];

function onDragStart(e: DragEvent, preset: AgentPreset) {
  e.dataTransfer.setData(
    "application/open-agents-preset",
    JSON.stringify(preset.data),
  );
  e.dataTransfer.effectAllowed = "move";
}

export function Sidebar() {
  return (
    <aside className="w-60 bg-zinc-900 border-r border-zinc-700 flex flex-col shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-zinc-700">
        <h2 className="text-zinc-300 text-sm font-semibold">Agent Types</h2>
        <p className="text-zinc-500 text-xs mt-1">Drag to canvas</p>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {presets.map((preset) => (
          <div
            key={preset.label}
            className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-zinc-500 transition-colors"
            draggable
            onDragStart={(e) => onDragStart(e, preset)}
          >
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">
                {preset.label}
              </span>
              <span
                className={`ml-auto text-xs px-1.5 py-0.5 rounded text-white ${getModelMeta(preset.data.model).color}`}
              >
                {getModelMeta(preset.data.model).label}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">{preset.description}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
