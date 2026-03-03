import { useAgentStore } from '../../stores/agentStore';

export function ActivityFeed() {
  const activityLog = useAgentStore((s) => s.activityLog);

  return (
    <div className="px-3 py-2 flex-1 overflow-y-auto">
      <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest mb-2">Activity</div>
      {activityLog.length === 0 ? (
        <div className="text-xs text-oa-text-dim">No activity yet</div>
      ) : (
        <div className="space-y-1">
          {activityLog.map((event) => (
            <div
              key={event.id}
              className="flex gap-2 text-[11px] animate-fade-in"
            >
              <span className="font-mono text-oa-text-dim shrink-0">
                {new Date(event.time * 1000).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span style={{ color: event.color }}>{event.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
