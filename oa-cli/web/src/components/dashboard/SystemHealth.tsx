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

  const successBarColor =
    successRate >= 80
      ? 'var(--color-status-running)'
      : successRate >= 50
      ? 'var(--color-status-waiting)'
      : 'var(--color-status-failed)';

  return (
    <div className="flex flex-col overflow-y-auto p-3 gap-3">
      {/* Active agents — prominent counter */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--color-oa-surface)', borderColor: 'var(--color-oa-border)' }}
      >
        <div
          className="text-xs font-bold uppercase tracking-wide mb-1"
          style={{ color: 'var(--color-oa-text-dim)' }}
        >
          Active Agents
        </div>
        <div className="flex items-end gap-2">
          <div
            className="text-4xl font-black font-mono leading-none"
            style={{ color: 'var(--color-oa-text)' }}
          >
            {running.length}
          </div>
          <div className="text-xs mb-1" style={{ color: 'var(--color-oa-text-dim)' }}>running</div>
        </div>
      </div>

      {/* Model distribution */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--color-oa-surface)', borderColor: 'var(--color-oa-border)' }}
      >
        <div
          className="text-xs font-bold uppercase tracking-wide mb-3"
          style={{ color: 'var(--color-oa-text-dim)' }}
        >
          Models
        </div>
        {modelDist.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--color-oa-text-dim)' }}>No agents</div>
        ) : (
          <div className="space-y-2">
            {modelDist.map((m) => (
              <div key={m.label} className="flex items-center gap-2 text-xs">
                <span
                  className="font-mono min-w-[60px]"
                  style={{ color: modelColor(m.model) }}
                >
                  {modelLabel(m.model)}
                </span>
                <div
                  className="flex-1 rounded-full h-1.5"
                  style={{ background: 'var(--color-oa-accent-bg)' }}
                >
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (m.count / Math.max(1, agents.length)) * 100)}%`,
                      background: modelColor(m.model),
                    }}
                  />
                </div>
                <span
                  className="font-mono min-w-[16px] text-right"
                  style={{ color: 'var(--color-oa-text-muted)' }}
                >
                  {m.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resources */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--color-oa-surface)', borderColor: 'var(--color-oa-border)' }}
      >
        <div
          className="text-xs font-bold uppercase tracking-wide mb-3"
          style={{ color: 'var(--color-oa-text-dim)' }}
        >
          Resources
        </div>
        <div className="space-y-1.5 text-xs">
          {[
            ['Uptime', formatDuration(sessionStart / 1000, null)],
            ['Total', `${agents.length}`],
            ['Completed', `${done.length}`],
            ['Failed', `${failed.length}`],
            ['Session tokens', '0'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: 'var(--color-oa-text-dim)' }}>{label}</span>
              <span className="font-mono" style={{ color: 'var(--color-oa-text)' }}>{value}</span>
            </div>
          ))}

          {/* Success rate with progress bar */}
          <div className="pt-1">
            <div className="flex justify-between mb-1.5">
              <span style={{ color: 'var(--color-oa-text-dim)' }}>Success Rate</span>
              <span className="font-mono" style={{ color: 'var(--color-oa-text)' }}>{successRate}%</span>
            </div>
            <div
              className="w-full rounded-full h-1.5"
              style={{ background: 'var(--color-oa-accent-bg)' }}
            >
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
