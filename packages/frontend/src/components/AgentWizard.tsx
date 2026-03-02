import { useCallback } from "react";
import type { AgentTool, ModelId, SkillLevel } from "@open-agents/shared";
import { MODEL_CATALOG, TOOL_DISPLAY } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

const WIZARD_STEPS = ["Name", "Model", "Prompt", "Tools", "Review"];

const allTools: AgentTool[] = [
  "Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebSearch", "WebFetch",
];

const categories = [
  "general", "code", "review", "data", "devops", "security", "documentation", "research",
];

export function AgentWizard() {
  const wizardStep = useAppStore((s) => s.wizardStep);
  const wizardDraft = useAppStore((s) => s.wizardDraft);
  const setWizardStep = useAppStore((s) => s.setWizardStep);
  const updateWizardDraft = useAppStore((s) => s.updateWizardDraft);
  const closeWizard = useAppStore((s) => s.closeWizard);
  const submitWizard = useAppStore((s) => s.submitWizard);
  const skillLevel = useAppStore((s) => s.skillLevel);

  const canNext = useCallback(() => {
    switch (wizardStep) {
      case 0: return !!wizardDraft.name?.trim();
      case 1: return !!wizardDraft.model;
      case 2: return !!wizardDraft.systemPrompt?.trim();
      case 3: return (wizardDraft.tools?.length ?? 0) > 0;
      default: return true;
    }
  }, [wizardStep, wizardDraft]);

  const handleNext = () => {
    if (wizardStep < WIZARD_STEPS.length - 1) {
      setWizardStep(wizardStep + 1);
    }
  };

  const handleBack = () => {
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1);
    }
  };

  const handleSubmit = async () => {
    await submitWizard();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-12 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-text-primary text-2xl font-semibold">
              {skillLevel === "beginner" ? "Create a new agent" : "Agent Wizard"}
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              Step {wizardStep + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[wizardStep]}
            </p>
          </div>
          <button
            onClick={closeWizard}
            className="text-text-muted hover:text-text-primary text-sm"
          >
            Cancel
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8">
          {WIZARD_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => i < wizardStep && setWizardStep(i)}
                className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                  i === wizardStep
                    ? "bg-accent-primary text-text-primary"
                    : i < wizardStep
                      ? "bg-accent-primary/30 text-accent-primary cursor-pointer"
                      : "bg-surface-overlay text-text-muted"
                }`}
              >
                {i + 1}
              </button>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < wizardStep ? "bg-accent-primary/30" : "bg-surface-overlay"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-surface-raised border border-border-default rounded-xl p-6">
          {wizardStep === 0 && (
            <StepName
              draft={wizardDraft}
              update={updateWizardDraft}
              skillLevel={skillLevel}
            />
          )}
          {wizardStep === 1 && (
            <StepModel
              draft={wizardDraft}
              update={updateWizardDraft}
              skillLevel={skillLevel}
            />
          )}
          {wizardStep === 2 && (
            <StepPrompt
              draft={wizardDraft}
              update={updateWizardDraft}
              skillLevel={skillLevel}
            />
          )}
          {wizardStep === 3 && (
            <StepTools
              draft={wizardDraft}
              update={updateWizardDraft}
              skillLevel={skillLevel}
            />
          )}
          {wizardStep === 4 && (
            <StepReview draft={wizardDraft} skillLevel={skillLevel} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={wizardStep === 0}
            className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm disabled:opacity-30"
          >
            Back
          </button>
          {wizardStep < WIZARD_STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canNext()}
              className="px-6 py-2 bg-accent-primary text-text-primary rounded-lg text-sm hover:bg-accent-primary-hover disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500"
            >
              Create Agent
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Step Components --

type WizardDraft = ReturnType<typeof useAppStore.getState>["wizardDraft"];

interface StepProps {
  draft: WizardDraft;
  update: (patch: Partial<WizardDraft>) => void;
  skillLevel: SkillLevel;
}

function StepName({ draft, update, skillLevel }: StepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-text-secondary text-sm font-medium block mb-1">
          {skillLevel === "beginner" ? "What should we call this agent?" : "Agent Name"}
        </label>
        <input
          type="text"
          className="w-full bg-surface-input text-text-primary text-sm rounded-lg px-3 py-2.5 outline-none border border-border-default focus:border-border-focus"
          placeholder="e.g., Code Reviewer, Bug Hunter, API Designer..."
          value={draft.name ?? ""}
          onChange={(e) => update({ name: e.target.value })}
          autoFocus
        />
      </div>
      <div>
        <label className="text-text-secondary text-sm font-medium block mb-1">
          {skillLevel === "beginner" ? "What does it do? (short description)" : "Description"}
        </label>
        <input
          type="text"
          className="w-full bg-surface-input text-text-primary text-sm rounded-lg px-3 py-2.5 outline-none border border-border-default focus:border-border-focus"
          placeholder="e.g., Reviews code for quality, security, and best practices"
          value={draft.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>
      <div>
        <label className="text-text-secondary text-sm font-medium block mb-1">Category</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => update({ category: cat })}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                draft.category === cat
                  ? "bg-accent-primary text-text-primary"
                  : "bg-surface-overlay text-text-secondary hover:bg-surface-overlay/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepModel({ draft, update, skillLevel }: StepProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-text-secondary text-sm font-medium">
        {skillLevel === "beginner" ? "Choose an AI model" : "Model Selection"}
      </label>
      <p className="text-text-muted text-xs">
        {skillLevel === "beginner"
          ? "Different models have different strengths. Faster models cost less."
          : "Select the LLM model for this agent. Format: provider/model."}
      </p>
      <div className="flex flex-col gap-2 mt-2">
        {MODEL_CATALOG.map((model) => (
          <button
            key={model.id}
            onClick={() => update({ model: model.id })}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
              draft.model === model.id
                ? "border-accent-primary bg-accent-primary/10"
                : "border-border-default bg-surface-base hover:border-border-focus"
            }`}
          >
            <span className={`w-3 h-3 rounded-full shrink-0 ${model.color}`} />
            <div className="flex-1">
              <span className="text-text-primary text-sm font-medium">
                {model.labels[skillLevel]}
              </span>
              <span className="text-text-muted text-xs ml-2">
                {model.id}
              </span>
            </div>
            {draft.model === model.id && (
              <span className="text-accent-primary text-sm">Selected</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepPrompt({ draft, update, skillLevel }: StepProps) {
  const examples = [
    "You are a code reviewer. Analyse the given code for bugs, security issues, and quality improvements. Be thorough but concise.",
    "You are a test generator. For the given code, write comprehensive unit tests covering edge cases and error scenarios.",
    "You are a documentation writer. Generate clear, well-structured documentation for the given codebase.",
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-text-secondary text-sm font-medium block mb-1">
          {skillLevel === "beginner" ? "Tell the agent what to do" : "System Prompt"}
        </label>
        <p className="text-text-muted text-xs mb-2">
          {skillLevel === "beginner"
            ? "Write instructions for the agent. Be specific about what it should focus on."
            : "The system prompt defines the agent's behavior, expertise, and output format."}
        </p>
        <textarea
          className="w-full bg-surface-input text-text-primary text-sm rounded-lg px-3 py-2.5 outline-none border border-border-default focus:border-border-focus min-h-[160px] resize-y font-mono"
          placeholder="You are a..."
          value={draft.systemPrompt ?? ""}
          onChange={(e) => update({ systemPrompt: e.target.value })}
        />
      </div>
      <div>
        <span className="text-text-muted text-xs">Examples (click to use):</span>
        <div className="flex flex-col gap-1.5 mt-1.5">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => update({ systemPrompt: ex })}
              className="text-left text-xs text-text-tertiary hover:text-text-secondary bg-surface-base rounded px-2 py-1.5 truncate"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepTools({ draft, update, skillLevel }: StepProps) {
  const currentTools = draft.tools ?? [];

  const toggleTool = (tool: AgentTool) => {
    const next = currentTools.includes(tool)
      ? currentTools.filter((t) => t !== tool)
      : [...currentTools, tool];
    update({ tools: next });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-text-secondary text-sm font-medium block mb-1">
          {skillLevel === "beginner" ? "What can this agent do?" : "Tool Selection"}
        </label>
        <p className="text-text-muted text-xs mb-3">
          {skillLevel === "beginner"
            ? "Choose which abilities the agent has. More tools = more capable but potentially riskier."
            : "Select the tools available to this agent during execution."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {allTools.map((tool) => {
          const active = currentTools.includes(tool);
          const display = TOOL_DISPLAY[skillLevel][tool];
          return (
            <button
              key={tool}
              onClick={() => toggleTool(tool)}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-colors text-left ${
                active
                  ? "border-accent-primary bg-accent-primary/10"
                  : "border-border-default bg-surface-base hover:border-border-focus"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${active ? "bg-accent-primary" : "bg-surface-overlay"}`} />
              <div>
                <span className="text-text-primary text-sm">{display.label}</span>
                <p className="text-text-muted text-xs">{display.tooltip}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepReview({ draft, skillLevel }: Omit<StepProps, "update">) {
  const modelMeta = MODEL_CATALOG.find((m) => m.id === draft.model);
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-text-primary text-lg font-medium">
        {skillLevel === "beginner" ? "Review your agent" : "Summary"}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-text-muted text-xs">Name</label>
          <p className="text-text-primary text-sm mt-0.5">{draft.name || "-"}</p>
        </div>
        <div>
          <label className="text-text-muted text-xs">Model</label>
          <div className="flex items-center gap-2 mt-0.5">
            {modelMeta && (
              <span className={`text-xs px-1.5 py-0.5 rounded text-white ${modelMeta.color}`}>
                {modelMeta.labels[skillLevel]}
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="text-text-muted text-xs">Category</label>
          <p className="text-text-primary text-sm mt-0.5">{draft.category || "-"}</p>
        </div>
        <div>
          <label className="text-text-muted text-xs">Tools</label>
          <p className="text-text-primary text-sm mt-0.5">{draft.tools?.join(", ") || "-"}</p>
        </div>
      </div>
      <div>
        <label className="text-text-muted text-xs">Description</label>
        <p className="text-text-secondary text-sm mt-0.5">{draft.description || "-"}</p>
      </div>
      <div>
        <label className="text-text-muted text-xs">System Prompt</label>
        <pre className="text-text-secondary text-xs mt-1 bg-surface-base rounded p-3 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
          {draft.systemPrompt || "-"}
        </pre>
      </div>
    </div>
  );
}
