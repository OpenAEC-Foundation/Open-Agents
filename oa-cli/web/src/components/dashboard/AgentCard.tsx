import { memo, useState, useEffect } from 'react';
import type { Agent } from '../../types';
import { modelColor, modelLabel, formatDuration } from '../../stores/agentStore';

interface AgentCardProps {
  agent: Agent;
  selected: boolean;
  onSelect: (name: string) => void;
}

export const AgentCard = memo(function AgentCard({ agent, selected, onSelect }: AgentCardProps) {
  const isRunning = agent.status === 'running';
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const mColor = modelColor(agent.model);
  const duration = formatDuration(agent.created_at, agent.finished_at);
  const dotColor = isRunning ? '#ff6b00' : agent.status === 'done' ? '#4ade80' : '#f87171';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(agent.name)}
      onKeyDown={e => e.key === 'Enter' && onSelect(agent.name)}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,107,0,0.35)';
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.borderColor = '#222222';
      }}
      style={{
        background: '#111111',
        border: `1px solid ${selected ? '#ff6b00' : '#222222'}`,
        borderRadius: '8px',
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'border-color 150ms',
        outline: 'none',
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
          className="text-white font-bold truncate flex-1 leading-tight"
          style={{ fontSize: '16px' }}
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
          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none"
          style={{ background: `${mColor}22`, color: mColor, border: `1px solid ${mColor}33` }}
        >
          {modelLabel(agent.model)}
        </span>
        <span className="text-[10px] text-neutral-500 font-mono">{duration}</span>
      </div>

      {/* Task preview */}
      {agent.task && (
        <div className="text-[11px] text-neutral-400 italic line-clamp-2 leading-snug">
          {agent.task}
        </div>
      )}

      {/* Parent indicator */}
      {agent.parent && (
        <div className="text-[10px] text-neutral-600 truncate mt-1">
          ↳ {agent.parent}
        </div>
      )}
    </div>
  );
});
