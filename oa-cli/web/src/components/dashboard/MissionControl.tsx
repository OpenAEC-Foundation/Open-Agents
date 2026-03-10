import { useMemo, useState, useEffect } from 'react';
import { useAgentStore, modelColor, modelLabel, formatDuration } from '../../stores/agentStore';
import { useUIStore } from '../../stores/uiStore';

const FAILED_STATUSES = new Set(['error', 'failed', 'timeout', 'killed']);

// --- Metric Tile ---
function MetricTile({
  label,
  icon,
  value,
  color,
  sub,
  pulse,
  border = true,
}: {
  label: string;
  icon: string;
  value: number | string;
  color: string;
  sub?: string;
  pulse?: boolean;
  border?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-6 gap-1 relative"
      style={{
        borderRight: border ? '1px solid var(--color-oa-border)' : undefined,
        background: pulse ? `color-mix(in srgb, ${color} 4%, var(--color-oa-surface))` : 'var(--color-oa-surface)',
        transition: 'background 0.4s ease',
      }}
    >
      {pulse && (
        <>
          {/* Outer glow ring */}
          <span
            className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full"
            style={{ background: color, animation: 'ccPulse 1.4s infinite', boxShadow: `0 0 8px 2px ${color}66` }}
          />
          {/* Subtle radial glow behind number */}
          <span
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${color}14 0%, transparent 70%)`,
            }}
          />
        </>
      )}
      {/* Icon */}
      <span className="text-base leading-none mb-0.5 opacity-60" style={{ color }}>
        {icon}
      </span>
      {/* Big number */}
      <span
        className="text-5xl font-black tabular-nums leading-none"
        style={{
          color,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.03em',
          textShadow: pulse ? `0 0 24px ${color}55` : undefined,
          transition: 'text-shadow 0.4s ease',
        }}
      >
        {value}
      </span>
      <span
        className="text-[9px] font-bold tracking-[0.2em] uppercase mt-1"
        style={{ color: 'var(--color-oa-text-dim)' }}
      >
        {label}
      </span>
      {sub && (
        <span className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-oa-text-dim)' }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// --- Table header ---
function TableHeader() {
  return (
    <div
      className="grid items-center px-4 py-2 sticky top-0 z-10"
      style={{
        gridTemplateColumns: '8px 1fr 80px 64px 260px 56px',
        gap: '12px',
        background: 'var(--color-oa-bg)',
        borderBottom: '1px solid var(--color-oa-border)',
      }}
    >
      <span />
      <span className="text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--color-oa-text-dim)' }}>
        Name
      </span>
      <span className="text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--color-oa-text-dim)' }}>
        Model
      </span>
      <span className="text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--color-oa-text-dim)' }}>
        Duration
      </span>
      <span className="text-[9px] font-bold tracking-[0.18em] uppercase hidden sm:block" style={{ color: 'var(--color-oa-text-dim)' }}>
        Task
      </span>
      <span />
    </div>
  );
}

// --- Compact Agent Row ---
function AgentRow({
  agent,
  selected,
  onSelect,
}: {
  agent: { name: string; status: string; model: string; task: string; created_at: number; finished_at: number | null; parent: string | null; depth: number; unread_messages?: number };
  selected: boolean;
  onSelect: (name: string) => void;
}) {
  const isRunning = agent.status === 'running';
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const mColor = modelColor(agent.model);
  const duration = formatDuration(agent.created_at, agent.finished_at);

  const statusColor =
    agent.status === 'running'
      ? 'var(--color-status-running, #f97316)'
      : agent.status === 'done'
      ? 'var(--color-status-done, #22c55e)'
      : FAILED_STATUSES.has(agent.status)
      ? 'var(--color-status-failed, #ef4444)'
      : 'var(--color-oa-text-dim)';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(agent.name)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(agent.name)}
      className="grid items-center px-4 py-2.5 cursor-pointer transition-all"
      style={{
        gridTemplateColumns: '8px 1fr 80px 64px 260px 56px',
        gap: '12px',
        background: selected ? 'color-mix(in srgb, var(--color-oa-accent) 8%, transparent)' : 'transparent',
        borderLeft: `3px solid ${selected ? 'var(--color-oa-accent)' : 'transparent'}`,
        borderBottom: '1px solid var(--color-oa-border)',
        outline: 'none',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {/* Status dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          background: statusColor,
          animation: isRunning ? 'ccPulse 1.4s infinite' : undefined,
          boxShadow: isRunning ? `0 0 6px ${statusColor}` : undefined,
        }}
      />

      {/* Name + depth indent */}
      <span
        className="font-semibold text-[13px] truncate leading-tight flex items-center gap-1"
        style={{ color: selected ? 'var(--color-oa-accent)' : 'var(--color-oa-text)', paddingLeft: agent.depth > 0 ? (agent.depth - 1) * 8 : 0 }}
      >
        {agent.depth > 0 && (
          <span className="text-[10px] shrink-0 opacity-50">↳</span>
        )}
        {agent.name}
        {(agent.unread_messages ?? 0) > 0 && (
          <span className="bg-yellow-500 text-black text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shrink-0">
            {agent.unread_messages}
          </span>
        )}
      </span>

      {/* Model pill */}
      <span
        className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 leading-none text-center"
        style={{ background: `color-mix(in srgb, ${mColor} 12%, transparent)`, color: mColor }}
      >
        {modelLabel(agent.model)}
      </span>

      {/* Duration */}
      <span className="text-[11px] font-mono shrink-0 text-right" style={{ color: 'var(--color-oa-text-dim)' }}>
        {duration}
      </span>

      {/* Task */}
      <span
        className="text-[11px] truncate hidden sm:block"
        style={{ color: 'var(--color-oa-text-dim)' }}
      >
        {agent.task}
      </span>

      {/* Status label */}
      <span
        className="text-[9px] font-bold uppercase tracking-wide text-right shrink-0"
        style={{ color: statusColor, opacity: 0.8 }}
      >
        {agent.status}
      </span>
    </div>
  );
}

// --- Section header ---
function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 sticky top-[37px] z-10"
      style={{
        background: 'var(--color-oa-bg)',
        borderBottom: '1px solid var(--color-oa-border)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--color-oa-text-dim)' }}>
        {label}
      </span>
      <span
        className="text-[10px] px-1.5 rounded-full font-mono"
        style={{ background: 'var(--color-oa-border)', color: 'var(--color-oa-text-dim)' }}
      >
        {count}
      </span>
    </div>
  );
}

// --- Main ---
export function MissionControl() {
  const agents = useAgentStore((s) => s.agents);
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const sessionStart = useUIStore((s) => s.sessionStart);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { running, done, failed } = useMemo(
    () => ({
      running: agents.filter((a) => a.status === 'running'),
      done: agents.filter((a) => a.status === 'done'),
      failed: agents.filter((a) => FAILED_STATUSES.has(a.status)),
    }),
    [agents],
  );

  const uptimeSecs = Math.floor((now - sessionStart) / 1000);
  const h = Math.floor(uptimeSecs / 3600);
  const m = Math.floor((uptimeSecs % 3600) / 60);
  const s = uptimeSecs % 60;
  const uptime = h > 0
    ? `${h}h ${m.toString().padStart(2, '0')}m`
    : `${m}m ${s.toString().padStart(2, '0')}s`;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Instrument panel ── */}
      <div
        className="grid shrink-0"
        style={{
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: '1px solid var(--color-oa-border)',
        }}
      >
        <MetricTile icon="◉" label="Running" value={running.length} color="var(--color-status-running, #f97316)" pulse={running.length > 0} />
        <MetricTile icon="✓" label="Done" value={done.length} color="var(--color-status-done, #22c55e)" />
        <MetricTile icon="✕" label="Failed" value={failed.length} color="var(--color-status-failed, #ef4444)" />
        <MetricTile icon="◈" label="Total" value={agents.length} color="var(--color-oa-text-muted)" />
        <MetricTile icon="⏱" label="Uptime" value={uptime} color="var(--color-oa-text-muted)" border={false} />
      </div>

      {/* ── Agent list ── */}
      {agents.length === 0 ? (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-3"
          style={{ color: 'var(--color-oa-text-dim)' }}
        >
          <div className="text-5xl opacity-20">◉</div>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--color-oa-text-muted)' }}>
            All systems nominal — no agents active
          </div>
          <code
            className="text-[11px] px-3 py-1.5 rounded font-mono"
            style={{ background: 'var(--color-oa-accent-bg)', color: 'var(--color-oa-accent)' }}
          >
            oa run "task" --direct
          </code>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-oa-bg)' }}>
          <TableHeader />
          {running.length > 0 && (
            <>
              <SectionHeader label="Active" count={running.length} color="var(--color-status-running, #f97316)" />
              {running.map((a) => (
                <AgentRow key={a.name} agent={a} selected={selectedAgent === a.name} onSelect={selectAgent} />
              ))}
            </>
          )}
          {done.length > 0 && (
            <>
              <SectionHeader label="Completed" count={done.length} color="var(--color-status-done, #22c55e)" />
              {done.map((a) => (
                <AgentRow key={a.name} agent={a} selected={selectedAgent === a.name} onSelect={selectAgent} />
              ))}
            </>
          )}
          {failed.length > 0 && (
            <>
              <SectionHeader label="Failed" count={failed.length} color="var(--color-status-failed, #ef4444)" />
              {failed.map((a) => (
                <AgentRow key={a.name} agent={a} selected={selectedAgent === a.name} onSelect={selectAgent} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
