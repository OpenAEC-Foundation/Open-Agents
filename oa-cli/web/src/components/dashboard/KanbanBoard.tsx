import { useMemo } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { AgentCard } from './AgentCard';
import type { Agent } from '../../types';

const FAILED_STATUSES = new Set(['error', 'failed', 'timeout', 'killed']);

interface ColumnProps {
  title: string;
  count: number;
  agents: Agent[];
  selectedAgent: string | null;
  onSelect: (name: string) => void;
  dotColor: string;
}

function Column({ title, count, agents, selectedAgent, onSelect, dotColor }: ColumnProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--color-oa-text-muted)' }}
        >
          {title}
        </span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ml-auto"
          style={{
            background: 'var(--color-oa-bg)',
            color: 'var(--color-oa-text-dim)',
            border: '1px solid var(--color-oa-border)',
          }}
        >
          {count}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {agents.map((agent) => (
          <AgentCard
            key={agent.name}
            agent={agent}
            selected={selectedAgent === agent.name}
            onSelect={onSelect}
          />
        ))}
        {agents.length === 0 && (
          <div
            className="text-[11px] text-center mt-6"
            style={{ color: 'var(--color-oa-text-dim)' }}
          >
            —
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const agents = useAgentStore((s) => s.agents);
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const selectAgent = useAgentStore((s) => s.selectAgent);

  const { running, done, other } = useMemo(
    () => ({
      running: agents.filter((a) => a.status === 'running'),
      done: agents.filter((a) => a.status === 'done'),
      other: agents.filter((a) => FAILED_STATUSES.has(a.status)),
    }),
    [agents],
  );

  if (agents.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ color: 'var(--color-oa-text-dim)' }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4">🤖</div>
          <div className="text-base font-semibold" style={{ color: 'var(--color-oa-text-muted)' }}>
            No agents running
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--color-oa-text-dim)' }}>
            Spawn agents with{' '}
            <code
              className="px-1.5 py-0.5 rounded text-xs font-mono"
              style={{ background: 'var(--color-oa-accent-bg)', color: 'var(--color-oa-accent)' }}
            >
              oa run
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden" style={{ borderTop: '1px solid var(--color-oa-border)' }}>
      <Column
        title="Running"
        count={running.length}
        agents={running}
        selectedAgent={selectedAgent}
        onSelect={selectAgent}
        dotColor="var(--color-status-running)"
      />
      <div style={{ width: '1px', background: 'var(--color-oa-border)', flexShrink: 0 }} />
      <Column
        title="Done"
        count={done.length}
        agents={done}
        selectedAgent={selectedAgent}
        onSelect={selectAgent}
        dotColor="var(--color-status-done)"
      />
      <div style={{ width: '1px', background: 'var(--color-oa-border)', flexShrink: 0 }} />
      <Column
        title="Failed"
        count={other.length}
        agents={other}
        selectedAgent={selectedAgent}
        onSelect={selectAgent}
        dotColor="var(--color-status-failed)"
      />
    </div>
  );
}
