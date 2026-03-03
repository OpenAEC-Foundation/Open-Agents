import { useAgentStore, statusColor, modelColor, modelLabel, formatDuration } from '../../stores/agentStore';
import { SpawnForm } from './SpawnForm';

export function AgentList() {
  const hierarchy = useAgentStore((s) => s.getHierarchy)();
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const selectAgent = useAgentStore((s) => s.selectAgent);

  return (
    <div className="w-[300px] min-w-[300px] border-r border-oa-border flex flex-col bg-oa-bg">
      <div className="px-3 py-2 border-b border-oa-border-light text-[10px] font-bold text-oa-text-muted uppercase tracking-widest">
        Agents
      </div>

      <div className="flex-1 overflow-y-auto">
        {hierarchy.length === 0 ? (
          <div className="px-4 py-10 text-center text-oa-text-dim text-sm">
            No agents yet.<br />Spawn one below.
          </div>
        ) : (
          hierarchy.map(({ agent, depth }) => {
            const isSelected = selectedAgent === agent.name;
            const isRunning = agent.status === 'running';
            return (
              <div
                key={agent.name}
                onClick={() => selectAgent(agent.name)}
                className={`py-2 px-2.5 cursor-pointer border-b border-oa-border-light transition-colors ${
                  isSelected ? 'bg-slate-800' : 'hover:bg-neutral-900'
                }`}
                style={{
                  paddingLeft: `${10 + depth * 18}px`,
                  borderLeft: `3px solid ${statusColor(agent.status)}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  {depth > 0 && (
                    <span className="font-mono text-neutral-600 text-[10px] shrink-0">{'\u2514'}</span>
                  )}
                  <span
                    className="w-[7px] h-[7px] rounded-full inline-block shrink-0"
                    style={{
                      background: statusColor(agent.status),
                      animation: isRunning ? 'ccPulse 2s infinite' : 'none',
                    }}
                  />
                  <span className="text-xs font-semibold flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {agent.name}
                  </span>
                  <span
                    className="font-mono text-[9px] px-1 py-px rounded border shrink-0"
                    style={{ borderColor: modelColor(agent.model), color: modelColor(agent.model) }}
                  >
                    {modelLabel(agent.model)}
                  </span>
                  <span className="font-mono text-[10px] text-oa-text-dim shrink-0">
                    {formatDuration(agent.created_at, agent.finished_at)}
                  </span>
                </div>
                <div
                  className="text-[11px] text-oa-text-dim mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ paddingLeft: depth > 0 ? '18px' : '0' }}
                >
                  {agent.task.length > 45 ? agent.task.slice(0, 45) + '\u2026' : agent.task}
                </div>
              </div>
            );
          })
        )}
      </div>

      <SpawnForm />
    </div>
  );
}
