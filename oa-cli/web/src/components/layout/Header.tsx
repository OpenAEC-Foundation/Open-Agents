import { useEffect, useState } from 'react';
import { Activity, Bot, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useAgentStore, formatTime, formatDuration } from '../../stores/agentStore';
import { useUIStore } from '../../stores/uiStore';

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
    <header className="flex items-center justify-between px-5 py-2.5 border-b border-oa-border bg-oa-surface shrink-0">
      <div className="flex items-center gap-3">
        <span className="bg-gradient-to-br from-oa-accent to-cyan-600 text-oa-bg font-extrabold text-xs px-2 py-1 rounded-md tracking-wider">
          OA
        </span>
        <Bot size={15} className="text-oa-accent" />
        <h1 className="text-[15px] font-bold tracking-tight text-neutral-100">
          Open Agents Command Centre
        </h1>
        {running.length > 0 && (
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <span className="font-mono text-sm text-oa-text-muted tracking-wide">
          {formatTime(new Date(now))}
        </span>
        <span className="text-xs text-oa-text-dim">
          uptime{' '}
          <span className="font-mono text-neutral-400 text-xs">
            {formatDuration(sessionStart / 1000, null)}
          </span>
        </span>
        <div className="flex gap-1.5">
          {running.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-oa-accent-bg text-oa-accent font-semibold">
              <Zap size={10} className="shrink-0" />
              {running.length} active
            </span>
          )}
          {done.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-950 text-status-done font-semibold">
              <CheckCircle size={10} className="shrink-0" />
              {done.length} done
            </span>
          )}
          {failed.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-950 text-status-failed font-semibold">
              <XCircle size={10} className="shrink-0" />
              {failed.length} failed
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-400 font-semibold">
            <Activity size={10} className="shrink-0" />
            {agents.length} total
          </span>
        </div>
      </div>
    </header>
  );
}
