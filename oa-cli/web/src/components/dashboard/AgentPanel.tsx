import { useEffect, useRef, useState } from 'react';
import { ClipboardCopy, ChevronRight } from 'lucide-react';
import { useAgentStore, modelColor, formatDuration, modelLabel } from '../../stores/agentStore';
import type { Agent, Message } from '../../types';
import * as api from '../../api/client';
import { XtermTerminal } from './XtermTerminal';

function statusBadgeStyle(status: string) {
  const s = status === 'error' ? 'failed' : ['running', 'done', 'failed', 'timeout', 'killed'].includes(status) ? status : 'killed';
  return {
    color: `var(--color-status-${s})`,
    background: `color-mix(in srgb, var(--color-status-${s}) 12%, transparent)`,
    borderColor: `color-mix(in srgb, var(--color-status-${s}) 25%, transparent)`,
  };
}

export function AgentPanel() {
  const selectedAgent = useAgentStore(s => s.selectedAgent);
  const agents = useAgentStore(s => s.agents);
  const killAgent = useAgentStore(s => s.killAgent);
  const [detail, setDetail] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [tab, setTab] = useState<'info' | 'messages' | 'output'>('output');
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const agent = agents.find(a => a.name === selectedAgent);
  const [streamOutput, setStreamOutput] = useState<string>('');

  // SSE streaming for running agents
  useEffect(() => {
    if (!selectedAgent || agent?.status !== 'running') {
      setStreamOutput('');
      return;
    }
    const handle = api.streamAgentOutput(selectedAgent, (output) => {
      setStreamOutput(output);
    });
    return () => handle.close();
  }, [selectedAgent, agent?.status]);

  // Fetch detail and messages
  useEffect(() => {
    if (!selectedAgent) return;

    async function load() {
      try {
        const [d, m] = await Promise.all([
          api.fetchAgentDetail(selectedAgent!),
          api.fetchMessages(selectedAgent!),
        ]);
        setDetail(d);
        setMessages(m.messages);
      } catch {
        // bridge might not be running
      }
    }

    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [selectedAgent]);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (tab === 'output' && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [tab, streamOutput, detail?.live_output, detail?.result]);

  if (!selectedAgent || !agent) {
    return (
      <div
        className="w-full border-l flex items-center justify-center text-sm"
        style={{ borderColor: 'var(--color-oa-border)', background: 'var(--color-oa-surface)', color: 'var(--color-oa-text-dim)' }}
      >
        Select an agent on the canvas
      </div>
    );
  }

  const mColor = modelColor(agent.model);
  const outputText = (agent.status === 'running' && streamOutput) ? streamOutput : (detail?.live_output || detail?.result || '');

  // Build ancestor chain for breadcrumb
  const breadcrumb: string[] = [];
  let cur: Agent | undefined = agent;
  while (cur?.parent) {
    const par = agents.find(a => a.name === cur!.parent);
    if (par) {
      breadcrumb.unshift(par.name);
      cur = par;
    } else {
      breadcrumb.unshift(cur.parent);
      break;
    }
  }

  async function handleSend() {
    if (!msgInput.trim() || !selectedAgent) return;
    await api.sendMessage('user', selectedAgent, msgInput.trim());
    setMsgInput('');
    const m = await api.fetchMessages(selectedAgent);
    setMessages(m.messages);
  }

  function handleCopyOutput() {
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const outputLines = outputText ? outputText.split('\n') : [];

  return (
    <div
      className="w-full border-l flex flex-col"
      style={{ borderColor: 'var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-oa-border)' }}>
        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {breadcrumb.map((name, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-[10px] font-mono" style={{ color: 'var(--color-oa-text-muted)' }}>{name}</span>
                <ChevronRight size={9} style={{ color: 'var(--color-oa-text-dim)' }} />
              </span>
            ))}
            <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--color-oa-text)' }}>{agent.name}</span>
          </div>
        )}

        {/* Agent name + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {breadcrumb.length === 0 && (
            <span className="font-bold text-sm" style={{ color: 'var(--color-oa-text)' }}>{agent.name}</span>
          )}
          {/* Status badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold border"
            style={statusBadgeStyle(agent.status)}
          >
            {agent.status}
          </span>
          {/* Model badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold border"
            style={{ background: `${mColor}18`, color: mColor, borderColor: `${mColor}35` }}
          >
            {modelLabel(agent.model)}
          </span>
          {/* Duration */}
          <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--color-oa-text-muted)' }}>
            {formatDuration(agent.created_at, agent.finished_at)}
          </span>
        </div>

        {/* Depth indicator */}
        {agent.depth > 0 && (
          <div className="mt-1 text-[10px]" style={{ color: 'var(--color-oa-text-muted)' }}>
            depth {agent.depth}
            {agent.parent && <> · child of <span style={{ color: 'var(--color-oa-text)' }}>{agent.parent}</span></>}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--color-oa-border)', background: 'var(--color-oa-surface)' }}>
        {(['info', 'messages', 'output'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 text-[11px] font-medium transition-colors cursor-pointer border-b-2"
            style={
              tab === t
                ? { color: 'var(--color-oa-accent)', borderColor: 'var(--color-oa-accent)', background: 'var(--color-oa-accent-bg)' }
                : { color: 'var(--color-oa-text-muted)', borderColor: 'transparent' }
            }
            onMouseEnter={(e) => {
              if (tab !== t) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-oa-text)';
            }}
            onMouseLeave={(e) => {
              if (tab !== t) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-oa-text-muted)';
            }}
          >
            {t === 'messages'
              ? `Messages${messages.length > 0 ? ` (${messages.length})` : ''}`
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {tab === 'info' && (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <div className="text-xs uppercase font-semibold tracking-wider mb-1" style={{ color: 'var(--color-oa-text-dim)' }}>Task</div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--color-oa-text)' }}>{agent.task}</div>
          </div>
          {agent.remote_host && (
            <div>
              <div className="text-xs uppercase font-semibold tracking-wider mb-1" style={{ color: '#f59e0b' }}>Machine</div>
              <div
                className="text-[11px] font-mono px-2 py-1 rounded inline-flex items-center gap-1.5"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                <span>⬡</span>
                <span>{agent.remote_host}</span>
              </div>
            </div>
          )}
          <div>
            <div className="text-xs uppercase font-semibold tracking-wider mb-1" style={{ color: 'var(--color-oa-text-dim)' }}>Workspace</div>
            <div className="text-[10px] font-mono break-all" style={{ color: 'var(--color-oa-text-muted)' }}>{agent.workspace}</div>
          </div>
          {agent.max_children > 0 && (
            <div>
              <div className="text-xs uppercase font-semibold tracking-wider mb-1" style={{ color: 'var(--color-oa-text-dim)' }}>Children</div>
              <div className="text-xs" style={{ color: 'var(--color-oa-text)' }}>
                {agents.filter(a => a.parent === agent.name).length} / {agent.max_children} max
              </div>
            </div>
          )}
          {agent.status === 'running' && (
            <button
              onClick={() => killAgent(agent.name)}
              className="w-full py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              Kill Agent
            </button>
          )}
        </div>
      )}

      {/* Messages tab */}
      {tab === 'messages' && (
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-xs text-center py-4" style={{ color: 'var(--color-oa-text-dim)' }}>No messages yet</div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-xl px-3 py-2 text-xs border ${msg.from === selectedAgent ? 'ml-6' : 'mr-6'}`}
              style={
                msg.from === selectedAgent
                  ? { background: 'var(--color-oa-accent-bg)', borderColor: 'color-mix(in srgb, var(--color-oa-accent) 20%, transparent)' }
                  : { background: 'var(--color-oa-bg)', borderColor: 'var(--color-oa-border)' }
              }
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-semibold" style={{ color: 'var(--color-oa-text)' }}>{msg.from}</span>
                <span className="ml-auto text-[10px]" style={{ color: 'var(--color-oa-text-dim)' }}>
                  {new Date(msg.timestamp * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {!msg.read && (
                  <span
                    className="text-[9px] text-white px-1 rounded font-bold"
                    style={{ background: 'var(--color-oa-accent)' }}
                  >
                    NEW
                  </span>
                )}
              </div>
              <div
                className="leading-relaxed whitespace-pre-wrap"
                style={{ color: msg.from === selectedAgent ? 'var(--color-oa-accent)' : 'var(--color-oa-text-muted)' }}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Output tab */}
      {tab === 'output' && (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-oa-bg)' }}>
          <div
            className="flex items-center justify-between px-3 py-2 border-b"
            style={{ borderColor: 'var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--color-oa-text-dim)' }}>output</span>
              {outputLines.length > 0 && (
                <span className="text-[10px]" style={{ color: 'var(--color-oa-text-dim)' }}>{outputLines.length} lines</span>
              )}
            </div>
            <button
              onClick={handleCopyOutput}
              disabled={!outputText}
              className="flex items-center gap-1 text-[10px] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              style={{ color: 'var(--color-oa-text-dim)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-oa-text-muted)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-oa-text-dim)'; }}
            >
              <ClipboardCopy size={11} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="flex-1 overflow-hidden" style={{ background: '#0a0a0a' }}>
            {outputLines.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--color-oa-text-dim)' }}>No output yet...</div>
            ) : (
              <XtermTerminal
                output={outputText}
                agentName={agent.name}
                isRunning={agent.status === 'running'}
                mode="readonly"
              />
            )}
          </div>
        </div>
      )}

      {/* Message input (messages tab) */}
      {tab === 'messages' && (
        <div className="p-3 border-t" style={{ borderColor: 'var(--color-oa-border)' }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Message ${selectedAgent}...`}
              className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              style={{
                background: 'var(--color-oa-surface)',
                borderColor: 'var(--color-oa-border)',
                color: 'var(--color-oa-text)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-oa-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-oa-border)'; }}
            />
            <button
              onClick={handleSend}
              disabled={!msgInput.trim()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              style={{ background: 'var(--color-oa-accent)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
