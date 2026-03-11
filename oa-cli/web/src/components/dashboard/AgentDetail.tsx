import { useEffect, useState, useRef } from 'react';
import { useAgentStore, formatDuration } from '../../stores/agentStore';
import { useUIStore } from '../../stores/uiStore';
import { StatusBadge } from '../shared/StatusBadge';
import { ModelBadge } from '../shared/ModelBadge';
import { Terminal } from '../shared/Terminal';
import { EmptyState } from '../shared/EmptyState';
import { streamAgentOutput } from '../../api/client';
import type { SSEReconnectStatus, SSEStreamHandle } from '../../api/client';
import type { DetailTab } from '../../types';

const DETAIL_TABS: DetailTab[] = ['session', 'output', 'info'];

export function AgentDetail() {
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const detail = useAgentStore((s) => s.agentDetail);
  const fetchDetail = useAgentStore((s) => s.fetchDetail);
  const killAgent = useAgentStore((s) => s.killAgent);

  const activeTab = useUIStore((s) => s.activeDetailTab);
  const setTab = useUIStore((s) => s.setDetailTab);

  const [sseStatus, setSseStatus] = useState<SSEReconnectStatus | null>(null);
  const sseHandleRef = useRef<SSEStreamHandle | null>(null);

  useEffect(() => {
    if (!selectedAgent) return;
    fetchDetail(selectedAgent);
    const interval = setInterval(() => fetchDetail(selectedAgent), 1500);
    return () => clearInterval(interval);
  }, [selectedAgent, fetchDetail]);

  // SSE stream for live output with reconnect
  useEffect(() => {
    if (!selectedAgent) return;

    // Close any existing stream
    sseHandleRef.current?.close();

    const handle = streamAgentOutput(
      selectedAgent,
      (_output, _status) => {
        // Data is refreshed via polling in fetchDetail; SSE is for status tracking
      },
      (status) => setSseStatus(status)
    );
    sseHandleRef.current = handle;

    return () => {
      handle.close();
      sseHandleRef.current = null;
      setSseStatus(null);
    };
  }, [selectedAgent]);

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
          {(detail as any).remote_host && (
            <span
              className='text-[10px] font-semibold px-2 py-0.5 rounded-full'
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            >
              {(detail as any).remote_host}
            </span>
          )}
          <span className="font-mono text-xs text-oa-text-muted">
            {formatDuration(detail.created_at, detail.finished_at)}
          </span>
          {/* SSE reconnect status indicator */}
          {sseStatus && !sseStatus.connected && sseStatus.retryCount > 0 && (
            <span
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}
              title={`SSE reconnecting (attempt ${sseStatus.retryCount}/${10})`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-yellow-400"
                style={{ animation: 'ccPulse 1s infinite' }}
              />
              reconnecting…
            </span>
          )}
          {sseStatus && sseStatus.retryCount >= 10 && !sseStatus.connected && (
            <span
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}
              title="SSE stream disconnected after max retries"
            >
              stream offline
            </span>
          )}
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
                : 'text-oa-text-muted border-transparent hover:text-oa-text'
            }`}
          >
            {tab}
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
                ['Machine', (detail as any).remote_host || 'local'],
                ['Remote WS', (detail as any).remote_workspace || '-'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-oa-text-muted font-semibold min-w-[80px]">{k}</span>
                  <span className="font-mono break-all" style={{ color: 'var(--color-oa-text)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest mb-2">Task</div>
              <div
                className="text-xs bg-oa-bg p-3 rounded border border-oa-border-light whitespace-pre-wrap"
                style={{ color: 'var(--color-oa-text)' }}
              >
                {detail.task}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
