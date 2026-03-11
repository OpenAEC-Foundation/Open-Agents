import { useState, useEffect } from 'react';
import { Zap, Trash2, X } from 'lucide-react';
import { MissionControl } from './MissionControl';
import { AgentPanel } from './AgentPanel';
import { SpawnForm } from './SpawnForm';
import { useAgentStore } from '../../stores/agentStore';
import { useUIStore } from '../../stores/uiStore';

/** Spawn modal — SpawnForm in a centered overlay */
function SpawnModal({ onClose }: { onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-[480px] max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
        style={{ background: 'var(--color-oa-sidebar)', border: '1px solid var(--color-oa-border)' }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--color-oa-border)', background: 'var(--color-oa-sidebar)' }}
        >
          <div className="flex items-center gap-2">
            <Zap size={14} style={{ color: 'var(--color-oa-accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-oa-text)' }}>
              New Agent
            </span>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 transition-colors"
            style={{ color: 'var(--color-oa-text-dim)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-oa-text)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-oa-text-dim)'; }}
          >
            <X size={16} />
          </button>
        </div>
        <SpawnForm onSpawned={onClose} />
      </div>
    </div>
  );
}

export function DashboardTab() {
  const agents = useAgentStore((s) => s.agents);
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const cleanAgents = useAgentStore((s) => s.cleanAgents);
  const prefilledTask = useUIStore((s) => s.prefilledTask);
  const [showSpawnModal, setShowSpawnModal] = useState(false);

  // Auto-open spawn modal when a task is pre-filled from another tab
  useEffect(() => {
    if (prefilledTask !== null) setShowSpawnModal(true);
  }, [prefilledTask]);

  const running = agents.filter((a) => a.status === 'running').length;
  const done = agents.filter((a) => a.status === 'done').length;
  const failed = agents.filter((a) => ['error', 'failed', 'timeout', 'killed'].includes(a.status)).length;

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Toolbar */}
        <div
          className="flex items-center gap-3 px-4 py-2 shrink-0 border-b"
          style={{ borderColor: 'var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
        >
          {/* New Agent button */}
          <button
            onClick={() => setShowSpawnModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            style={{ background: 'var(--color-oa-accent)', color: '#fff', border: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
          >
            <Zap size={12} />
            New Agent
          </button>

          {/* Divider */}
          <div className="w-px h-4 shrink-0" style={{ background: 'var(--color-oa-border)' }} />

          {/* Inline stats */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            {running > 0 && (
              <span style={{ color: 'var(--color-status-running, #f97316)' }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: 'var(--color-status-running)', animation: 'ccPulse 1.4s infinite' }} />
                {running} running
              </span>
            )}
            {done > 0 && (
              <span style={{ color: 'var(--color-status-done, #22c55e)' }}>✓ {done} done</span>
            )}
            {failed > 0 && (
              <span style={{ color: 'var(--color-status-failed, #ef4444)' }}>✗ {failed} failed</span>
            )}
            {agents.length > 0 && (
              <span style={{ color: 'var(--color-oa-text-dim)' }}>| {agents.length} total</span>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Clean button */}
          {agents.some((a) => ['done', 'error', 'failed', 'timeout', 'killed'].includes(a.status)) && (
            <button
              onClick={() => cleanAgents()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer transition-colors"
              style={{
                color: 'var(--color-oa-text-dim)',
                border: '1px solid var(--color-oa-border)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-oa-text)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-oa-text-dim)'; }}
              title="Remove finished agents from the list"
            >
              <Trash2 size={11} />
              Clean
            </button>
          )}
        </div>

        {/* Mission control */}
        <MissionControl />
      </div>

      {/* ── Right: Agent detail (slide-in when selected) ── */}
      {selectedAgent && (
        <div
          className="shrink-0 flex flex-col"
          style={{
            width: '420px',
            borderLeft: '1px solid var(--color-oa-border)',
            background: 'var(--color-oa-surface)',
          }}
        >
          <AgentPanel />
        </div>
      )}

      {/* ── Spawn modal ── */}
      {showSpawnModal && <SpawnModal onClose={() => setShowSpawnModal(false)} />}
    </div>
  );
}
