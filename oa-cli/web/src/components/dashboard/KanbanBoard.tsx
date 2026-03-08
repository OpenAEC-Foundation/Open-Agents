import { useMemo } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { AgentCard } from './AgentCard';
import type { Agent } from '../../types';

const FAILED_STATUSES = new Set(['error', 'failed', 'timeout', 'killed']);

interface ColumnProps {
  title: string;
  agents: Agent[];
  selectedAgent: string | null;
  onSelect: (name: string) => void;
  accentColor: string;
}

function Column({ title, agents, selectedAgent, onSelect, accentColor }: ColumnProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ background: '#0d0d0d' }}>
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #222222' }}
      >
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: accentColor }}
        >
          {title}
        </span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
          style={{
            background: `${accentColor}22`,
            color: accentColor,
            border: `1px solid ${accentColor}33`,
          }}
        >
          {agents.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {agents.map(agent => (
          <AgentCard
            key={agent.name}
            agent={agent}
            selected={selectedAgent === agent.name}
            onSelect={onSelect}
          />
        ))}
        {agents.length === 0 && (
          <div className="text-[11px] text-neutral-700 text-center mt-6">—</div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const agents = useAgentStore(s => s.agents);
  const selectedAgent = useAgentStore(s => s.selectedAgent);
  const selectAgent = useAgentStore(s => s.selectAgent);

  const { running, done, other } = useMemo(
    () => ({
      running: agents.filter(a => a.status === 'running'),
      done: agents.filter(a => a.status === 'done'),
      other: agents.filter(a => FAILED_STATUSES.has(a.status)),
    }),
    [agents]
  );

  if (agents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <div className="text-4xl mb-4">&#x1f916;</div>
          <div className="text-lg font-medium">No agents running</div>
          <div className="text-sm mt-1">
            Spawn agents with{' '}
            <code
              className="px-1.5 py-0.5 rounded text-oa-accent"
              style={{ background: 'rgba(249,115,22,0.12)' }}
            >
              oa run
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden" style={{ borderTop: '1px solid #222222' }}>
      <Column
        title="Running"
        agents={running}
        selectedAgent={selectedAgent}
        onSelect={selectAgent}
        accentColor="#ff6b00"
      />
      <div style={{ width: '1px', background: '#222222', flexShrink: 0 }} />
      <Column
        title="Done"
        agents={done}
        selectedAgent={selectedAgent}
        onSelect={selectAgent}
        accentColor="#4ade80"
      />
      <div style={{ width: '1px', background: '#222222', flexShrink: 0 }} />
      <Column
        title="Failed / Other"
        agents={other}
        selectedAgent={selectedAgent}
        onSelect={selectAgent}
        accentColor="#f87171"
      />
    </div>
  );
}
