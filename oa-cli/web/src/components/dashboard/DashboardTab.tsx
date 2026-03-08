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
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar: Spawn form + Activity + Guardians */}
      <div className="w-[260px] min-w-[260px] border-r border-neutral-800 flex flex-col bg-neutral-950">
        <SpawnForm />
        <ActivityFeed />
        <GuardianPanel />
      </div>

      {/* Center: stats bar + Live agent canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Thin stats bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-800 bg-neutral-950/90 shrink-0">
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Agents</span>
          {running > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/60 text-cyan-400 border border-cyan-800/30">
              {running} running
            </span>
          )}
          {done > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-950/60 text-green-400 border border-green-800/30">
              {done} done
            </span>
          )}
          {failed > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/60 text-red-400 border border-red-800/30">
              {failed} failed
            </span>
          )}
          {total > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800/60 text-neutral-500 border border-neutral-700/30 ml-auto">
              {total} total
            </span>
          )}
          {total === 0 && (
            <span className="text-[10px] text-neutral-700 ml-auto">No agents yet</span>
          )}
        </div>

        <KanbanBoard />
      </div>

      {/* Right: Agent detail panel */}
      <AgentPanel />
    </div>
  );
}
