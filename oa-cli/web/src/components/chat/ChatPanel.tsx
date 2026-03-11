/**
 * ChatPanel — local-first, provider-agnostic chat UI (issue #63 + #76).
 *
 * Connects to /api/chat/stream (SSE) and /api/chat/models.
 * Supports:
 *   claude/*   → Anthropic API (requires ANTHROPIC_API_KEY)
 *   ollama/*   → Local Ollama (WSL, no cloud)
 *   hetzner/*  → Remote GPU server via SSH (RTX 4000 Ada, no cloud, no API cost)
 *
 * OpenAI-compatible message format — not locked to any provider.
 * Conversation history stored in localStorage.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, ChevronDown, Bot, Zap, ExternalLink } from 'lucide-react';
import { API_BASE } from '../../api/client';

// Open WebUI URL on Hetzner — full chat UI for direct GPU model access
const OPEN_WEBUI_URL = 'http://144.76.60.210:3000';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  createdAt: number;
}

interface ModelOption {
  id: string;
  provider: string;
  name: string;
  gpu?: boolean;
}

const STORAGE_KEY = 'oa_chat_history';
const MAX_HISTORY = 100;

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(msgs: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY)));
  } catch {
    // Storage full — ignore.
  }
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('ollama/llama3.2');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModelSelect, setShowModelSelect] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingMsgId = useRef<string | null>(null);

  // Fetch available models once on mount.
  useEffect(() => {
    fetch(`${API_BASE}/api/chat/models`)
      .then((r) => r.json() as Promise<ModelOption[]>)
      .then((list) => {
        setModels(list);
        if (list.length > 0 && list[0]) {
          setModel(list[0].id);
        }
      })
      .catch(() => {
        // Backend unreachable — keep default model.
      });
  }, []);

  // Persist history whenever it changes.
  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // Scroll to bottom on new messages.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const appendDelta = useCallback((id: string, delta: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m,
      ),
    );
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    setError(null);

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };

    const assistantId = genId();
    streamingMsgId.current = assistantId;

    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      model,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    // Build messages array for the API (exclude streaming placeholder).
    const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

    try {
      const resp = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: history }),
      });

      if (!resp.ok || !resp.body) {
        const data = await resp.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          try {
            const event = JSON.parse(raw) as { delta?: string; done?: boolean; error?: string };
            if (event.error) throw new Error(event.error);
            if (event.delta) appendDelta(assistantId, event.delta);
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'unexpected end of JSON input') {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Remove the empty assistant message on error.
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
      streamingMsgId.current = null;
    }
  }, [input, streaming, messages, model, appendDelta]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const currentModelName = models.find((m) => m.id === model)?.name ?? model;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-oa-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
      >
        <div className="flex items-center gap-2">
          <Bot size={16} style={{ color: 'var(--color-oa-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-oa-text)' }}>
            Chat
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-oa-border)', color: 'var(--color-oa-text-muted)' }}>
            local-first · no cloud
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelect((v) => !v)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{
                background: 'var(--color-oa-border)',
                color: 'var(--color-oa-text)',
                border: '1px solid var(--color-oa-border)',
              }}
            >
              {currentModelName}
              <ChevronDown size={12} />
            </button>

            {showModelSelect && (
              <div
                className="absolute right-0 top-full mt-1 z-50 min-w-[220px] rounded shadow-lg overflow-hidden"
                style={{ background: 'var(--color-oa-surface)', border: '1px solid var(--color-oa-border)' }}
              >
                {models.length === 0 ? (
                  <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-oa-text-muted)' }}>
                    No models found. Start Ollama or connect to Hetzner.
                  </div>
                ) : (
                  (['hetzner', 'ollama', 'claude'] as const).map((provider) => {
                    const group = models.filter((m) => m.provider === provider);
                    if (group.length === 0) return null;
                    const labels: Record<string, string> = {
                      hetzner: '⚡ GPU Server (Hetzner)',
                      ollama: '🖥 Local (Ollama)',
                      claude: '☁ Claude API',
                    };
                    return (
                      <div key={provider}>
                        <div
                          className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--color-oa-text-muted)', borderBottom: '1px solid var(--color-oa-border)' }}
                        >
                          {labels[provider]}
                        </div>
                        {group.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => { setModel(m.id); setShowModelSelect(false); }}
                            className="w-full text-left px-3 py-1.5 text-xs"
                            style={{
                              color: m.id === model ? 'var(--color-oa-accent)' : 'var(--color-oa-text)',
                              background: m.id === model ? 'rgba(249,115,22,0.08)' : 'transparent',
                            }}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Open WebUI link — full GPU chat UI */}
          <a
            href={OPEN_WEBUI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded"
            style={{
              background: 'rgba(249,115,22,0.08)',
              color: 'var(--color-oa-accent)',
              border: '1px solid rgba(249,115,22,0.2)',
              textDecoration: 'none',
            }}
            title="Open WebUI — full chat interface on GPU server"
          >
            <Zap size={11} />
            Open WebUI
            <ExternalLink size={10} />
          </a>

          {/* Clear history */}
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-1.5 rounded"
              style={{ color: 'var(--color-oa-text-muted)' }}
              title="Clear conversation"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <Bot size={32} style={{ color: 'var(--color-oa-text-muted)' }} />
            <div className="text-center">
              <p className="text-sm" style={{ color: 'var(--color-oa-text-muted)' }}>
                {model.startsWith('hetzner/') ? '⚡ GPU' : model.startsWith('ollama/') ? '🖥 Local' : '🤖'} {currentModelName}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-oa-text-muted)' }}>
                {model.startsWith('hetzner/')
                  ? 'RTX 4000 Ada · no cloud · no cost'
                  : model.startsWith('ollama/')
                  ? 'local Ollama · no cloud · no cost'
                  : 'API required'}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className="max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words"
              style={{
                background: msg.role === 'user'
                  ? 'rgba(249,115,22,0.12)'
                  : 'var(--color-oa-surface)',
                color: 'var(--color-oa-text)',
                border: msg.role === 'assistant' ? '1px solid var(--color-oa-border)' : 'none',
              }}
            >
              {msg.content || (
                <span className="opacity-50 text-xs">
                  <span style={{ animation: 'ccPulse 1.5s infinite' }}>●</span>
                </span>
              )}
            </div>
            {msg.role === 'assistant' && msg.model && (
              <span className="text-[10px]" style={{ color: 'var(--color-oa-text-muted)' }}>
                {msg.model}
              </span>
            )}
          </div>
        ))}

        {error && (
          <div
            className="text-sm px-3 py-2 rounded"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            {error}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderTop: '1px solid var(--color-oa-border)', background: 'var(--color-oa-surface)' }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none rounded px-3 py-2 text-sm"
            style={{
              background: 'var(--color-oa-bg)',
              color: 'var(--color-oa-text)',
              border: '1px solid var(--color-oa-border)',
              maxHeight: '160px',
              overflowY: 'auto',
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
            }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 p-2 rounded"
            style={{
              background: input.trim() && !streaming ? 'var(--color-oa-accent)' : 'var(--color-oa-border)',
              color: input.trim() && !streaming ? '#fff' : 'var(--color-oa-text-muted)',
              cursor: input.trim() && !streaming ? 'pointer' : 'default',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
