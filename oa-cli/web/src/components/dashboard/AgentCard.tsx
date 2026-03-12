import { memo, useState, useEffect } from 'react';
import type { Agent } from '../../types';
import { modelColor, modelLabel, modelVendorFavicon, formatDuration } from '../../stores/agentStore';

interface AgentCardProps {
  agent: Agent;
  selected: boolean;
  onSelect: (name: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  running: 'var(--color-status-running)',
  done: 'var(--color-status-done)',
  error: 'var(--color-status-failed)',
  failed: 'var(--color-status-failed)',
  timeout: 'var(--color-status-timeout)',
  killed: 'var(--color-status-killed)',
};

export const AgentCard = memo(function AgentCard({ agent, selected, onSelect }: AgentCardProps) {
  const isRunning = agent.status === 'running';
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const mColor = modelColor(agent.model);
  const favicon = modelVendorFavicon(agent.model);
  // For multi-turn agents: reset duration clock when agent resumes (last_activity > finished_at)
  const durationStart = (agent.last_activity && agent.finished_at && agent.last_activity > agent.finished_at)
    ? agent.last_activity
    : agent.created_at;
  const duration = formatDuration(durationStart, isRunning ? null : agent.finished_at);
  const dotColor = STATUS_COLORS[agent.status] ?? 'var(--color-oa-text-dim)';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(agent.name)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(agent.name)}
      style={{
        background: selected ? 'var(--color-oa-accent-bg)' : 'var(--color-oa-surface)',
        border: `1px solid ${selected ? 'var(--color-oa-accent)' : 'var(--color-oa-border)'}`,
        borderRadius: '8px',
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'border-color 120ms, background 120ms',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-oa-accent)';
          (e.currentTarget as HTMLDivElement).style.background = 'var(--color-oa-surface-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-oa-border)';
          (e.currentTarget as HTMLDivElement).style.background = 'var(--color-oa-surface)';
        }
      }}
    >
      {/* Name + status dot */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="block w-2 h-2 rounded-full shrink-0"
          style={{
            background: dotColor,
            animation: isRunning ? 'ccPulse 2s infinite' : undefined,
          }}
        />
        <span
          className="font-bold truncate flex-1 leading-tight text-sm"
          style={{ color: 'var(--color-oa-text)' }}
        >
          {agent.name}
        </span>
        {(agent.unread_messages ?? 0) > 0 && (
          <span className="bg-yellow-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
            {agent.unread_messages}
          </span>
        )}
      </div>

      {/* Model badge + duration */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none"
          style={{ background: `${mColor}22`, color: mColor, border: `1px solid ${mColor}44` }}
        >
          {favicon && (
            <img
              src={favicon}
              alt=""
              width={12}
              height={12}
              style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: '2px', flexShrink: 0 }}
            />
          )}
          {modelLabel(agent.model)}
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--color-oa-text-dim)' }}>
          {duration}
        </span>
      </div>

      {/* Task preview */}
      {agent.task && (
        <div
          className="text-[11px] italic line-clamp-2 leading-snug"
          style={{ color: 'var(--color-oa-text-muted)' }}
        >
          {agent.task}
        </div>
      )}

      {/* Remote host indicator */}
      {agent.remote_host && (
        <div className="text-[10px] truncate mt-1 flex items-center gap-1" style={{ color: '#f59e0b' }}>
          <span>⬡</span>
          <span>{agent.remote_host}</span>
        </div>
      )}

      {/* Parent indicator */}
      {agent.parent && (
        <div className="text-[10px] truncate mt-1" style={{ color: 'var(--color-oa-text-dim)' }}>
          ↳ {agent.parent}
        </div>
      )}
    </div>
  );
});
