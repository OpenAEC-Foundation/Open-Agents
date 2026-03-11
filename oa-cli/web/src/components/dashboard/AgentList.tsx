import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Search } from 'lucide-react';
import { useAgentStore, modelColor, modelLabel, formatDuration } from '../../stores/agentStore';
import { SpawnForm } from './SpawnForm';

function statusBadgeStyle(status: string): CSSProperties {
  const s = status === 'error' ? 'failed' : ['running', 'done', 'failed', 'timeout', 'killed'].includes(status) ? status : 'killed';
  return {
    color: `var(--color-status-${s})`,
    background: `color-mix(in srgb, var(--color-status-${s}) 12%, transparent)`,
  };
}

export function AgentList() {
  const hierarchy = useAgentStore((s) => s.getHierarchy)();
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? hierarchy.filter(({ agent }) =>
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.task.toLowerCase().includes(search.toLowerCase())
      )
    : hierarchy;

  return (
    <div
      className="w-[280px] min-w-[280px] flex flex-col border-r"
      style={{ background: 'var(--color-oa-sidebar)', borderColor: 'var(--color-oa-border)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-oa-border)' }}>
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-oa-text-muted)' }}
        >
          Agents
        </span>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--color-oa-border)' }}>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 border transition-colors focus-within:border-oa-accent"
          style={{ background: 'var(--color-oa-surface)', borderColor: 'var(--color-oa-border)' }}
        >
          <Search size={13} className="shrink-0" style={{ color: 'var(--color-oa-text-dim)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="bg-transparent text-sm outline-none flex-1 min-w-0 placeholder:text-oa-text-dim"
            style={{ color: 'var(--color-oa-text)' }}
          />
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-oa-text-dim)' }}>
            {hierarchy.length === 0 ? (
              <>No agents yet.<br />Spawn one below.</>
            ) : (
              'No matches.'
            )}
          </div>
        ) : (
          filtered.map(({ agent, depth }) => {
            const isSelected = selectedAgent === agent.name;
            const isRunning = agent.status === 'running';
            const taskPreview = agent.task.length > 50
              ? agent.task.slice(0, 50) + '\u2026'
              : agent.task;

            return (
              <div
                key={agent.name}
                onClick={() => selectAgent(agent.name)}
                className={`cursor-pointer border-b transition-all duration-150 ${isSelected ? 'border-l-2' : ''}`}
                style={{
                  background: isSelected ? 'var(--color-oa-surface)' : undefined,
                  borderBottomColor: 'var(--color-oa-border)',
                  borderLeftColor: isSelected ? 'var(--color-oa-accent)' : undefined,
                  paddingLeft: `${(isSelected ? 10 : 12) + depth * 16}px`,
                  paddingRight: '12px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-oa-surface)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '';
                }}
              >
                {/* Top row: pulse dot + name + status badge */}
                <div className="flex items-center gap-2">
                  {isRunning && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: 'var(--color-status-running)', animation: 'ccPulse 2s infinite' }}
                    />
                  )}
                  {depth > 0 && (
                    <span className="text-[11px]" style={{ color: 'var(--color-oa-text-dim)' }}>└</span>
                  )}
                  <span
                    className="text-sm font-semibold flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ color: 'var(--color-oa-text)' }}
                  >
                    {agent.name}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                    style={statusBadgeStyle(agent.status)}
                  >
                    {agent.status}
                  </span>
                </div>

                {/* Bottom row: model + duration + task preview */}
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs font-mono shrink-0"
                    style={{ color: modelColor(agent.model) }}
                  >
                    {modelLabel(agent.model)}
                  </span>
                  {(agent as any).remote_host && (
                    <span
                      className='text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0'
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                    >
                      {(agent as any).remote_host}
                    </span>
                  )}
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-oa-text-dim)' }}>
                    {formatDuration(agent.created_at, agent.finished_at)}
                  </span>
                  <span
                    className="text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-1"
                    style={{ color: 'var(--color-oa-text-dim)' }}
                  >
                    {taskPreview}
                  </span>
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
