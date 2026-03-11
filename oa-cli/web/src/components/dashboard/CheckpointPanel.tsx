import { useEffect, useState } from 'react';
import { resumeFromCheckpoint } from '../../api/client';

interface Checkpoint {
  agent_name: string;
  task: string;
  status: string;
  updated_at: string;
  model: string;
}

type ResumeState = 'idle' | 'loading' | 'success' | 'error';

function fmtTime(ts: string | null): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export function CheckpointPanel() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [open, setOpen] = useState(false);
  const [resumeStates, setResumeStates] = useState<Record<string, ResumeState>>({});
  const [toasts, setToasts] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/checkpoints')
      .then((r) => r.json())
      .then((data) => setCheckpoints(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function handleResume(name: string) {
    setResumeStates((prev) => ({ ...prev, [name]: 'loading' }));
    try {
      await resumeFromCheckpoint(name);
      setResumeStates((prev) => ({ ...prev, [name]: 'success' }));
      const msg = `Agent ${name}-resume gespawnt`;
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 3000);
    } catch {
      setResumeStates((prev) => ({ ...prev, [name]: 'error' }));
    } finally {
      setTimeout(() => {
        setResumeStates((prev) => ({ ...prev, [name]: 'idle' }));
      }, 2500);
    }
  }

  if (checkpoints.length === 0) return null;

  return (
    <div
      className="border-t"
      style={{ borderColor: 'var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
    >
      {/* Toast notifications */}
      {toasts.map((t, i) => (
        <div
          key={i}
          className="fixed bottom-4 right-4 text-xs px-3 py-2 rounded-lg shadow-lg"
          style={{ background: 'var(--color-status-done-bg)', color: 'var(--color-status-done)', zIndex: 9999 }}
        >
          {t}
        </div>
      ))}

      {/* Collapsible header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors"
        style={{ color: 'var(--color-oa-text-dim)' }}
      >
        <span>Checkpoints ({checkpoints.length})</span>
        <span style={{ color: 'var(--color-oa-text-dim)', opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {checkpoints.length === 0 ? (
            <div className="text-xs text-center py-2" style={{ color: 'var(--color-oa-text-dim)' }}>
              No incomplete checkpoints
            </div>
          ) : (
            checkpoints.map((cp) => {
              const state = resumeStates[cp.agent_name] ?? 'idle';
              return (
                <div
                  key={cp.agent_name}
                  className="rounded-xl border p-3 shadow-sm"
                  style={{ borderColor: 'var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-mono font-semibold truncate flex-1"
                      style={{ color: 'var(--color-oa-text)' }}
                    >
                      {cp.agent_name}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded ml-2 shrink-0"
                      style={{ background: 'var(--color-oa-accent-bg)', color: 'var(--color-oa-text-muted)' }}
                    >
                      {cp.status}
                    </span>
                  </div>
                  <div
                    className="text-[10px] mb-2"
                    style={{ color: 'var(--color-oa-text-muted)' }}
                  >
                    {cp.task.length > 80 ? cp.task.slice(0, 80) + '…' : cp.task}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: 'var(--color-oa-text-dim)' }}>
                      {fmtTime(cp.updated_at)}
                    </span>
                    <button
                      onClick={() => handleResume(cp.agent_name)}
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
                      {state === 'loading' ? '…' : state === 'success' ? '✓ spawnt' : state === 'error' ? '✗ err' : '↻ Resume'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
