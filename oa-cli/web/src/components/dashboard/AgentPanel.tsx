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
      <div className="w-[320px] min-w-[320px] border-l border-neutral-800 bg-neutral-950 flex items-center justify-center text-neutral-600 text-sm">
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

  // Output lines with line numbers
  const outputLines = outputText ? outputText.split('\n') : [];

  return (
    <div className="w-[320px] min-w-[320px] border-l border-neutral-800 bg-neutral-950 flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-neutral-800">
        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            {breadcrumb.map((name, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-[10px] text-cyan-600 font-mono">{name}</span>
                <ChevronRight size={9} className="text-neutral-600" />
              </span>
            ))}
            <span className="text-[10px] text-cyan-400 font-mono font-semibold">{agent.name}</span>
          </div>
        )}

        {/* Agent name + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {breadcrumb.length === 0 && (
            <span className="text-white font-semibold text-sm">{agent.name}</span>
          )}
          {/* Status badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold border"
            style={{ background: `${sColor}15`, color: sColor, borderColor: `${sColor}30` }}
          >
            {agent.status}
          </span>
          {/* Model badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold border"
            style={{ background: `${mColor}15`, color: mColor, borderColor: `${mColor}30` }}
          >
            {modelLabel(agent.model)}
          </span>
          {/* Duration */}
          <span className="text-[10px] text-neutral-500 font-mono ml-auto">
            {formatDuration(agent.created_at, agent.finished_at)}
          </span>
        </div>

        {/* Depth indicator */}
        {agent.depth > 0 && (
          <div className="mt-1 text-[10px] text-neutral-600">
            depth {agent.depth}
            {agent.parent && <> · child of <span className="text-cyan-700">{agent.parent}</span></>}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-neutral-800">
        {(['info', 'messages', 'output'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
              tab === t
                ? 'text-oa-accent border-b-2 border-oa-accent bg-oa-accent/5'
                : 'text-oa-text-dim hover:text-oa-text'
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
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div>
            <div className="text-[10px] uppercase text-neutral-600 font-semibold tracking-wider mb-1">Task</div>
            <div className="text-[11px] text-neutral-300 leading-relaxed">{agent.task}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-neutral-600 font-semibold tracking-wider mb-1">Workspace</div>
            <div className="text-[10px] text-neutral-500 font-mono break-all">{agent.workspace}</div>
          </div>
          {agent.max_children > 0 && (
            <div>
              <div className="text-[10px] uppercase text-neutral-600 font-semibold tracking-wider mb-1">Children</div>
              <div className="text-[11px] text-neutral-400">
                {agents.filter(a => a.parent === agent.name).length} / {agent.max_children} max
              </div>
            </div>
          )}
          {agent.status === 'running' && (
            <button
              onClick={() => killAgent(agent.name)}
              className="w-full py-1.5 text-xs font-semibold rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/40 transition-colors cursor-pointer"
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
            <div className="text-neutral-600 text-xs text-center py-4">No messages yet</div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-xs ${
                msg.from === selectedAgent
                  ? 'bg-cyan-900/20 border border-cyan-800/30 ml-4'
                  : 'bg-neutral-800/50 border border-neutral-700/30 mr-4'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-semibold text-neutral-300">{msg.from}</span>
                <span className="text-neutral-600 ml-auto text-[10px]">
                  {new Date(msg.timestamp * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {!msg.read && <span className="text-[9px] bg-yellow-500 text-black px-1 rounded font-bold">NEW</span>}
              </div>
              <div className="text-neutral-400 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Terminal output tab */}
      {tab === 'output' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-black">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 bg-neutral-900/80">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">output</span>
              {outputLines.length > 0 && (
                <span className="text-[10px] text-neutral-600">{outputLines.length} lines</span>
              )}
            </div>
            <button
              onClick={handleCopyOutput}
              disabled={!outputText}
              className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ClipboardCopy size={11} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div
            ref={outputRef}
            className="flex-1 overflow-auto p-0 font-mono text-[11px] leading-[1.6]"
          >
            {outputLines.length === 0 ? (
              <div className="p-3 text-neutral-600">No output yet...</div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {outputLines.map((line, i) => (
                    <tr key={i} className="group hover:bg-neutral-900/40">
                      <td className="select-none text-right pr-3 pl-2 text-neutral-700 group-hover:text-neutral-500 text-[10px] w-8 align-top pt-px border-r border-neutral-800/60">
                        {i + 1}
                      </td>
                      <td className="pl-3 pr-2 text-green-400 whitespace-pre-wrap break-all align-top">
                        {line || '\u00a0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Message input (messages tab) */}
      {tab === 'messages' && (
        <div className="p-3 border-t border-neutral-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Message ${selectedAgent}...`}
              className="flex-1 bg-oa-bg border border-oa-border rounded-lg px-2.5 py-1.5 text-xs text-oa-text placeholder-oa-text-dim focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!msgInput.trim()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:brightness-110 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #f97316, #c2410c)' }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
