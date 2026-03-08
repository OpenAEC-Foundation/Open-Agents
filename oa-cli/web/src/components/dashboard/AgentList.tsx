import { useState } from 'react';
import { Search } from 'lucide-react';
import { useAgentStore, modelColor, modelLabel, formatDuration } from '../../stores/agentStore';
import { SpawnForm } from './SpawnForm';

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'running': return 'bg-blue-100 text-blue-700';
    case 'done': return 'bg-green-100 text-green-700';
    case 'error':
    case 'failed': return 'bg-red-100 text-red-700';
    case 'timeout': return 'bg-amber-100 text-amber-700';
    case 'killed': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-500';
  }
}

export function AgentList() {
  const hierarchy = useAgentStore((s) => s.getHierarchy)();
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? hierarchy.filter(({ agent }) =>
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.task.toLowerCase().includes(search.toLowerCase())
      )
    : hierarchy;

  return (
    <div className="w-[280px] min-w-[280px] flex flex-col" style={{ backgroundColor: '#1a2a3a' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Agents
        </span>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-gray-200 focus-within:border-[#ff6b35] transition-colors">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="bg-transparent text-sm outline-none placeholder:text-gray-400 flex-1 min-w-0"
            style={{ color: '#1a2a3a' }}
          />
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {hierarchy.length === 0 ? (
              <>No agents yet.<br />Spawn one below.</>
            ) : (
              'No matches.'
            )}
          </div>
        ) : (
          filtered.map(({ agent, depth }) => {
            const isSelected = selectedAgent === agent.name;
            const isRunning = agent.status === 'running';
            const taskPreview = agent.task.length > 50
              ? agent.task.slice(0, 50) + '\u2026'
              : agent.task;

            return (
              <div
                key={agent.name}
                onClick={() => selectAgent(agent.name)}
                className={`cursor-pointer border-b transition-all duration-150 ${
                  isSelected
                    ? 'bg-orange-50 border-l-2 border-l-orange-500 border-b-orange-100'
                    : 'border-b-white/5 hover:bg-white/5'
                }`}
                style={{
                  paddingLeft: `${(isSelected ? 10 : 12) + depth * 16}px`,
                  paddingRight: '12px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                }}
              >
                {/* Top row: pulse dot + name + status badge */}
                <div className="flex items-center gap-2">
                  {isRunning && (
                    <span
                      className="w-2 h-2 rounded-full bg-blue-400 shrink-0"
                      style={{ animation: 'ccPulse 2s infinite' }}
                    />
                  )}
                  {depth > 0 && (
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>└</span>
                  )}
                  <span
                    className="text-sm font-semibold flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ color: isSelected ? '#1a2a3a' : 'rgba(255,255,255,0.9)' }}
                  >
                    {agent.name}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusBadgeClass(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>

                {/* Bottom row: model + duration + task preview */}
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs font-mono shrink-0"
                    style={{ color: modelColor(agent.model) }}
                  >
                    {modelLabel(agent.model)}
                  </span>
                  <span
                    className="text-xs shrink-0"
                    style={{ color: isSelected ? '#6b7b8d' : 'rgba(255,255,255,0.35)' }}
                  >
                    {formatDuration(agent.created_at, agent.finished_at)}
                  </span>
                  <span
                    className="text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-1"
                    style={{ color: isSelected ? '#6b7b8d' : 'rgba(255,255,255,0.35)' }}
                  >
                    {taskPreview}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <SpawnForm />
    </div>
  );
}
