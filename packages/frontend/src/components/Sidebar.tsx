import { type DragEvent, useEffect, useState } from "react";
import type { AgentNodeData, AgentPreset } from "@open-agents/shared";
import { getModelMeta } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";
import { getApiBase } from "../services/apiConfig";

// Fallback presets if backend is unavailable
const fallbackPresets: AgentPreset[] = [
  {
    id: "analyst",
    name: "Analyst",
    description: "Analyses code and identifies patterns",
    agent: {
      name: "Analyst",
      model: "anthropic/claude-sonnet-4-6",
      systemPrompt: "Analyse the codebase and identify key patterns.",
      tools: ["Read", "Glob", "Grep"],
    },
  },
  {
    id: "coder",
    name: "Coder",
    description: "Writes and edits code",
    agent: {
      name: "Coder",
      model: "anthropic/claude-sonnet-4-6",
      systemPrompt: "Write clean, well-structured code based on the given task.",
      tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    },
  },
  {
    id: "reviewer",
    name: "Reviewer",
    description: "Reviews code for quality and bugs",
    agent: {
      name: "Reviewer",
      model: "anthropic/claude-opus-4-6",
      systemPrompt:
        "Review the code for bugs, security issues, and quality improvements.",
      tools: ["Read", "Glob", "Grep"],
    },
  },
  {
    id: "writer",
    name: "Writer",
    description: "Writes documentation and reports",
    agent: {
      name: "Writer",
      model: "anthropic/claude-haiku-4-5",
      systemPrompt: "Write clear, concise documentation or reports.",
      tools: ["Read", "Write", "WebSearch"],
    },
  },
];

function onDragStart(e: DragEvent, agent: AgentNodeData) {
  e.dataTransfer.setData(
    "application/open-agents-preset",
    JSON.stringify(agent),
  );
  e.dataTransfer.effectAllowed = "move";
}

export function Sidebar() {
  const skillLevel = useAppStore((s) => s.skillLevel);
  const [presets, setPresets] = useState<AgentPreset[]>(fallbackPresets);

  useEffect(() => {
    fetch(`${getApiBase()}/presets`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AgentPreset[] | null) => {
        if (data && data.length > 0) setPresets(data);
      })
      .catch(() => {
        // Keep fallback presets
      });
  }, []);

  return (
    <aside className="w-60 bg-surface-raised border-r border-border-default flex flex-col shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-border-default">
        <h2 className="text-text-secondary text-sm font-semibold">Agent Types</h2>
        <p className="text-text-muted text-xs mt-1">
          Drag to canvas &middot; {presets.length} agents
        </p>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {presets.map((preset) => {
          const mm = getModelMeta(preset.agent.model);
          return (
            <div
              key={preset.id}
              className="bg-surface-overlay border border-border-default rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-border-focus transition-colors"
              draggable
              onDragStart={(e) => onDragStart(e, preset.agent)}
            >
              <div className="flex items-center gap-2">
                <span className="text-text-primary text-sm font-medium">
                  {preset.name}
                </span>
                <span
                  className={`ml-auto text-xs px-1.5 py-0.5 rounded text-white ${mm.color}`}
                >
                  {mm.labels[skillLevel]}
                </span>
              </div>
              <p className="text-text-tertiary text-xs mt-1">
                {preset.description}
              </p>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
