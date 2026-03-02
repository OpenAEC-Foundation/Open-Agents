// =============================================
// AI Assembly Assistant Sidebar (Sprint 6c — FR-18, FR-19)
// =============================================

import { useState, useRef, useEffect } from "react";
import type { AssistantContext, CanvasAction } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

const CONTEXT_OPTIONS: { value: AssistantContext; label: string }[] = [
  { value: "neutral", label: "General" },
  { value: "code-review", label: "Code Review" },
  { value: "security", label: "Security" },
  { value: "erpnext", label: "ERPNext" },
];

function ActionCard({ action, onApply }: { action: CanvasAction; onApply: () => void }) {
  let label = "";
  let detail = "";

  switch (action.type) {
    case "add-node":
      label = "Add Node";
      detail = action.data.name;
      break;
    case "remove-node":
      label = "Remove Node";
      detail = action.nodeId;
      break;
    case "update-node":
      label = "Update Node";
      detail = action.nodeId;
      break;
    case "add-edge":
      label = "Add Edge";
      detail = `${action.source} → ${action.target}`;
      break;
    case "replace-all":
      label = "Replace Canvas";
      detail = `${action.config.nodes.length} nodes`;
      break;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-accent-primary/10 border border-accent-primary/20 rounded-md text-sm">
      <div className="flex-1 min-w-0">
        <span className="font-medium text-accent-primary">{label}</span>
        <span className="text-text-secondary ml-1.5 truncate">{detail}</span>
      </div>
      <button
        onClick={onApply}
        className="shrink-0 px-2 py-0.5 bg-accent-primary text-text-primary rounded text-xs hover:bg-accent-primary-hover"
      >
        Apply
      </button>
    </div>
  );
}

/** Strip <canvas-action>...</canvas-action> blocks from display text */
function stripActionBlocks(text: string): string {
  return text.replace(/<canvas-action>[\s\S]*?<\/canvas-action>/g, "").trim();
}

export function AssistantSidebar() {
  const visible = useAppStore((s) => s.assistantVisible);
  const messages = useAppStore((s) => s.assistantMessages);
  const streaming = useAppStore((s) => s.assistantStreaming);
  const streamingContent = useAppStore((s) => s.assistantStreamingContent);
  const pendingActions = useAppStore((s) => s.pendingActions);
  const context = useAppStore((s) => s.assistantContext);
  const suggestions = useAppStore((s) => s.assistantSuggestions);

  const toggleAssistant = useAppStore((s) => s.toggleAssistant);
  const setContext = useAppStore((s) => s.setAssistantContext);
  const sendMessage = useAppStore((s) => s.sendAssistantMessage);
  const applyAction = useAppStore((s) => s.applyAction);
  const applyAll = useAppStore((s) => s.applyAllActions);
  const clearChat = useAppStore((s) => s.clearAssistantChat);
  const fetchSuggestions = useAppStore((s) => s.fetchAssistantSuggestions);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Fetch suggestions when sidebar opens
  useEffect(() => {
    if (visible) {
      fetchSuggestions();
    }
  }, [visible, fetchSuggestions]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    setInput("");
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (streaming) return;
    sendMessage(suggestion);
  };

  if (!visible) return null;

  return (
    <div className="w-80 h-full flex flex-col bg-surface-base border-l border-border-default shrink-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-default flex items-center gap-2 shrink-0">
        <h2 className="text-sm font-semibold text-text-primary flex-1">AI Assistant</h2>
        <select
          value={context}
          onChange={(e) => setContext(e.target.value as AssistantContext)}
          className="text-xs bg-surface-overlay text-text-secondary border border-border-default rounded px-1.5 py-0.5"
        >
          {CONTEXT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={clearChat}
          className="text-text-tertiary hover:text-text-secondary text-xs px-1"
          title="Clear chat"
        >
          Clear
        </button>
        <button
          onClick={toggleAssistant}
          className="text-text-tertiary hover:text-text-primary text-lg leading-none px-1"
          title="Close assistant"
        >
          ×
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
        {/* Suggestions (shown when no messages) */}
        {messages.length === 0 && suggestions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-text-tertiary">Suggestions:</p>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="block w-full text-left px-3 py-2 text-xs bg-surface-overlay rounded-md hover:bg-surface-raised text-text-secondary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[90%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-accent-primary/20 text-text-primary"
                  : "bg-surface-overlay text-text-secondary"
              }`}
            >
              {stripActionBlocks(msg.content)}
            </div>
            {/* Inline action cards for this message */}
            {msg.actions && msg.actions.length > 0 && (
              <div className="mt-1.5 w-full space-y-1">
                {msg.actions.map((action, i) => (
                  <ActionCard
                    key={i}
                    action={action}
                    onApply={() => applyAction(action)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {streaming && (
          <div className="flex flex-col items-start">
            <div className="max-w-[90%] px-3 py-2 rounded-lg text-sm bg-surface-overlay text-text-secondary whitespace-pre-wrap">
              {stripActionBlocks(streamingContent) || (
                <span className="animate-pulse">Thinking...</span>
              )}
            </div>
          </div>
        )}

        {/* Pending actions (from streaming) */}
        {pendingActions.length > 0 && (
          <div className="space-y-1">
            {pendingActions.map((action, i) => (
              <ActionCard
                key={i}
                action={action}
                onApply={() => applyAction(action)}
              />
            ))}
            {pendingActions.length > 1 && (
              <button
                onClick={applyAll}
                className="w-full px-3 py-1.5 bg-accent-primary text-text-primary rounded text-xs hover:bg-accent-primary-hover"
              >
                Apply All ({pendingActions.length})
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 py-2 border-t border-border-default shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? "Waiting for response..." : "Ask about your canvas..."}
            disabled={streaming}
            className="flex-1 px-3 py-1.5 bg-surface-overlay text-text-primary text-sm rounded border border-border-default placeholder:text-text-tertiary disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="px-3 py-1.5 bg-accent-primary text-text-primary rounded text-sm hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
