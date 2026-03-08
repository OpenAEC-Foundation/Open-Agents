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
    <header
      className="flex items-center justify-between px-5 py-2.5 shrink-0 border-b border-[#2d4356]"
      style={{ background: '#1a2a3a' }}
    >
      <div className="flex items-center gap-3">
        <span
          className="font-extrabold text-xs px-2 py-1 rounded-md tracking-wider text-white"
          style={{ background: '#ff6b35' }}
        >
          OA
        </span>
        <Bot size={15} className="text-[#ff6b35]" />
        <h1 className="text-[15px] font-bold tracking-tight text-white flex items-baseline gap-2">
          Open Agents
          <span className="text-[11px] font-medium text-gray-400">
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

      <div className="flex items-center gap-5">
        <span className="font-mono text-sm text-gray-400 tracking-wide">
          {formatTime(new Date(now))}
        </span>
        <span className="text-xs text-gray-500">
          uptime{' '}
          <span className="font-mono text-gray-400 text-xs">
            {formatDuration(sessionStart / 1000, null)}
          </span>
        </span>
        <div className="flex gap-1.5">
          {running.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 font-semibold">
              <Zap size={10} className="shrink-0" />
              {running.length} active
            </span>
          )}
          {done.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 font-semibold">
              <CheckCircle size={10} className="shrink-0" />
              {done.length} done
            </span>
          )}
          {failed.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 font-semibold">
              <XCircle size={10} className="shrink-0" />
              {failed.length} failed
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-gray-300 font-semibold">
            <Activity size={10} className="shrink-0" />
            {agents.length} total
          </span>
        </div>
      </div>
    </header>
  );
}
