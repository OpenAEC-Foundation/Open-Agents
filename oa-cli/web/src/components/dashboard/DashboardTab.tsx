import { LiveCanvas } from './LiveCanvas';
import { AgentPanel } from './AgentPanel';
import { SpawnForm } from './SpawnForm';
import { ActivityFeed } from './ActivityFeed';
import { GuardianPanel } from './GuardianPanel';

export function DashboardTab() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar: Spawn form + Activity + Guardians */}
      <div className="w-[260px] min-w-[260px] border-r border-neutral-800 flex flex-col bg-neutral-950">
        <SpawnForm />
        <ActivityFeed />
        <GuardianPanel />
      </div>

      {/* Center: Live agent canvas */}
      <LiveCanvas />

      {/* Right: Agent detail panel */}
      <AgentPanel />
    </div>
  );
}
