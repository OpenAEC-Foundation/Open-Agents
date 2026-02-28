import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../stores/appStore";

export function UserInstructionsEditor() {
  const skillLevel = useAppStore((s) => s.skillLevel);
  const instructions = useAppStore((s) => s.userInstructions);
  const loading = useAppStore((s) => s.userInstructionsLoading);
  const fetchUserInstructions = useAppStore((s) => s.fetchUserInstructions);
  const saveUserInstructions = useAppStore((s) => s.saveUserInstructions);

  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch on mount
  useEffect(() => {
    fetchUserInstructions();
  }, [fetchUserInstructions]);

  // Sync draft when instructions load
  useEffect(() => {
    setDraft(instructions);
    setDirty(false);
  }, [instructions]);

  const handleChange = (value: string) => {
    setDraft(value);
    setDirty(true);

    // Auto-save after 1.5s of inactivity
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      await saveUserInstructions(value);
      setSaving(false);
      setDirty(false);
    }, 1500);
  };

  const handleSave = async () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaving(true);
    await saveUserInstructions(draft);
    setSaving(false);
    setDirty(false);
  };

  if (loading) {
    return (
      <div className="text-text-muted text-sm animate-pulse">
        Loading instructions...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="w-full bg-surface-base text-text-primary text-sm font-mono rounded-lg px-4 py-3 outline-none border border-border-default focus:border-border-focus resize-y min-h-[200px] max-h-[500px] leading-relaxed"
        placeholder={
          skillLevel === "beginner"
            ? "Write instructions that all your agents will follow..."
            : "Global user instructions (injected into all agent system prompts)..."
        }
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
      />
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-xs">
          {saving
            ? "Saving..."
            : dirty
              ? "Unsaved changes (auto-saves after 1.5s)"
              : instructions
                ? `${instructions.split("\n").length} lines`
                : "No instructions yet"}
        </span>
        {dirty && (
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-accent-primary text-text-primary rounded text-xs hover:bg-accent-primary-hover"
          >
            Save now
          </button>
        )}
      </div>
      <p className="text-text-muted text-xs">
        {skillLevel === "beginner"
          ? "These instructions are shared with every agent when they run. Use Markdown formatting. Stored in agents/USER_INSTRUCTIONS.md."
          : "Injected as <user-instructions> prefix to all agent system prompts at execution time. Parsed from agents/USER_INSTRUCTIONS.md."}
      </p>
    </div>
  );
}
