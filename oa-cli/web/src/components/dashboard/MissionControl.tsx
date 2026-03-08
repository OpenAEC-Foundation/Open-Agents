import { useMemo, useState, useEffect } from 'react';
import { useAgentStore, modelColor, modelLabel, formatDuration } from '../../stores/agentStore';
import { useUIStore } from '../../stores/uiStore';

const FAILED_STATUSES = new Set(['error', 'failed', 'timeout', 'killed']);

// --- Metric Tile ---
function MetricTile({
  label,
  value,
  color,
  sub,
  pulse,
  border = true,
}: {
  label: string;
  value: number | string;
  color: string;
  sub?: string;
  pulse?: boolean;
  border?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-5 gap-0.5 relative"
      style={{ borderRight: border ? '1px solid var(--color-oa-border)' : undefined }}
    >
      {pulse && (
        <span
          className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
          style={{ background: color, animation: 'ccPulse 1.4s infinite' }}
        />
      )}
      <span
        className="text-4xl font-black tabular-nums leading-none"
        style={{ color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
      <span
        className="text-[9px] font-bold tracking-[0.18em] uppercase mt-1"
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

  const statusDot =
    agent.status === 'running'
      ? '#f97316'
      : agent.status === 'done'
      ? '#22c55e'
      : FAILED_STATUSES.has(agent.status)
      ? '#ef4444'
      : '#6b7280';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(agent.name)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(agent.name)}
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all"
      style={{
        background: selected ? 'rgba(249,115,22,0.08)' : 'transparent',
        borderLeft: `3px solid ${selected ? '#f97316' : 'transparent'}`,
        borderBottom: '1px solid var(--color-oa-border)',
        outline: 'none',
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
          background: statusDot,
          animation: isRunning ? 'ccPulse 1.4s infinite' : undefined,
          boxShadow: isRunning ? `0 0 6px ${statusDot}88` : undefined,
        }}
      />

      {/* Depth indent */}
      {agent.depth > 0 && (
        <span className="text-[10px] shrink-0" style={{ color: 'var(--color-oa-text-dim)', marginLeft: (agent.depth - 1) * 8 }}>
          ↳
        </span>
      )}

      {/* Name */}
      <span
        className="font-semibold text-[13px] truncate flex-1 leading-tight"
        style={{ color: selected ? '#f97316' : 'var(--color-oa-text)' }}
      >
        {agent.name}
      </span>

      {/* Unread badge */}
      {(agent.unread_messages ?? 0) > 0 && (
        <span className="bg-yellow-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
          {agent.unread_messages}
        </span>
      )}

      {/* Task */}
      <span
        className="text-[11px] truncate hidden sm:block"
        style={{ color: 'var(--color-oa-text-dim)', maxWidth: '260px' }}
      >
        {agent.task}
      </span>

      {/* Model pill */}
      <span
        className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 leading-none"
        style={{ background: `${mColor}18`, color: mColor }}
      >
        {modelLabel(agent.model)}
      </span>

      {/* Duration */}
      <span className="text-[11px] font-mono shrink-0 w-14 text-right" style={{ color: 'var(--color-oa-text-dim)' }}>
        {duration}
      </span>
    </div>
  );
}

// --- Section header ---
function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 sticky top-0 z-10"
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
          background: 'var(--color-oa-surface)',
        }}
      >
        <MetricTile label="Running" value={running.length} color="#f97316" pulse={running.length > 0} />
        <MetricTile label="Done" value={done.length} color="#22c55e" />
        <MetricTile label="Failed" value={failed.length} color="#ef4444" />
        <MetricTile label="Total" value={agents.length} color="var(--color-oa-text-muted)" />
        <MetricTile label="Uptime" value={uptime} color="var(--color-oa-text-muted)" border={false} />
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
          {running.length > 0 && (
            <>
              <SectionHeader label="Active" count={running.length} color="#f97316" />
              {running.map((a) => (
                <AgentRow key={a.name} agent={a} selected={selectedAgent === a.name} onSelect={selectAgent} />
              ))}
            </>
          )}
          {done.length > 0 && (
            <>
              <SectionHeader label="Completed" count={done.length} color="#22c55e" />
              {done.map((a) => (
                <AgentRow key={a.name} agent={a} selected={selectedAgent === a.name} onSelect={selectAgent} />
              ))}
            </>
          )}
          {failed.length > 0 && (
            <>
              <SectionHeader label="Failed" count={failed.length} color="#ef4444" />
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
