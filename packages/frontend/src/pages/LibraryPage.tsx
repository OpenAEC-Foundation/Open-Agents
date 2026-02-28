import { useEffect, useState, type DragEvent } from "react";
import type { AgentDefinition, AgentNodeData, SkillLevel } from "@open-agents/shared";
import { getModelMeta } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

type LibraryTab = "agents" | "patterns" | "skills" | "connectors" | "hooks" | "rules" | "models" | "templates" | "plugins" | "workspaces";

const libraryTabs: { id: LibraryTab; label: string; available: boolean }[] = [
  { id: "agents", label: "Agents", available: true },
  { id: "patterns", label: "Patterns", available: false },
  { id: "skills", label: "Skills", available: false },
  { id: "connectors", label: "Connectors", available: false },
  { id: "hooks", label: "Hooks", available: false },
  { id: "rules", label: "Rules", available: false },
  { id: "models", label: "Models", available: false },
  { id: "templates", label: "Templates", available: false },
  { id: "plugins", label: "Plugins", available: false },
  { id: "workspaces", label: "Workspaces", available: false },
];

function onDragStart(e: DragEvent, agent: AgentDefinition) {
  const nodeData: AgentNodeData = {
    name: agent.name,
    model: agent.model,
    systemPrompt: agent.systemPrompt,
    tools: agent.tools,
    description: agent.description,
  };
  e.dataTransfer.setData(
    "application/open-agents-preset",
    JSON.stringify(nodeData),
  );
  e.dataTransfer.effectAllowed = "move";
}

