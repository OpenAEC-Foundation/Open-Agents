import { useCallback, useEffect, useRef, useState } from "react";
import { themes, getTheme, applyTheme } from "../themes/themes";
import { useSettingsStore } from "../stores/settingsStore";

export function ThemePicker() {
  const themeId = useSettingsStore((s) => s.themeId);
  const setThemeId = useSettingsStore((s) => s.setThemeId);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedThemeRef = useRef(themeId);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Revert preview if user didn't pick
        applyTheme(getTheme(savedThemeRef.current));
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        applyTheme(getTheme(savedThemeRef.current));
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleOpen = useCallback(() => {
    savedThemeRef.current = themeId;
    setOpen((o) => !o);
  }, [themeId]);

  const handleSelect = useCallback(
    (id: string) => {
      setThemeId(id);
      savedThemeRef.current = id;
      setOpen(false);
    },
    [setThemeId],
  );

  const handlePreview = useCallback((id: string) => {
    applyTheme(getTheme(id));
  }, []);

  const handlePreviewEnd = useCallback(() => {
    applyTheme(getTheme(savedThemeRef.current));
  }, []);

  const current = getTheme(themeId);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button — compact, just swatches */}
      <button
        onClick={handleOpen}
        title="Theme"
        className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded transition-colors text-text-tertiary hover:text-text-secondary hover:bg-surface-overlay"
      >
        <span className="flex gap-0.5">
          {current.swatches.map((color, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
        <span>Theme</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-surface-raised border border-border-default rounded-lg shadow-2xl overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-border-default">
            <span className="text-text-secondary text-xs font-medium">Color Theme</span>
          </div>

          <div className="py-1">
            {themes.map((theme) => {
              const active = themeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelect(theme.id)}
                  onMouseEnter={() => handlePreview(theme.id)}
                  onMouseLeave={handlePreviewEnd}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    active
                      ? "bg-accent-primary/15"
                      : "hover:bg-surface-overlay"
                  }`}
                >
                  {/* Color bar preview */}
                  <div className="flex gap-px rounded overflow-hidden shrink-0">
                    {[
                      theme.tokens["--oa-surface-raised"],
                      theme.tokens["--oa-accent-primary"],
                      theme.tokens["--oa-accent-secondary"],
                      theme.tokens["--oa-surface-overlay"],
                    ].map((color, i) => (
                      <span
                        key={i}
                        className="w-3 h-6"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Label + description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm ${active ? "text-accent-primary font-medium" : "text-text-primary"}`}>
                        {theme.label}
                      </span>
                      {active && (
                        <svg className="w-3.5 h-3.5 text-accent-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-text-muted text-xs">{theme.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
