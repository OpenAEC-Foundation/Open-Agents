import { Zap, CheckCircle, XCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';

function eventMeta(color: string, text: string) {
  if (text.includes('spawned') || color === '#22d3ee') {
    return { Icon: Zap, textClass: 'text-cyan-400', dotClass: 'bg-cyan-400' };
  }
  if (color === '#4ade80') {
    return { Icon: CheckCircle, textClass: 'text-green-400', dotClass: 'bg-green-400' };
  }
  if (color === '#f87171') {
    return { Icon: XCircle, textClass: 'text-red-400', dotClass: 'bg-red-400' };
  }
  if (color === '#fbbf24') {
    return { Icon: AlertTriangle, textClass: 'text-yellow-400', dotClass: 'bg-yellow-400' };
  }
  if (color === '#9ca3af') {
    return { Icon: XCircle, textClass: 'text-neutral-500', dotClass: 'bg-neutral-500' };
  }
  return { Icon: MessageSquare, textClass: 'text-neutral-500', dotClass: 'bg-neutral-600' };
}

export function ActivityFeed() {
  const activityLog = useAgentStore((s) => s.activityLog);
  const recent = activityLog.slice(0, 20);

  return (
    <div className="flex-1 overflow-y-auto min-h-0 border-b border-oa-border">
      <div className="px-3 pt-2 pb-1 flex items-center justify-between sticky top-0 bg-neutral-950 z-10">
        <span className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest">Activity</span>
        {recent.length > 0 && (
          <span className="text-[10px] text-neutral-600">{recent.length}</span>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="px-3 py-2 text-[11px] text-oa-text-dim">No activity yet</div>
      ) : (
        <div className="px-2 pb-2">
          {recent.map((event) => {
            const { Icon, textClass, dotClass } = eventMeta(event.color, event.text);
            const time = new Date(event.time * 1000).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={event.id}
                className="flex items-start gap-2 py-1 px-1.5 rounded animate-fade-in group"
              >
                {/* Icon dot */}
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotClass}`} />
                {/* Text */}
                <span className={`text-[11px] flex-1 leading-snug ${textClass}`}>
                  {event.text}
                </span>
                {/* Timestamp */}
                <span className="text-[10px] text-neutral-700 group-hover:text-neutral-500 font-mono shrink-0 mt-0.5 transition-colors">
                  {time}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
