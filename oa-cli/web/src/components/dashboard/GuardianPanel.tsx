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
    <div className="border-t border-gray-200 bg-white">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors"
      >
        <span>Guardians ({guardians.length})</span>
        <span className="text-gray-300">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {guardians.map((g) => {
            const state = triggerStates[g.name] ?? 'idle';
            return (
              <div
                key={g.name}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-semibold text-[#1e293b] truncate flex-1">
                    {g.name}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500 ml-2 shrink-0">
                    {g.trigger}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="font-mono">{g.model.split('/')[1] ?? g.model}</span>
                    <span>last: {fmt(g.last_triggered)}</span>
                  </div>
                  <button
                    onClick={() => handleRun(g.name)}
                    disabled={state === 'loading'}
                    className={`text-xs px-2 py-1 rounded font-semibold transition-colors shrink-0 ml-2 ${
                      state === 'success'
                        ? 'bg-green-100 text-green-600'
                        : state === 'error'
                        ? 'bg-red-100 text-red-500'
                        : state === 'loading'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-[#ff6b35] text-white hover:bg-[#e55a2a]'
                    }`}
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
