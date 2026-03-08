import { Zap, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';

function eventMeta(color: string, text: string) {
  if (text.includes('spawned') || color === '#22d3ee') {
    return { Icon: Zap, bgClass: 'bg-cyan-950/60', iconClass: 'text-cyan-400' };
  }
  if (color === '#4ade80') {
    return { Icon: CheckCircle, bgClass: 'bg-green-950/60', iconClass: 'text-green-400' };
  }
  if (color === '#f87171') {
    return { Icon: XCircle, bgClass: 'bg-red-950/60', iconClass: 'text-red-400' };
  }
  if (color === '#fbbf24' || color === '#9ca3af') {
    return { Icon: XCircle, bgClass: 'bg-yellow-950/40', iconClass: 'text-yellow-400' };
  }
  return { Icon: MessageSquare, bgClass: 'bg-neutral-900/60', iconClass: 'text-neutral-400' };
}

export function ActivityFeed() {
  const activityLog = useAgentStore((s) => s.activityLog);
  const recent = activityLog.slice(0, 20);

  return (
    <div className="px-3 py-2 flex-1 overflow-y-auto">
      <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest mb-2">Activity</div>
      {recent.length === 0 ? (
        <div className="text-xs text-oa-text-dim">No activity yet</div>
      ) : (
        <div className="space-y-1">
          {recent.map((event) => {
            const { Icon, bgClass, iconClass } = eventMeta(event.color, event.text);
            return (
              <div
                key={event.id}
                className={`flex gap-2 text-[11px] animate-fade-in rounded px-1.5 py-1 ${bgClass}`}
              >
                <Icon size={12} className={`shrink-0 mt-0.5 ${iconClass}`} />
                <span className="font-mono text-oa-text-dim shrink-0">
                  {new Date(event.time * 1000).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span style={{ color: event.color }}>{event.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