export function LibraryPage() {
  const agents = useAppStore((s) => s.agents);
  const agentsLoading = useAppStore((s) => s.agentsLoading);
  const fetchAgents = useAppStore((s) => s.fetchAgents);
  const deleteAgent = useAppStore((s) => s.deleteAgent);
  const skillLevel = useAppStore((s) => s.skillLevel);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const [activeLibTab, setActiveLibTab] = useState<LibraryTab>("agents");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filteredAgents = agents.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q) ||
      a.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex min-h-0">
      {/* Library type tabs (vertical sidebar) */}
      <div className="w-44 bg-surface-raised border-r border-border-default flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border-default">
          <h2 className="text-text-secondary text-sm font-semibold">Libraries</h2>
        </div>
        {libraryTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.available && setActiveLibTab(tab.id)}
            disabled={!tab.available}
            className={`text-left px-4 py-2 text-sm transition-colors ${
              activeLibTab === tab.id
                ? "bg-accent-primary/10 text-accent-primary border-r-2 border-accent-primary"
                : tab.available
                  ? "text-text-secondary hover:bg-surface-overlay"
                  : "text-text-muted opacity-50 cursor-not-allowed"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search bar + controls */}
        <div className="px-6 py-4 border-b border-border-default flex items-center gap-4">
          <input
            type="text"
            placeholder={skillLevel === "beginner" ? "Search agents..." : "Search by name, description, category, or tag..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-md bg-surface-input text-text-primary text-sm rounded-lg px-3 py-2 outline-none border border-border-default focus:border-border-focus"
          />
          <div className="flex items-center gap-1 border border-border-default rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2 py-1 text-xs rounded-l-lg ${viewMode === "grid" ? "bg-accent-primary text-text-primary" : "text-text-muted hover:text-text-secondary"}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2 py-1 text-xs rounded-r-lg ${viewMode === "list" ? "bg-accent-primary text-text-primary" : "text-text-muted hover:text-text-secondary"}`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setActiveTab("factory")}
            className="px-3 py-1.5 bg-accent-primary text-text-primary rounded-lg text-sm hover:bg-accent-primary-hover"
          >
            + New Agent
          </button>
        </div>

        {/* Agent grid/list */}
        <div className="flex-1 overflow-y-auto p-6">
          {agentsLoading ? (
            <div className="text-text-muted text-sm text-center py-12">Loading agents...</div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-text-muted text-sm text-center py-12">
              {search ? "No agents match your search." : "No agents in the library yet. Create one in the Factory."}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  skillLevel={skillLevel}
                  onSelect={() => setSelectedAgent(agent)}
                  onDelete={() => deleteAgent(agent.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredAgents.map((agent) => (
                <AgentListRow
                  key={agent.id}
                  agent={agent}
                  skillLevel={skillLevel}
                  onSelect={() => setSelectedAgent(agent)}
                  onDelete={() => deleteAgent(agent.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedAgent && (
        <AgentDetailPanel
          agent={selectedAgent}
          skillLevel={skillLevel}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

function AgentCard({ agent, skillLevel, onSelect, onDelete }: {
  agent: AgentDefinition;
  skillLevel: SkillLevel;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const meta = getModelMeta(agent.model);
  return (
    <div
      className="bg-surface-raised border border-border-default rounded-lg p-4 hover:border-border-focus transition-colors cursor-pointer"
      onClick={onSelect}
      draggable
      onDragStart={(e) => onDragStart(e, agent)}
    >
      <div className="flex items-center gap-2">
        <span className="text-text-primary text-sm font-medium truncate">{agent.name}</span>
        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded text-white shrink-0 ${meta.color}`}>
          {meta.labels[skillLevel]}
        </span>
      </div>
      <p className="text-text-tertiary text-xs mt-2 line-clamp-2">{agent.description}</p>
      <div className="flex items-center gap-2 mt-3">
        {agent.category && (
          <span className="text-xs text-text-muted bg-surface-overlay px-1.5 py-0.5 rounded">
            {agent.category}
          </span>
        )}
        <span className="text-xs text-text-muted ml-auto">
          {agent.tools.length} tools
        </span>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function AgentListRow({ agent, skillLevel, onSelect, onDelete }: {
  agent: AgentDefinition;
  skillLevel: SkillLevel;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const meta = getModelMeta(agent.model);
  return (
    <div
      className="bg-surface-raised border border-border-default rounded-lg px-4 py-3 flex items-center gap-4 hover:border-border-focus transition-colors cursor-pointer"
      onClick={onSelect}
      draggable
      onDragStart={(e) => onDragStart(e, agent)}
    >
      <span className="text-text-primary text-sm font-medium w-40 truncate">{agent.name}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded text-white shrink-0 ${meta.color}`}>
        {meta.labels[skillLevel]}
      </span>
      <p className="text-text-tertiary text-xs flex-1 truncate">{agent.description}</p>
      <span className="text-xs text-text-muted">{agent.tools.length} tools</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-xs text-red-400 hover:text-red-300"
      >
        Delete
      </button>
    </div>
  );
}

function AgentDetailPanel({ agent, skillLevel, onClose }: {
  agent: AgentDefinition;
  skillLevel: SkillLevel;
  onClose: () => void;
}) {
  const meta = getModelMeta(agent.model);
  return (
    <div className="w-80 bg-surface-raised border-l border-border-default flex flex-col shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <h3 className="text-text-primary text-sm font-semibold truncate">{agent.name}</h3>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-lg leading-none px-1"
        >
          &times;
        </button>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <div>
          <label className="text-text-muted text-xs">Model</label>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-1.5 py-0.5 rounded text-white ${meta.color}`}>
              {meta.labels[skillLevel]}
            </span>
          </div>
        </div>
        <div>
          <label className="text-text-muted text-xs">Description</label>
          <p className="text-text-secondary text-sm mt-1">{agent.description}</p>
        </div>
        <div>
          <label className="text-text-muted text-xs">System Prompt</label>
          <pre className="text-text-secondary text-xs mt-1 bg-surface-base rounded p-2 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
            {agent.systemPrompt}
          </pre>
        </div>
        <div>
          <label className="text-text-muted text-xs">Tools</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {agent.tools.map((tool) => (
              <span key={tool} className="text-xs bg-surface-overlay text-text-secondary px-1.5 py-0.5 rounded">
                {tool}
              </span>
            ))}
          </div>
        </div>
        {agent.tags && agent.tags.length > 0 && (
          <div>
            <label className="text-text-muted text-xs">Tags</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {agent.tags.map((tag) => (
                <span key={tag} className="text-xs bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="text-text-muted text-xs mt-2">
          Created: {new Date(agent.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
