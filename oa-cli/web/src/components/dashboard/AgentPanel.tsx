import { useEffect, useState } from 'react';
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

  const agent = agents.find(a => a.name === selectedAgent);

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

  if (!selectedAgent || !agent) {
    return (
      <div className="w-[320px] min-w-[320px] border-l border-neutral-800 bg-neutral-950 flex items-center justify-center text-neutral-600 text-sm">
        Select an agent on the canvas
      </div>
    );
  }

  const sColor = statusColor(agent.status);
  const mColor = modelColor(agent.model);

  async function handleSend() {
    if (!msgInput.trim() || !selectedAgent) return;
    await api.sendMessage('user', selectedAgent, msgInput.trim());
    setMsgInput('');
    // Refresh messages
    const m = await api.fetchMessages(selectedAgent);
    setMessages(m.messages);
  }

  return (
    <div className="w-[320px] min-w-[320px] border-l border-neutral-800 bg-neutral-950 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: sColor }} />
          <span className="text-white font-semibold text-sm">{agent.name}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-auto"
            style={{ background: `${mColor}20`, color: mColor }}
          >
            {modelLabel(agent.model)}
          </span>
        </div>
        <div className="text-[11px] text-neutral-500 mt-1">
          {agent.status} &middot; {formatDuration(agent.created_at, agent.finished_at)}
          {agent.parent && <> &middot; child of <span className="text-cyan-400">{agent.parent}</span></>}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-neutral-800">
        {(['info', 'messages', 'output'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t === 'messages' ? `Messages ${messages.length > 0 ? `(${messages.length})` : ''}` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {tab === 'info' && (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase text-neutral-600 font-medium">Task</div>
              <div className="text-xs text-neutral-300 mt-0.5 leading-relaxed">{agent.task}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-neutral-600 font-medium">Workspace</div>
              <div className="text-[11px] text-neutral-500 mt-0.5 font-mono break-all">{agent.workspace}</div>
            </div>
            {agent.status === 'running' && (
              <button
                onClick={() => killAgent(agent.name)}
                className="w-full mt-2 py-1.5 text-xs font-medium rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
              >
                Kill Agent
              </button>
            )}
          </div>
        )}

        {tab === 'messages' && (
          <div className="space-y-2">
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
                  <span className="text-neutral-600">
                    {new Date(msg.timestamp * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {!msg.read && <span className="text-[9px] bg-yellow-500 text-black px-1 rounded font-bold">NEW</span>}
                </div>
                <div className="text-neutral-400 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'output' && (
          <div className="text-xs font-mono text-neutral-400 whitespace-pre-wrap leading-relaxed">
            {detail?.live_output || detail?.result || 'No output yet...'}
          </div>
        )}
      </div>

      {/* Message input (always visible in messages tab) */}
      {tab === 'messages' && (
        <div className="p-3 border-t border-neutral-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Message ${selectedAgent}...`}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-600"
            />
            <button
              onClick={handleSend}
              disabled={!msgInput.trim()}
              className="px-3 py-1.5 text-xs font-medium rounded bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
