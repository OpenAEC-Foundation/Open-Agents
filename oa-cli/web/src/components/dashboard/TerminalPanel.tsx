import { useEffect, useState } from 'react';
import { useAgentStore, statusColor, modelColor, formatDuration, modelLabel } from '../../stores/agentStore';
import * as api from '../../api/client';
import type { Agent } from '../../types';
import { XtermTerminal } from './XtermTerminal';

const MAX_TABS = 8;

export function TerminalPanel() {
  const selectedAgent = useAgentStore(s => s.selectedAgent);
  const agents = useAgentStore(s => s.agents);

  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, Agent>>({});

  // Auto-open tab when agent is selected in canvas
  useEffect(() => {
    if (!selectedAgent) return;
    setOpenTabs(prev => {
      if (prev.includes(selectedAgent)) return prev;
      const next = [...prev, selectedAgent];
      if (next.length > MAX_TABS) next.shift();
      return next;
    });
    setActiveTab(selectedAgent);
  }, [selectedAgent]);

  // SSE stream for active running agent
  const activeAgent = agents.find(a => a.name === activeTab);
  useEffect(() => {
    if (!activeTab || activeAgent?.status !== 'running') return;
    const handle = api.streamAgentOutput(activeTab, (output) => {
      setOutputs(prev => ({ ...prev, [activeTab]: output }));
    });
    return () => handle.close();
  }, [activeTab, activeAgent?.status]);

  // Poll detail for active tab
  useEffect(() => {
    if (!activeTab) return;

    async function load() {
      try {
        const d = await api.fetchAgentDetail(activeTab!);
        setDetails(prev => ({ ...prev, [activeTab!]: d }));
        if (d.status !== 'running') {
          const text = d.live_output || d.result || '';
          setOutputs(prev => ({ ...prev, [activeTab!]: text }));
        }
      } catch {
        // bridge not running
      }
    }

    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [activeTab]);

  function closeTab(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    const remaining = openTabs.filter(t => t !== name);
    setOpenTabs(remaining);
    if (activeTab === name) {
      setActiveTab(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    }
  }

  const outputText = outputs[activeTab ?? ''] ?? '';
  const activeDetail = details[activeTab ?? ''];

  if (openTabs.length === 0) {
    return (
      <div
        className="w-[360px] min-w-[360px] flex items-center justify-center"
        style={{ borderLeft: '1px solid var(--color-oa-border)', background: '#0d0d0d' }}
      >
        <div className="text-center space-y-1">
          <div className="text-[11px] font-mono" style={{ color: '#2d3748' }}>no agent selected</div>
          <div className="text-[10px]" style={{ color: '#1a202c' }}>click an agent to open terminal</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-[360px] min-w-[360px] flex flex-col"
      style={{ borderLeft: '1px solid var(--color-oa-border)', background: '#0d0d0d' }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center overflow-x-auto shrink-0 border-b"
        style={{ borderColor: '#1a1a1a', background: '#111', scrollbarWidth: 'none' }}
      >
        {openTabs.map(name => {
          const agent = agents.find(a => a.name === name);
          const isActive = name === activeTab;
          const sColor = agent ? statusColor(agent.status) : '#4a5568';
          const isRunning = agent?.status === 'running';

          return (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className="flex items-center gap-1.5 px-3 py-2 shrink-0 text-[11px] font-mono border-b-2 transition-colors cursor-pointer group"
              style={{
                borderColor: isActive ? 'var(--color-oa-accent)' : 'transparent',
                color: isActive ? '#e2e8f0' : '#4a5568',
                background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
              }}
            >
              {/* Status dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? 'animate-pulse' : ''}`}
                style={{ background: sColor }}
              />
              <span className="max-w-[90px] truncate">{name}</span>
              <span
                onClick={(e) => closeTab(name, e)}
                className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-[13px] leading-none"
                style={{ color: '#718096' }}
              >
                ×
              </span>
            </button>
          );
        })}
      </div>

      {/* Status bar */}
      {activeAgent && (
        <div
          className="flex items-center gap-2 px-3 py-1 shrink-0 border-b"
          style={{ borderColor: '#1a1a1a', background: '#111' }}
        >
          <span className="text-[10px] font-mono" style={{ color: '#4a5568' }}>
            {modelLabel(activeAgent.model)}
          </span>
          {activeAgent.status === 'running' && (
            <>
              <span className="text-[10px] font-mono animate-pulse" style={{ color: '#22d3ee' }}>● live</span>
            </>
          )}
          {activeAgent.status !== 'running' && (
            <span
              className="text-[10px] font-mono"
              style={{ color: statusColor(activeAgent.status) }}
            >
              {activeAgent.status}
            </span>
          )}
          <span className="ml-auto text-[10px] font-mono tabular-nums" style={{ color: '#2d3748' }}>
            {formatDuration(activeAgent.created_at, activeAgent.finished_at)}
          </span>
        </div>
      )}

      {/* Terminal output */}
      <div className="flex-1 overflow-hidden" style={{ background: '#0a0a0a' }}>
        {outputText || activeTab ? (
          <XtermTerminal
            output={outputText}
            agentName={activeTab ?? ''}
            isRunning={activeAgent?.status === 'running'}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="font-mono text-[11px]" style={{ color: '#2d3748' }}>waiting for output...</span>
          </div>
        )}
      </div>

      {/* Bottom: task preview */}
      {activeDetail && (
        <div
          className="shrink-0 px-3 py-2 border-t"
          style={{ borderColor: '#1a1a1a', background: '#111' }}
        >
          <div
            className="text-[10px] font-mono leading-relaxed line-clamp-2"
            style={{ color: '#374151' }}
            title={activeDetail.task}
          >
            {activeDetail.task?.split('\n')[0] ?? ''}
          </div>
        </div>
      )}
    </div>
  );
}
