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
      <div className="w-[260px] min-w-[260px] border-r border-gray-200 flex flex-col bg-white">
        <SpawnForm />
        <ActivityFeed />
        <GuardianPanel />
      </div>

      {/* Center: stats bar + Live agent canvas */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Thin stats bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-white shrink-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Agents</span>
          {running > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-50 text-cyan-600 border border-cyan-200">
              {running} running
            </span>
          )}
          {done > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200">
              {done} done
            </span>
          )}
          {failed > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200">
              {failed} failed
            </span>
          )}
          {total > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 ml-auto">
              {total} total
            </span>
          )}
          {total === 0 && (
            <span className="text-[10px] text-gray-300 ml-auto">No agents yet</span>
          )}
        </div>

        <KanbanBoard />
      </div>

      {/* Right: Agent detail panel */}
      <div className="border-l border-gray-200 bg-white">
        <AgentPanel />
      </div>
    </div>
  );
}
