import { useEffect, useState } from 'react';
import { triggerGuardian } from '../../api/client';

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

type TriggerState = 'idle' | 'loading' | 'success' | 'error';

export function GuardianPanel() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [open, setOpen] = useState(false);
  const [triggerStates, setTriggerStates] = useState<Record<string, TriggerState>>({});

  useEffect(() => {
    fetch('/api/guardians')
      .then((r) => r.json())
      .then(setGuardians)
      .catch(() => {});
  }, []);

  async function handleRun(name: string) {
    setTriggerStates((prev) => ({ ...prev, [name]: 'loading' }));
    try {
      await triggerGuardian(name);
      setTriggerStates((prev) => ({ ...prev, [name]: 'success' }));
    } catch {
      setTriggerStates((prev) => ({ ...prev, [name]: 'error' }));
    } finally {
      setTimeout(() => {
        setTriggerStates((prev) => ({ ...prev, [name]: 'idle' }));
      }, 2500);
    }
  }

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
          {guardians.map((g) => {
            const state = triggerStates[g.name] ?? 'idle';
            return (
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-oa-text-dim">
                    <span className="font-mono">{g.model.split('/')[1] ?? g.model}</span>
                    <span>last: {fmt(g.last_triggered)}</span>
                  </div>
                  <button
                    onClick={() => handleRun(g.name)}
                    disabled={state === 'loading'}
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors shrink-0 ml-2"
                    style={{
                      background:
                        state === 'success'
                          ? 'rgba(34,197,94,0.15)'
                          : state === 'error'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(255,255,255,0.07)',
                      color:
                        state === 'success'
                          ? '#4ade80'
                          : state === 'error'
                          ? '#f87171'
                          : state === 'loading'
                          ? '#9ca3af'
                          : '#e5e7eb',
                      cursor: state === 'loading' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {state === 'loading' ? '…' : state === 'success' ? '✓ ok' : state === 'error' ? '✗ err' : '▶ Run'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
