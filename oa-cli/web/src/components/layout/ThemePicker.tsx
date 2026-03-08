import { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { THEMES } from '../../themes';
import { useUIStore } from '../../stores/uiStore';

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const themeId = useUIStore((s) => s.themeId);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Switch theme"
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--color-oa-text-muted)] hover:text-[var(--color-oa-text)] hover:bg-[var(--color-oa-surface-hover)] transition-colors border border-transparent hover:border-[var(--color-oa-border)] cursor-pointer"
      >
        <Palette size={13} />
        <span className="font-medium hidden sm:inline">
          {THEMES.find((t) => t.id === themeId)?.name ?? 'Theme'}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px] rounded-xl shadow-xl border overflow-hidden"
          style={{
            background: 'var(--color-oa-surface)',
            borderColor: 'var(--color-oa-border)',
          }}
        >
          <div
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-oa-text-dim)' }}
          >
            Color Theme
          </div>
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => { setTheme(theme.id); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors cursor-pointer"
              style={{
                background: themeId === theme.id ? 'var(--color-oa-accent-bg)' : 'transparent',
                color: themeId === theme.id ? 'var(--color-oa-accent)' : 'var(--color-oa-text)',
              }}
            >
              {/* Mini preview */}
              <span className="flex gap-0.5 shrink-0">
                <span
                  className="w-3.5 h-5 rounded-sm"
                  style={{ background: theme.preview.sidebar }}
                />
                <span
                  className="w-5 h-5 rounded-sm"
                  style={{ background: theme.preview.bg }}
                />
                <span
                  className="w-2 h-5 rounded-sm"
                  style={{ background: theme.preview.accent }}
                />
              </span>
              <span className="text-xs font-semibold">{theme.name}</span>
              {themeId === theme.id && (
                <span className="ml-auto text-[10px] font-bold" style={{ color: 'var(--color-oa-accent)' }}>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
