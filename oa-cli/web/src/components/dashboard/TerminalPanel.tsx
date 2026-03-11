import { useEffect, useState } from 'react';
import { useAgentStore, statusColor, modelColor, formatDuration, modelLabel } from '../../stores/agentStore';
import * as api from '../../api/client';
import type { Agent } from '../../types';
import { XtermTerminal } from './XtermTerminal';
import { InteractiveTerminal } from './InteractiveTerminal';

const MAX_TABS = 8;

/** An agent tab shows agent output; a terminal tab shows an interactive shell */
type Tab =
  | { type: 'agent'; name: string }
  | { type: 'terminal'; id: string };

let _terminalCounter = 0;

export function TerminalPanel() {
  const selectedAgent = useAgentStore(s => s.selectedAgent);
  const agents = useAgentStore(s => s.agents);

  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, Agent>>({});

  function tabId(tab: Tab) {
    return tab.type === 'agent' ? `agent:${tab.name}` : `terminal:${tab.id}`;
  }

  // Auto-open tab when agent is selected in canvas
  useEffect(() => {
    if (!selectedAgent) return;
    const id = `agent:${selectedAgent}`;
    setOpenTabs(prev => {
      if (prev.some(t => tabId(t) === id)) return prev;
      const next: Tab[] = [...prev, { type: 'agent', name: selectedAgent }];
      if (next.length > MAX_TABS) next.shift();
      return next;
    });
    setActiveTabId(id);
  }, [selectedAgent]);

  // SSE stream for active running agent
  const activeAgentName = activeTabId?.startsWith('agent:') ? activeTabId.slice(6) : null;
  const activeAgent = agents.find(a => a.name === activeAgentName);
  useEffect(() => {
    if (!activeAgentName || activeAgent?.status !== 'running') return;
    const handle = api.streamAgentOutput(activeAgentName, (output) => {
      setOutputs(prev => ({ ...prev, [activeTabId!]: output }));
    });
    return () => handle.close();
  }, [activeTabId, activeAgent?.status]);

  // Poll detail for active agent tab
  useEffect(() => {
    if (!activeAgentName) return;

    async function load() {
      try {
        const d = await api.fetchAgentDetail(activeAgentName!);
        setDetails(prev => ({ ...prev, [activeAgentName!]: d }));
        if (d.status !== 'running') {
          const text = d.live_output || d.result || '';
          setOutputs(prev => ({ ...prev, [activeTabId!]: text }));
        }
      } catch {
        // bridge not running
      }
    }

    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [activeAgentName]);

  function openNewTerminal() {
    _terminalCounter += 1;
    const id = `t${_terminalCounter}`;
    const tab: Tab = { type: 'terminal', id };
    const tid = tabId(tab);
    setOpenTabs(prev => {
      const next = [...prev, tab];
      if (next.length > MAX_TABS) next.shift();
      return next;
    });
    setActiveTabId(tid);
  }

  function closeTab(tab: Tab, e: React.MouseEvent) {
    e.stopPropagation();
    const tid = tabId(tab);
    const remaining = openTabs.filter(t => tabId(t) !== tid);
    setOpenTabs(remaining);
    if (activeTabId === tid) {
      setActiveTabId(remaining.length > 0 ? tabId(remaining[remaining.length - 1]) : null);
    }
  }

  const activeTabObj = openTabs.find(t => tabId(t) === activeTabId) ?? null;
  const outputText = outputs[activeTabId ?? ''] ?? '';
  const activeDetail = activeAgentName ? details[activeAgentName] : undefined;

  if (openTabs.length === 0) {
    return (
      <div
        className="w-[360px] min-w-[360px] flex flex-col"
        style={{ borderLeft: '1px solid var(--color-oa-border)', background: '#0d0d0d' }}
      >
        <div className="flex items-center justify-end px-2 py-1 shrink-0 border-b" style={{ borderColor: '#1a1a1a', background: '#111' }}>
          <button
            onClick={openNewTerminal}
            title="Open interactive terminal"
            className="text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors"
            style={{ background: 'rgba(255,107,0,0.1)', color: '#ff6b00', border: '1px solid rgba(255,107,0,0.2)' }}
          >
            + terminal
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-1">
            <div className="text-[11px] font-mono" style={{ color: '#2d3748' }}>no agent selected</div>
            <div className="text-[10px]" style={{ color: '#1a202c' }}>click an agent to open terminal</div>
          </div>
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
        {openTabs.map(tab => {
          const tid = tabId(tab);
          const isActive = tid === activeTabId;
          const label = tab.type === 'agent' ? tab.name : `bash:${tab.id}`;
          const agent = tab.type === 'agent' ? agents.find(a => a.name === tab.name) : null;
          const sColor = agent ? statusColor(agent.status) : tab.type === 'terminal' ? '#00ff88' : '#4a5568';
          const isRunning = agent?.status === 'running';

          return (
            <button
              key={tid}
              onClick={() => setActiveTabId(tid)}
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
              <span className="max-w-[90px] truncate">{label}</span>
              <span
                onClick={(e) => closeTab(tab, e)}
                className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-[13px] leading-none"
                style={{ color: '#718096' }}
              >
                ×
              </span>
            </button>
          );
        })}

        {/* New terminal button */}
        <button
          onClick={openNewTerminal}
          title="Open new interactive terminal"
          className="ml-auto px-2 py-2 shrink-0 text-[11px] font-mono transition-colors cursor-pointer"
          style={{ color: '#4a5568' }}
        >
          +
        </button>
      </div>

      {/* Status bar (agent tabs only) */}
      {activeTabObj?.type === 'agent' && activeAgent && (
        <div
          className="flex items-center gap-2 px-3 py-1 shrink-0 border-b"
          style={{ borderColor: '#1a1a1a', background: '#111' }}
        >
          <span className="text-[10px] font-mono" style={{ color: '#4a5568' }}>
            {modelLabel(activeAgent.model)}
          </span>
          {activeAgent.status === 'running' && (
            <span className="text-[10px] font-mono animate-pulse" style={{ color: '#22d3ee' }}>● live</span>
          )}
          {activeAgent.status !== 'running' && (
            <span className="text-[10px] font-mono" style={{ color: statusColor(activeAgent.status) }}>
              {activeAgent.status}
            </span>
          )}
          <span className="ml-auto text-[10px] font-mono tabular-nums" style={{ color: '#2d3748' }}>
            {formatDuration(activeAgent.created_at, activeAgent.finished_at)}
          </span>
        </div>
      )}

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden" style={{ background: '#0a0a0a' }}>
        {activeTabObj?.type === 'terminal' ? (
          <InteractiveTerminal onClose={() => {
            if (activeTabObj) closeTab(activeTabObj, { stopPropagation: () => {} } as React.MouseEvent);
          }} />
        ) : outputText || activeTabId ? (
          <XtermTerminal
            output={outputText}
            agentName={activeAgentName ?? ''}
            isRunning={activeAgent?.status === 'running'}
            mode="readonly"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="font-mono text-[11px]" style={{ color: '#2d3748' }}>waiting for output...</span>
          </div>
        )}
      </div>

      {/* Bottom: task preview (agent tabs only) */}
      {activeTabObj?.type === 'agent' && activeDetail && (
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
