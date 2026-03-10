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
    <div
      className="border-t"
      style={{ borderColor: 'var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
    >
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors"
        style={{ color: 'var(--color-oa-text-dim)' }}
      >
        <span>Guardians ({guardians.length})</span>
        <span style={{ color: 'var(--color-oa-text-dim)', opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {guardians.map((g) => {
            const state = triggerStates[g.name] ?? 'idle';
            return (
              <div
                key={g.name}
                className="rounded-xl border p-3 shadow-sm"
                style={{ borderColor: 'var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-mono font-semibold truncate flex-1"
                    style={{ color: 'var(--color-oa-text)' }}
                  >
                    {g.name}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded ml-2 shrink-0"
                    style={{ background: 'var(--color-oa-accent-bg)', color: 'var(--color-oa-text-muted)' }}
                  >
                    {g.trigger}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 text-[10px]"
                    style={{ color: 'var(--color-oa-text-dim)' }}
                  >
                    <span className="font-mono">{g.model.split('/')[1] ?? g.model}</span>
                    <span>last: {fmt(g.last_triggered)}</span>
                  </div>
                  <button
                    onClick={() => handleRun(g.name)}
                    disabled={state === 'loading'}
                    className="text-xs px-2 py-1 rounded font-semibold transition-colors shrink-0 ml-2"
                    style={
                      state === 'success'
                        ? { background: 'var(--color-status-done-bg)', color: 'var(--color-status-done)' }
                        : state === 'error'
                        ? { background: 'var(--color-status-failed-bg)', color: 'var(--color-status-failed)' }
                        : state === 'loading'
                        ? { background: 'var(--color-oa-accent-bg)', color: 'var(--color-oa-text-dim)', cursor: 'not-allowed' }
                        : { background: 'var(--color-oa-accent)', color: '#ffffff' }
                    }
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
