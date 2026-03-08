import { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle,
  Cpu,
  LayoutDashboard,
  LayersIcon,
  Library,
  Settings,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { useAgentStore, formatTime, formatDuration } from '../../stores/agentStore';
import { useUIStore } from '../../stores/uiStore';
import type { MainTab } from '../../types';

const TABS: { id: MainTab; label: string; icon: React.ReactNode; highlight?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { id: 'builder', label: 'Agent Builder', icon: <Cpu size={15} /> },
  { id: 'templates', label: 'Templates', icon: <Library size={15} /> },
  { id: 'context', label: 'Context', icon: <LayersIcon size={15} /> },
  { id: 'teams', label: 'Teams', icon: <Users size={15} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={15} /> },
  { id: 'demo', label: 'Playground', icon: <Sparkles size={15} />, highlight: true },
];

export function Sidebar() {
  const [now, setNow] = useState(Date.now());
  const agents = useAgentStore((s) => s.agents);
  const sessionStart = useUIStore((s) => s.sessionStart);
  const activeTab = useUIStore((s) => s.activeMainTab);
  const setTab = useUIStore((s) => s.setMainTab);

  const running = agents.filter((a) => a.status === 'running');
  const done = agents.filter((a) => a.status === 'done');
  const failed = agents.filter((a) => ['error', 'failed', 'timeout', 'killed'].includes(a.status));

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-[196px] min-w-[196px] flex flex-col shrink-0" style={{ background: 'var(--color-oa-sidebar)', borderRight: '1px solid var(--color-oa-border)' }}>
      {/* Logo + status */}
      <div className="px-4 py-4 border-b border-oa-border">
        <div className="flex items-center gap-2.5">
          <span
            className="shrink-0 font-extrabold text-[11px] px-2 py-1 rounded-md tracking-widest text-white"
            style={{ background: 'linear-gradient(135deg, #f97316, #c2410c)' }}
          >
            OA
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-oa-text leading-tight">Open Agents</div>
            <div className="text-[10px] text-oa-text-dim font-mono mt-0.5">
              {formatTime(new Date(now))}
            </div>
          </div>
        </div>

        {/* Live status badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {running.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-oa-accent" style={{ animation: 'ccPulse 2s infinite' }} />
              {running.length} active
            </span>
          )}
          {done.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-950/60 text-green-400 font-semibold">
              <CheckCircle size={9} />
              {done.length}
            </span>
          )}
          {failed.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-950/60 text-red-400 font-semibold">
              <XCircle size={9} />
              {failed.length}
            </span>
          )}
          {agents.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-oa-text-dim font-semibold"
              style={{ background: 'var(--color-oa-border)' }}>
              <Activity size={9} />
              {agents.length}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer text-left ${
              activeTab === tab.id
                ? 'text-oa-accent'
                : tab.highlight
                ? 'text-oa-accent/60 hover:text-oa-accent'
                : 'text-oa-text-muted hover:text-oa-text'
            }`}
            style={
              activeTab === tab.id
                ? { background: 'rgba(249,115,22,0.10)' }
                : undefined
            }
          >
            <span className={activeTab === tab.id || tab.highlight ? 'text-oa-accent' : 'text-oa-text-dim'}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-oa-border">
        <div className="text-[10px] text-oa-text-dim">
          uptime{' '}
          <span className="font-mono text-oa-text-muted">
            {formatDuration(sessionStart / 1000, null)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Bot size={10} className="text-oa-text-dim" />
          <span className="text-[10px] text-oa-text-dim">Command Centre</span>
        </div>
      </div>
    </div>
  );
}
