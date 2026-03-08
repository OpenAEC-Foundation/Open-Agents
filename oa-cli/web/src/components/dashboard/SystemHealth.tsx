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
    <div className="flex flex-col overflow-y-auto p-3 gap-3">
      {/* Active agents — prominent counter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Active Agents</div>
        <div className="flex items-end gap-2">
          <div className="text-4xl font-black text-[#1e293b] font-mono leading-none">{running.length}</div>
          <div className="text-xs text-gray-400 mb-1">running</div>
        </div>
      </div>

      {/* Model distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Models</div>
        {modelDist.length === 0 ? (
          <div className="text-xs text-gray-400">No agents</div>
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
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (m.count / Math.max(1, agents.length)) * 100)}%`,
                      background: modelColor(m.model),
                    }}
                  />
                </div>
                <span className="font-mono text-gray-500 min-w-[16px] text-right">{m.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resources */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Resources</div>
        <div className="space-y-1.5 text-xs">
          {[
            ['Uptime', formatDuration(sessionStart / 1000, null)],
            ['Total', `${agents.length}`],
            ['Completed', `${done.length}`],
            ['Failed', `${failed.length}`],
            ['Session tokens', '0'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-400">{label}</span>
              <span className="font-mono text-[#1e293b]">{value}</span>
            </div>
          ))}

          {/* Success rate with progress bar */}
          <div className="pt-1">
            <div className="flex justify-between mb-1.5">
              <span className="text-gray-400">Success Rate</span>
              <span className="font-mono text-[#1e293b]">{successRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
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
