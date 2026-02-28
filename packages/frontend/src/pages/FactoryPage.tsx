import { useAppStore } from "../stores/appStore";
import { AgentWizard } from "../components/AgentWizard";
import { GeneratePanel } from "../components/GeneratePanel";

const assetTypes = [
  {
    id: "agent",
    label: "Agent",
    description: "An autonomous agent with tools, model, and system prompt",
    icon: "\u2699",
    available: true,
  },
  {
    id: "template",
    label: "Template",
    description: "A pre-configured canvas with connected agents",
    icon: "\u25A6",
    available: false,
  },
  {
    id: "rule",
    label: "Rule",
    description: "A safety or behavior rule for agents",
    icon: "\u26A0",
    available: false,
  },
  {
    id: "skill",
    label: "Skill",
    description: "Domain knowledge that changes how an agent thinks",
    icon: "\u2605",
    available: false,
  },
];

export function FactoryPage() {
  const wizardOpen = useAppStore((s) => s.wizardOpen);
  const generatorOpen = useAppStore((s) => s.generatorOpen);
  const openWizard = useAppStore((s) => s.openWizard);
  const openGenerator = useAppStore((s) => s.openGenerator);
  const skillLevel = useAppStore((s) => s.skillLevel);

  if (wizardOpen) {
    return <AgentWizard />;
  }

  if (generatorOpen) {
    return <GeneratePanel />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <h2 className="text-text-primary text-2xl font-semibold">Factory</h2>
        <p className="text-text-secondary text-sm mt-2">
          {skillLevel === "beginner"
            ? "Create new agents and assets for your workspace. Start by choosing what you want to build."
            : "Create agents, templates, rules, and skills for the platform library."}
        </p>

        {/* AI Generator CTA */}
        <button
          onClick={openGenerator}
          className="w-full mt-6 p-5 rounded-xl border-2 border-dashed border-accent-primary/40 bg-accent-primary/5 hover:bg-accent-primary/10 hover:border-accent-primary/60 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#9733;</span>
            <div>
              <span className="text-text-primary text-sm font-semibold">
                {skillLevel === "beginner"
                  ? "Describe what you need"
                  : "AI-Powered Generation"}
              </span>
              <p className="text-text-tertiary text-xs mt-0.5">
                {skillLevel === "beginner"
                  ? "Tell us in your own words and we'll create it for you"
                  : "Describe an agent in natural language. The LLM generates a complete, platform-compliant definition."}
              </p>
            </div>
          </div>
        </button>

        {/* Manual creation cards */}
        <p className="text-text-muted text-xs mt-6 mb-3">
          {skillLevel === "beginner" ? "Or create manually:" : "Manual creation:"}
        </p>
        <div className="grid grid-cols-2 gap-4">
          {assetTypes.map((asset) => (
            <button
              key={asset.id}
              onClick={asset.available ? openWizard : undefined}
              disabled={!asset.available}
              className={`text-left p-5 rounded-xl border transition-colors ${
                asset.available
                  ? "border-border-default bg-surface-raised hover:border-border-focus hover:bg-surface-overlay cursor-pointer"
                  : "border-border-subtle bg-surface-base opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{asset.icon}</span>
                <div>
                  <span className="text-text-primary text-sm font-semibold">
                    {asset.label}
                  </span>
                  {!asset.available && (
                    <span className="ml-2 text-text-muted text-xs">Coming soon</span>
                  )}
                </div>
              </div>
              <p className="text-text-tertiary text-xs mt-2">
                {asset.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
