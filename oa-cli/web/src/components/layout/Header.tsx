import { useEffect, useState } from 'react';
import { Activity, Bot, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useAgentStore, formatTime, formatDuration } from '../../stores/agentStore';
import { useUIStore } from '../../stores/uiStore';
import { ThemePicker } from './ThemePicker';

export function Header() {
  const [now, setNow] = useState(Date.now());
  const agents = useAgentStore((s) => s.agents);
  const sessionStart = useUIStore((s) => s.sessionStart);

  const running = agents.filter((a) => a.status === 'running');
  const done = agents.filter((a) => a.status === 'done');
  const failed = agents.filter((a) => ['error', 'failed', 'timeout', 'killed'].includes(a.status));

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: 'var(--color-oa-surface)', borderBottom: '1px solid var(--color-oa-border)' }}>
      <div className="flex items-center gap-3">
        <span className="font-extrabold text-xs px-2 py-1 rounded-md tracking-wider text-white" style={{ background: 'var(--color-oa-accent)' }}>
          OA
        </span>
        <Bot size={15} style={{ color: 'var(--color-oa-accent)' }} />
        <h1 className="text-[15px] font-bold tracking-tight flex items-baseline gap-2" style={{ color: 'var(--color-oa-text)' }}>
          Open Agents
          <span className="text-[11px] font-medium" style={{ color: 'var(--color-oa-text-muted)' }}>
            by Impertio
          </span>
        </h1>
        {running.length > 0 && (
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="font-mono text-sm tracking-wide" style={{ color: 'var(--color-oa-text-muted)' }}>
          {formatTime(new Date(now))}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-oa-text-dim)' }}>
          uptime{' '}
          <span className="font-mono text-xs" style={{ color: 'var(--color-oa-text-muted)' }}>
            {formatDuration(sessionStart / 1000, null)}
          </span>
        </span>
        <div className="flex gap-1.5">
          {running.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-semibold">
              <Zap size={10} className="shrink-0" />
              {running.length} active
            </span>
          )}
          {done.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 font-semibold">
              <CheckCircle size={10} className="shrink-0" />
              {done.length} done
            </span>
          )}
          {failed.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200 font-semibold">
              <XCircle size={10} className="shrink-0" />
              {failed.length} failed
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--color-oa-bg)', border: '1px solid var(--color-oa-border)', color: 'var(--color-oa-text-muted)' }}>
            <Activity size={10} className="shrink-0" />
            {agents.length} total
          </span>
        </div>
        <ThemePicker />
      </div>
    </header>
  );
}
