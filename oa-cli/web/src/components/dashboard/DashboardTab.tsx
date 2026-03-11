import { useState, useMemo } from 'react';
import { MissionControl } from './MissionControl';
import { AgentPanel } from './AgentPanel';
import { SpawnForm } from './SpawnForm';
import { ActivityFeed } from './ActivityFeed';
import { GuardianPanel } from './GuardianPanel';
import PipelinePanel from './PipelinePanel';
import { useAgentStore } from '../../stores/agentStore';

const FAILED_STATUSES = new Set(['error', 'failed', 'timeout', 'killed']);

function StatsHeader({ agents }: { agents: { status: string }[] }) {
  const running = agents.filter((a) => a.status === 'running').length;
  const done = agents.filter((a) => a.status === 'done').length;
  const failed = agents.filter((a) => FAILED_STATUSES.has(a.status)).length;
  const total = agents.length;
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 shrink-0 font-mono text-[11px]"
      style={{ borderBottom: '1px solid var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
    >
      <span style={{ color: 'var(--color-status-running, #f97316)' }}>● {running} running</span>
      <span style={{ color: 'var(--color-status-done, #22c55e)' }}>✓ {done} done</span>
      <span style={{ color: 'var(--color-status-failed, #ef4444)' }}>✗ {failed} failed</span>
      <span style={{ color: 'var(--color-oa-text-dim)' }}>| {total} total</span>
    </div>
  );
}

export function DashboardTab() {
  const agents = useAgentStore((s) => s.agents);
  const [filter, setFilter] = useState('');

  const filteredAgents = useMemo(() => {
    if (!filter.trim()) return agents;
    const q = filter.toLowerCase();
    return agents.filter(
      (a) => a.name.toLowerCase().includes(q) || a.task.toLowerCase().includes(q),
    );
  }, [agents, filter]);

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>
      {/* Left sidebar: Spawn form + Activity + Guardians + Pipeline */}
      <div className="w-[260px] min-w-[260px] flex flex-col shrink-0 overflow-y-auto" style={{ background: 'var(--color-oa-sidebar)', borderRight: '1px solid var(--color-oa-border)' }}>
        <SpawnForm />
        <ActivityFeed />
        <GuardianPanel />
        <div style={{ borderTop: '1px solid var(--color-oa-border)' }}>
          <PipelinePanel />
        </div>
      </div>

      {/* Center: Stats + Filter + Mission Control */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>
        <StatsHeader agents={agents} />
        <div className="px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--color-oa-border)', background: 'var(--color-oa-surface)' }}>
          <input
            placeholder="Filter agents..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full text-[12px] px-3 py-1.5 rounded font-mono"
            style={{
              background: 'var(--color-oa-bg)',
              border: '1px solid var(--color-oa-border)',
              color: 'var(--color-oa-text)',
              outline: 'none',
            }}
          />
        </div>
        <MissionControl filteredAgents={filteredAgents} />
      </div>

      {/* Right: Agent detail panel */}
      <div style={{ borderLeft: '1px solid var(--color-oa-border)', background: 'var(--color-oa-surface)' }}>
        <AgentPanel />
      </div>
    </div>
  );
}
