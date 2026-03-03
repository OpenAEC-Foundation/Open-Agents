import { AgentList } from './AgentList';
import { AgentDetail } from './AgentDetail';
import { SystemHealth } from './SystemHealth';
import { ActivityFeed } from './ActivityFeed';

export function DashboardTab() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Agent tree + spawn form */}
      <AgentList />

      {/* Middle: Agent detail with sub-tabs */}
      <AgentDetail />

      {/* Right: System health + activity */}
      <div className="w-[280px] min-w-[280px] border-l border-oa-border flex flex-col bg-oa-bg">
        <SystemHealth />
        <ActivityFeed />
      </div>
    </div>
  );
}
