import { useEffect, useRef, useState } from 'react';
import { ClipboardCopy, ChevronRight } from 'lucide-react';
import { useAgentStore, statusColor, modelColor, formatDuration, modelLabel } from '../../stores/agentStore';
import type { Agent, Message } from '../../types';
import * as api from '../../api/client';

export function AgentPanel() {
  const selectedAgent = useAgentStore(s => s.selectedAgent);
  const agents = useAgentStore(s => s.agents);
  const killAgent = useAgentStore(s => s.killAgent);
  const [detail, setDetail] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [tab, setTab] = useState<'info' | 'messages' | 'output'>('info');
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
    const cleanup = api.streamAgentOutput(selectedAgent, (output) => {
      setStreamOutput(output);
    });
    return cleanup;
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
      <div className="w-[320px] min-w-[320px] border-l border-gray-200 bg-white flex items-center justify-center text-gray-400 text-sm">
        Select an agent on the canvas
      </div>
    );
  }

  const sColor = statusColor(agent.status);
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
    <div className="w-[320px] min-w-[320px] border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {breadcrumb.map((name, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-[10px] text-[#6b7b8d] font-mono">{name}</span>
                <ChevronRight size={9} className="text-gray-300" />
              </span>
            ))}
            <span className="text-[10px] text-[#1a2a3a] font-mono font-semibold">{agent.name}</span>
          </div>
        )}

        {/* Agent name + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {breadcrumb.length === 0 && (
            <span className="text-[#1a2a3a] font-bold text-sm">{agent.name}</span>
          )}
          {/* Status badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold border"
            style={{ background: `${sColor}18`, color: sColor, borderColor: `${sColor}35` }}
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
          <span className="text-[10px] text-[#6b7b8d] font-mono ml-auto">
            {formatDuration(agent.created_at, agent.finished_at)}
          </span>
        </div>

        {/* Depth indicator */}
        {agent.depth > 0 && (
          <div className="mt-1 text-[10px] text-[#6b7b8d]">
            depth {agent.depth}
            {agent.parent && <> · child of <span className="text-[#1a2a3a]">{agent.parent}</span></>}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        {(['info', 'messages', 'output'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors cursor-pointer border-b-2 ${
              tab === t
                ? 'text-[#ff6b35] border-[#ff6b35] bg-orange-50'
                : 'text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50'
            }`}
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
            <div className="text-xs uppercase text-gray-400 font-semibold tracking-wider mb-1">Task</div>
            <div className="text-xs text-[#1a2a3a] leading-relaxed">{agent.task}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400 font-semibold tracking-wider mb-1">Workspace</div>
            <div className="text-[10px] text-[#6b7b8d] font-mono break-all">{agent.workspace}</div>
          </div>
          {agent.max_children > 0 && (
            <div>
              <div className="text-xs uppercase text-gray-400 font-semibold tracking-wider mb-1">Children</div>
              <div className="text-xs text-[#1a2a3a]">
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
            <div className="text-gray-400 text-xs text-center py-4">No messages yet</div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-xl px-3 py-2 text-xs ${
                msg.from === selectedAgent
                  ? 'bg-orange-50 border border-orange-100 ml-6'
                  : 'bg-gray-100 border border-gray-200 mr-6'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-semibold text-[#1a2a3a]">{msg.from}</span>
                <span className="text-gray-400 ml-auto text-[10px]">
                  {new Date(msg.timestamp * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {!msg.read && <span className="text-[9px] bg-[#ff6b35] text-white px-1 rounded font-bold">NEW</span>}
              </div>
              <div className={`leading-relaxed whitespace-pre-wrap ${msg.from === selectedAgent ? 'text-[#ff6b35]' : 'text-[#6b7b8d]'}`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Output tab */}
      {tab === 'output' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">output</span>
              {outputLines.length > 0 && (
                <span className="text-[10px] text-gray-400">{outputLines.length} lines</span>
              )}
            </div>
            <button
              onClick={handleCopyOutput}
              disabled={!outputText}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ClipboardCopy size={11} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div
            ref={outputRef}
            className="flex-1 overflow-auto p-3 font-mono text-sm leading-relaxed bg-gray-50 rounded"
          >
            {outputLines.length === 0 ? (
              <div className="text-gray-400 text-xs">No output yet...</div>
            ) : (
              <pre className="text-[#1a2a3a] whitespace-pre-wrap break-all text-[11px]">
                {outputText}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Message input (messages tab) */}
      {tab === 'messages' && (
        <div className="p-3 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Message ${selectedAgent}...`}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-[#1a2a3a] placeholder-gray-400 focus:outline-none focus:border-[#ff6b35]"
            />
            <button
              onClick={handleSend}
              disabled={!msgInput.trim()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-[#ff6b35] hover:bg-[#e55a25] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
