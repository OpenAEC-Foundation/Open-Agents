import { useState, useCallback } from "react";
import type { AgentTool, SkillLevel } from "@open-agents/shared";
import { MODEL_CATALOG, TOOL_DISPLAY, getModelMeta } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

const allTools: AgentTool[] = [
  "Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebSearch", "WebFetch",
];

const examplePrompts = [
  "An agent that reviews pull requests for security issues",
  "A code documentation generator that writes JSDoc comments",
  "An agent that finds and fixes TypeScript type errors",
  "A research agent that searches the web and summarizes findings",
];

export function GeneratePanel() {
  const generatorLoading = useAppStore((s) => s.generatorLoading);
  const generatorDraft = useAppStore((s) => s.generatorDraft);
  const generatorError = useAppStore((s) => s.generatorError);
  const generateAgent = useAppStore((s) => s.generateAgent);
  const refineAgent = useAppStore((s) => s.refineAgent);
  const updateGeneratorDraft = useAppStore((s) => s.updateGeneratorDraft);
  const acceptGeneratorDraft = useAppStore((s) => s.acceptGeneratorDraft);
  const closeGenerator = useAppStore((s) => s.closeGenerator);
  const skillLevel = useAppStore((s) => s.skillLevel);

  const [prompt, setPrompt] = useState("");
  const [refinePrompt, setRefinePrompt] = useState("");

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || generatorLoading) return;
    generateAgent(prompt.trim());
  }, [prompt, generatorLoading, generateAgent]);

  const handleRefine = useCallback(() => {
    if (!refinePrompt.trim() || generatorLoading) return;
    refineAgent(refinePrompt.trim());
    setRefinePrompt("");
  }, [refinePrompt, generatorLoading, refineAgent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: () => void) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        action();
      }
    },
    [],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-12 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-text-primary text-2xl font-semibold">
              {skillLevel === "beginner" ? "Describe your agent" : "AI Agent Generator"}
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              {skillLevel === "beginner"
                ? "Tell us what you need and we'll create an agent for you."
                : "Describe the agent you need. The LLM generates a complete definition."}
            </p>
          </div>
          <button
            onClick={closeGenerator}
            className="text-text-muted hover:text-text-primary text-sm"
          >
            Back
          </button>
        </div>

        {/* Input area */}
        {!generatorDraft && (
          <div className="bg-surface-raised border border-border-default rounded-xl p-6 mb-6">
            <textarea
              className="w-full bg-surface-input text-text-primary text-sm rounded-lg px-3 py-2.5 outline-none border border-border-default focus:border-border-focus min-h-[80px] resize-y"
              placeholder={
                skillLevel === "beginner"
                  ? "What kind of agent do you need? Describe it in your own words..."
                  : "Describe the agent (e.g., 'A code reviewer focused on security and OWASP top 10')"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleGenerate)}
              disabled={generatorLoading}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-text-muted text-xs">
                Press Enter to generate
              </span>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generatorLoading}
                className="px-5 py-2 bg-accent-primary text-text-primary rounded-lg text-sm hover:bg-accent-primary-hover disabled:opacity-50 flex items-center gap-2"
              >
                {generatorLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </button>
            </div>

            {/* Example prompts */}
            <div className="mt-4 pt-4 border-t border-border-default">
              <span className="text-text-muted text-xs block mb-2">
                {skillLevel === "beginner" ? "Try one of these:" : "Examples:"}
              </span>
              <div className="flex flex-col gap-1.5">
                {examplePrompts.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    className="text-left text-xs text-text-tertiary hover:text-text-secondary bg-surface-base rounded px-2.5 py-1.5 truncate"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {generatorError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{generatorError}</p>
          </div>
        )}

        {/* Loading indicator (when no draft yet) */}
        {generatorLoading && !generatorDraft && (
          <div className="bg-surface-raised border border-border-default rounded-xl p-8 text-center mb-6">
            <div className="w-8 h-8 border-3 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-text-secondary text-sm">
              {skillLevel === "beginner"
                ? "Creating your agent..."
                : "Generating agent definition..."}
            </p>
          </div>
        )}

        {/* Draft preview + edit */}
        {generatorDraft && (
          <DraftPreview
            draft={generatorDraft}
            skillLevel={skillLevel}
            onUpdate={updateGeneratorDraft}
            loading={generatorLoading}
          />
        )}

        {/* Refinement input */}
        {generatorDraft && !generatorLoading && (
          <div className="bg-surface-raised border border-border-default rounded-xl p-4 mt-4">
            <label className="text-text-secondary text-xs font-medium block mb-2">
              {skillLevel === "beginner"
                ? "Want to change something? Tell us:"
                : "Refine (describe what to change):"}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-surface-input text-text-primary text-sm rounded-lg px-3 py-2 outline-none border border-border-default focus:border-border-focus"
                placeholder="e.g., Make it also check for performance issues..."
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleRefine)}
              />
              <button
                onClick={handleRefine}
                disabled={!refinePrompt.trim()}
                className="px-4 py-2 bg-surface-overlay text-text-primary rounded-lg text-sm hover:bg-surface-overlay/80 disabled:opacity-50 shrink-0"
              >
                Refine
              </button>
            </div>
          </div>
        )}

        {/* Accept / Regenerate buttons */}
        {generatorDraft && !generatorLoading && (
          <div className="flex justify-between mt-6">
            <button
              onClick={() => {
                generateAgent(prompt.trim());
              }}
              className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm"
            >
              Regenerate
            </button>
            <button
              onClick={acceptGeneratorDraft}
              className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500"
            >
              Save to Library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Draft Preview Component --

interface DraftPreviewProps {
  draft: Partial<import("@open-agents/shared").AgentDefinition>;
  skillLevel: SkillLevel;
  onUpdate: (patch: Partial<import("@open-agents/shared").AgentDefinition>) => void;
  loading: boolean;
}

function DraftPreview({ draft, skillLevel, onUpdate, loading }: DraftPreviewProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const modelMeta = draft.model ? getModelMeta(draft.model) : null;

  return (
    <div className={`bg-surface-raised border border-border-default rounded-xl p-6 ${loading ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-text-primary text-lg font-medium">
          {skillLevel === "beginner" ? "Your generated agent" : "Generated Draft"}
        </h3>
        <span className="text-text-muted text-xs bg-surface-overlay px-2 py-1 rounded">
          Draft
        </span>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="text-text-muted text-xs block mb-1">Name</label>
        {editing === "name" ? (
          <input
            type="text"
            className="w-full bg-surface-input text-text-primary text-sm rounded px-2 py-1.5 outline-none border border-border-focus"
            value={draft.name ?? ""}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onBlur={() => setEditing(null)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
            autoFocus
          />
        ) : (
          <p
            className="text-text-primary text-sm cursor-pointer hover:text-accent-primary"
            onClick={() => setEditing("name")}
          >
            {draft.name || "-"}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="text-text-muted text-xs block mb-1">Description</label>
        {editing === "description" ? (
          <input
            type="text"
            className="w-full bg-surface-input text-text-primary text-sm rounded px-2 py-1.5 outline-none border border-border-focus"
            value={draft.description ?? ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
            onBlur={() => setEditing(null)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
            autoFocus
          />
        ) : (
          <p
            className="text-text-secondary text-sm cursor-pointer hover:text-accent-primary"
            onClick={() => setEditing("description")}
          >
            {draft.description || "-"}
          </p>
        )}
      </div>

      {/* Model + Category row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-text-muted text-xs block mb-1">Model</label>
          <select
            className="w-full bg-surface-input text-text-primary text-sm rounded px-2 py-1.5 outline-none border border-border-default cursor-pointer"
            value={draft.model ?? "anthropic/claude-sonnet-4-6"}
            onChange={(e) => onUpdate({ model: e.target.value as import("@open-agents/shared").ModelId })}
          >
            {MODEL_CATALOG.map((m) => (
              <option key={m.id} value={m.id} className="bg-surface-raised">
                {m.labels[skillLevel]} ({m.id})
              </option>
            ))}
          </select>
          {modelMeta && (
            <span className={`inline-block text-xs px-1.5 py-0.5 rounded text-white mt-1 ${modelMeta.color}`}>
              {modelMeta.labels[skillLevel]}
            </span>
          )}
        </div>
        <div>
          <label className="text-text-muted text-xs block mb-1">Category</label>
          <p className="text-text-primary text-sm">{draft.category || "general"}</p>
        </div>
      </div>

      {/* System Prompt */}
      <div className="mb-4">
        <label className="text-text-muted text-xs block mb-1">System Prompt</label>
        {editing === "systemPrompt" ? (
          <textarea
            className="w-full bg-surface-input text-text-primary text-xs rounded px-2 py-1.5 outline-none border border-border-focus min-h-[120px] resize-y font-mono leading-relaxed"
            value={draft.systemPrompt ?? ""}
            onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
            onBlur={() => setEditing(null)}
            autoFocus
          />
        ) : (
          <pre
            className="text-text-secondary text-xs bg-surface-base rounded p-3 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto cursor-pointer hover:border-border-focus border border-transparent"
            onClick={() => setEditing("systemPrompt")}
          >
            {draft.systemPrompt || "-"}
          </pre>
        )}
      </div>

      {/* Tools */}
      <div className="mb-4">
        <label className="text-text-muted text-xs block mb-2">Tools</label>
        <div className="flex flex-wrap gap-1.5">
          {allTools.map((tool) => {
            const active = draft.tools?.includes(tool) ?? false;
            const display = TOOL_DISPLAY[skillLevel][tool];
            return (
              <button
                key={tool}
                onClick={() => {
                  const current = draft.tools ?? [];
                  const next = active
                    ? current.filter((t) => t !== tool)
                    : [...current, tool];
                  onUpdate({ tools: next });
                }}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  active
                    ? "bg-accent-primary text-text-primary"
                    : "bg-surface-overlay text-text-muted hover:text-text-secondary"
                }`}
                title={display.tooltip}
              >
                {display.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      {draft.tags && draft.tags.length > 0 && (
        <div>
          <label className="text-text-muted text-xs block mb-1">Tags</label>
          <div className="flex flex-wrap gap-1">
            {draft.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-surface-overlay text-text-secondary px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-text-muted text-xs mt-4 italic">
        Click any field to edit directly
      </p>
    </div>
  );
}
