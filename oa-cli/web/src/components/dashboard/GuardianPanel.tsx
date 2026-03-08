import { useEffect, useState } from 'react';

interface Guardian {
  name: string;
  trigger: string;
  model: string;
  output: string;
  task_preview: string;
  last_triggered: number | null;
}

const TRIGGER_COLORS: Record<string, string> = {
  session_end: '#a78bfa',
  batch_complete: '#60a5fa',
};

function fmt(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function GuardianPanel() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/guardians')
      .then((r) => r.json())
      .then(setGuardians)
      .catch(() => {});
  }, []);

  if (guardians.length === 0) return null;

  return (
    <div className="border-t border-oa-border bg-oa-surface">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-oa-text-muted uppercase tracking-widest hover:text-oa-text transition-colors"
      >
        <span>Guardians ({guardians.length})</span>
        <span className="text-oa-text-dim">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-2 space-y-1.5">
          {guardians.map((g) => (
            <div
              key={g.name}
              className="rounded border border-oa-border bg-oa-bg p-2"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-mono text-oa-text truncate flex-1">
                  {g.name}
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-2 shrink-0"
                  style={{
                    color: TRIGGER_COLORS[g.trigger] ?? '#9ca3af',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  {g.trigger}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-oa-text-dim">
                <span className="font-mono">{g.model.split('/')[1] ?? g.model}</span>
                <span>last: {fmt(g.last_triggered)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
