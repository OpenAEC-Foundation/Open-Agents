import { MissionControl } from './MissionControl';
import { AgentPanel } from './AgentPanel';
import { SpawnForm } from './SpawnForm';
import { ActivityFeed } from './ActivityFeed';
import { GuardianPanel } from './GuardianPanel';

export function DashboardTab() {
  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>
      {/* Left sidebar: Spawn form + Activity + Guardians */}
      <div className="w-[260px] min-w-[260px] flex flex-col shrink-0" style={{ background: 'var(--color-oa-sidebar)', borderRight: '1px solid var(--color-oa-border)' }}>
        <SpawnForm />
        <ActivityFeed />
        <GuardianPanel />
      </div>

      {/* Center: Mission Control */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>
        <MissionControl />
      </div>

      {/* Right: Agent detail panel */}
      <div style={{ borderLeft: '1px solid var(--color-oa-border)', background: 'var(--color-oa-surface)' }}>
        <AgentPanel />
      </div>
    </div>
  );
}
