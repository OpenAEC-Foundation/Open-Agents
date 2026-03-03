import { useEffect } from 'react';
import { useAgentStore, formatDuration } from '../../stores/agentStore';
import { useUIStore } from '../../stores/uiStore';
import { StatusBadge } from '../shared/StatusBadge';
import { ModelBadge } from '../shared/ModelBadge';
import { Terminal } from '../shared/Terminal';
import { EmptyState } from '../shared/EmptyState';
import type { DetailTab } from '../../types';

const DETAIL_TABS: DetailTab[] = ['session', 'output', 'proposals', 'info'];

export function AgentDetail() {
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const detail = useAgentStore((s) => s.agentDetail);
  const proposals = useAgentStore((s) => s.proposals);
  const fetchDetail = useAgentStore((s) => s.fetchDetail);
  const killAgent = useAgentStore((s) => s.killAgent);
  const applyProposal = useAgentStore((s) => s.applyProposal);

  const activeTab = useUIStore((s) => s.activeDetailTab);
  const setTab = useUIStore((s) => s.setDetailTab);

  useEffect(() => {
    if (!selectedAgent) return;
    fetchDetail(selectedAgent);
    const interval = setInterval(() => fetchDetail(selectedAgent), 1500);
    return () => clearInterval(interval);
  }, [selectedAgent, fetchDetail]);

  if (!selectedAgent || !detail) {
    return <EmptyState message="Select an agent to view details" />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Detail header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-oa-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold">{detail.name}</span>
          <StatusBadge status={detail.status} />
          <ModelBadge model={detail.model} />
          <span className="font-mono text-xs text-oa-text-muted">
            {formatDuration(detail.created_at, detail.finished_at)}
          </span>
        </div>
        {detail.status === 'running' && (
          <button
            onClick={() => killAgent(detail.name)}
            className="px-3 py-1 bg-red-600 text-white rounded text-[11px] font-semibold cursor-pointer hover:bg-red-500"
          >
            Kill
          </button>
        )}
      </div>

      {/* Detail tabs */}
      <div className="flex border-b border-oa-border bg-oa-surface shrink-0">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={`px-4 py-2 text-xs font-semibold cursor-pointer transition-colors border-b-2 flex items-center gap-1 capitalize ${
              activeTab === tab
                ? 'text-oa-accent border-oa-accent'
                : 'text-oa-text-muted border-transparent hover:text-neutral-300'
            }`}
          >
            {tab}
            {tab === 'proposals' && proposals && proposals.proposals.length > 0 && (
              <span className="text-[10px] bg-oa-accent-bg px-1.5 py-px rounded-full text-oa-accent">
                {proposals.proposals.length}
              </span>
            )}
            {tab === 'session' && detail.status === 'running' && (
              <span className="w-1.5 h-1.5 rounded-full bg-status-done inline-block animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto relative">
        {activeTab === 'session' && (
          <Terminal content={detail.live_output || detail.result || ''} />
        )}

        {activeTab === 'output' && (
          <pre className="absolute inset-3 p-3 bg-neutral-900 border border-oa-border rounded-md font-mono text-xs leading-relaxed text-neutral-300 overflow-auto whitespace-pre-wrap break-words">
            {detail.result || 'No output yet.'}
          </pre>
        )}

        {activeTab === 'proposals' && (
          <div className="p-3 space-y-3">
            {proposals?.summary && (
              <div className="text-xs text-oa-text-muted bg-oa-bg p-3 rounded border border-oa-border-light">
                {proposals.summary}
              </div>
            )}
            {!proposals?.proposals.length ? (
              <div className="text-center text-oa-text-dim text-sm py-8">No proposals yet.</div>
            ) : (
              proposals.proposals.map((p) => (
                <div key={p.filename} className="border border-oa-border rounded-md overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-oa-surface border-b border-oa-border-light">
                    <span className="font-mono text-xs text-oa-accent">{p.filename}</span>
                    <button
                      onClick={() => applyProposal(detail.name, p.filename)}
                      className="px-2 py-0.5 bg-oa-accent text-oa-bg rounded text-[10px] font-bold cursor-pointer hover:brightness-110"
                    >
                      Apply
                    </button>
                  </div>
                  <pre className="p-3 text-xs font-mono text-neutral-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {p.content}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Name', detail.name],
                ['Status', detail.status],
                ['Model', detail.model],
                ['Parent', detail.parent || 'none'],
                ['Workspace', detail.workspace],
                ['Tmux', detail.tmux_window],
                ['Created', new Date(detail.created_at * 1000).toLocaleString()],
                ['Finished', detail.finished_at ? new Date(detail.finished_at * 1000).toLocaleString() : 'running'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-oa-text-muted font-semibold min-w-[80px]">{k}</span>
                  <span className="font-mono text-neutral-300 break-all">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest mb-2">Task</div>
              <div className="text-xs text-neutral-300 bg-oa-bg p-3 rounded border border-oa-border-light whitespace-pre-wrap">
                {detail.task}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
