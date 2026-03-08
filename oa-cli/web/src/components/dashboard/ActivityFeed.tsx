import { Zap, CheckCircle, XCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';

function eventMeta(color: string, text: string) {
  if (text.includes('spawned') || color === '#22d3ee') {
    return { Icon: Zap, iconClass: 'text-[#ff6b35]' };
  }
  if (color === '#4ade80') {
    return { Icon: CheckCircle, iconClass: 'text-green-500' };
  }
  if (color === '#f87171') {
    return { Icon: XCircle, iconClass: 'text-red-500' };
  }
  if (color === '#fbbf24') {
    return { Icon: AlertTriangle, iconClass: 'text-yellow-500' };
  }
  if (color === '#9ca3af') {
    return { Icon: XCircle, iconClass: 'text-gray-400' };
  }
  return { Icon: MessageSquare, iconClass: 'text-blue-400' };
}

export function ActivityFeed() {
  const activityLog = useAgentStore((s) => s.activityLog);
  const recent = activityLog.slice(0, 20);

  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-white border-r border-gray-200">
      <div className="px-3 pt-3 pb-1.5 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Activity</span>
        {recent.length > 0 && (
          <span className="text-[10px] text-gray-400">{recent.length}</span>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="px-3 py-3 text-xs text-gray-400">No activity yet</div>
      ) : (
        <div className="px-2 pb-2">
          {recent.map((event) => {
            const { Icon, iconClass } = eventMeta(event.color, event.text);
            const time = new Date(event.time * 1000).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={event.id}
                className="flex items-start gap-2 py-1.5 px-1.5 rounded hover:bg-gray-50 transition-colors group"
              >
                <Icon size={13} className={`${iconClass} shrink-0 mt-0.5`} />
                <span className="text-[11px] flex-1 leading-snug text-[#1e293b]">
                  {event.text}
                </span>
                <span className="text-[10px] text-gray-400 font-mono shrink-0 mt-0.5">
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
