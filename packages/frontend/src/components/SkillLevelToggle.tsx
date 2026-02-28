import type { SkillLevel } from "@open-agents/shared";
import { useSettingsStore } from "../stores/settingsStore";

const levels: { id: SkillLevel; label: string; description: string }[] = [
  { id: "beginner", label: "Simple", description: "Plain language, no jargon" },
  { id: "intermediate", label: "Standard", description: "Short technical labels" },
  { id: "advanced", label: "Expert", description: "Full tool & model names" },
];

export function SkillLevelToggle() {
  const skillLevel = useSettingsStore((s) => s.skillLevel);
  const setSkillLevel = useSettingsStore((s) => s.setSkillLevel);

  return (
    <div className="flex items-center gap-1 bg-surface-overlay rounded-md p-0.5">
      {levels.map((level) => (
        <button
          key={level.id}
          title={level.description}
          onClick={() => setSkillLevel(level.id)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            skillLevel === level.id
              ? "bg-accent-primary text-text-primary"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
