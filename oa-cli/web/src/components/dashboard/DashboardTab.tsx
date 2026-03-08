import { KanbanBoard } from './KanbanBoard';
import { AgentPanel } from './AgentPanel';
import { SpawnForm } from './SpawnForm';
import { ActivityFeed } from './ActivityFeed';
import { GuardianPanel } from './GuardianPanel';
import { useAgentStore } from '../../stores/agentStore';

export function DashboardTab() {
  const agents = useAgentStore(s => s.agents);
  const running = agents.filter(a => a.status === 'running').length;
  const done = agents.filter(a => a.status === 'done').length;
  const failed = agents.filter(a => ['error', 'failed', 'timeout', 'killed'].includes(a.status)).length;
  const total = agents.length;

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>
      {/* Left sidebar: Spawn form + Activity + Guardians */}
      <div className="w-[260px] min-w-[260px] flex flex-col shrink-0" style={{ background: 'var(--color-oa-sidebar)', borderRight: '1px solid var(--color-oa-border)' }}>
        <SpawnForm />
        <ActivityFeed />
        <GuardianPanel />
      </div>

      {/* Center: stats bar + Live agent canvas */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>
        {/* Thin stats bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ borderBottom: '1px solid var(--color-oa-border)', background: 'var(--color-oa-surface)' }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-oa-text-dim)' }}>Agents</span>
          {running > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-status-running)', border: '1px solid rgba(59,130,246,0.25)' }}>
              {running} running
            </span>
          )}
          {done > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--color-status-done)', border: '1px solid rgba(34,197,94,0.25)' }}>
              {done} done
            </span>
          )}
          {failed > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-status-failed)', border: '1px solid rgba(239,68,68,0.25)' }}>
              {failed} failed
            </span>
          )}
          {total > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold ml-auto" style={{ background: 'var(--color-oa-bg)', color: 'var(--color-oa-text-muted)', border: '1px solid var(--color-oa-border)' }}>
              {total} total
            </span>
          )}
          {total === 0 && (
            <span className="text-[10px] ml-auto" style={{ color: 'var(--color-oa-text-dim)' }}>No agents yet</span>
          )}
        </div>

        <KanbanBoard />
      </div>

      {/* Right: Agent detail panel */}
      <div style={{ borderLeft: '1px solid var(--color-oa-border)', background: 'var(--color-oa-surface)' }}>
        <AgentPanel />
      </div>
    </div>
  );
}
