import { useAgentStore, modelLabel, modelColor, formatDuration } from '../../stores/agentStore';
import { useUIStore } from '../../stores/uiStore';

export function SystemHealth() {
  const agents = useAgentStore((s) => s.agents);
  const running = useAgentStore((s) => s.getRunning)();
  const done = useAgentStore((s) => s.getDone)();
  const failed = useAgentStore((s) => s.getFailed)();
  const modelDist = useAgentStore((s) => s.getModelDistribution)();
  const sessionStart = useUIStore((s) => s.sessionStart);

  const successRate = done.length + failed.length > 0
    ? Math.round((done.length / (done.length + failed.length)) * 100)
    : agents.length > 0 ? 100 : 0;

  const successBarColor = successRate >= 80 ? '#4ade80' : successRate >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div className="flex flex-col overflow-y-auto">
      {/* Active agents — prominent counter */}
      <div className="px-3 py-3 border-b border-oa-border-light">
        <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest mb-1">Active Agents</div>
        <div className="flex items-end gap-2">
          <div className="text-5xl font-bold text-oa-accent font-mono leading-none">{running.length}</div>
          <div className="text-xs text-oa-text-dim mb-1">running</div>
        </div>
      </div>

      {/* Model distribution */}
      <div className="px-3 py-2 border-b border-oa-border-light">
        <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest mb-2">Models</div>
        {modelDist.length === 0 ? (
          <div className="text-xs text-oa-text-dim">No agents</div>
        ) : (
          <div className="space-y-1.5">
            {modelDist.map((m) => (
              <div key={m.label} className="flex items-center gap-2 text-xs">
                <span
                  className="font-mono min-w-[60px]"
                  style={{ color: modelColor(m.model) }}
                >
                  {modelLabel(m.model)}
                </span>
                <div className="flex-1 bg-neutral-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (m.count / Math.max(1, agents.length)) * 100)}%`,
                      background: modelColor(m.model),
                    }}
                  />
                </div>
                <span className="font-mono text-neutral-400 min-w-[16px] text-right">{m.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resources */}
      <div className="px-3 py-2 border-b border-oa-border-light">
        <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest mb-2">Resources</div>
        <div className="space-y-1 text-xs">
          {[
            ['Uptime', formatDuration(sessionStart / 1000, null)],
            ['Total', `${agents.length}`],
            ['Completed', `${done.length}`],
            ['Failed', `${failed.length}`],
            ['Session tokens', '0'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-oa-text-dim">{label}</span>
              <span className="font-mono text-neutral-300">{value}</span>
            </div>
          ))}

          {/* Success rate with progress bar */}
          <div className="pt-0.5">
            <div className="flex justify-between mb-1">
              <span className="text-oa-text-dim">Success Rate</span>
              <span className="font-mono text-neutral-300">{successRate}%</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${successRate}%`, background: successBarColor }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
