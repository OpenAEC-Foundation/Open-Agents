import { MissionControl } from './MissionControl';
import { TerminalPanel } from './TerminalPanel';
import { SpawnForm } from './SpawnForm';
import { ActivityFeed } from './ActivityFeed';

export function DashboardTab2() {
  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>
      {/* Left sidebar */}
      <div
        className="w-[260px] min-w-[260px] flex flex-col shrink-0 overflow-y-auto"
        style={{ background: 'var(--color-oa-sidebar)', borderRight: '1px solid var(--color-oa-border)' }}
      >
        <SpawnForm />
        <ActivityFeed />
      </div>

      {/* Center: agent canvas */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>
        <MissionControl />
      </div>

      {/* Right: terminal viewport met tabs */}
      <TerminalPanel />
    </div>
  );
}
