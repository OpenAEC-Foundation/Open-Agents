import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentNodeData } from "@open-agents/shared";
import { useChatStore } from "../stores/chatStore";
import { useCanvasStore } from "../stores/canvasStore";

export function ChatPanel() {
  const activeNodeId = useChatStore((s) => s.activeNodeId);
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const closeChat = useChatStore((s) => s.closeChat);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearHistory = useChatStore((s) => s.clearHistory);

  const nodes = useCanvasStore((s) => s.nodes);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Find the active node's data
  const activeNode = activeNodeId ? nodes.find((n) => n.id === activeNodeId) : null;
  const agentData = activeNode?.data as unknown as AgentNodeData | undefined;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, activeNodeId]);

  // Focus input when panel opens
  useEffect(() => {
    if (activeNodeId) {
      inputRef.current?.focus();
    }
  }, [activeNodeId]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !activeNodeId || !agentData || isStreaming) return;
    const msg = input.trim();
    setInput("");
    sendMessage(activeNodeId, msg, agentData);
  }, [input, activeNodeId, agentData, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!activeNodeId || !agentData) return null;

  const nodeMessages = messages[activeNodeId] ?? [];
  const modelLabel = agentData.model.split("/").pop() ?? agentData.model;
  const toolCount = agentData.tools.length;

  return (
    <div className="w-[380px] shrink-0 bg-surface-raised border-l border-border-default flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h2 className="text-text-primary text-sm font-semibold truncate">
            {agentData.name}
          </h2>
          <button
            onClick={closeChat}
            className="text-text-muted hover:text-text-primary text-lg leading-none px-1"
          >
            &times;
          </button>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-text-muted text-xs">{modelLabel}</span>
          <span className="text-text-muted text-xs">
            {toolCount} tool{toolCount !== 1 ? "s" : ""}
          </span>
          {nodeMessages.length > 0 && (
            <button
              onClick={() => clearHistory(activeNodeId)}
              className="ml-auto text-text-muted hover:text-red-400 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {nodeMessages.length === 0 && !isStreaming && (
          <div className="text-text-muted text-sm text-center py-8">
            Start a conversation with <strong>{agentData.name}</strong>
          </div>
        )}

        {nodeMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-accent-primary text-text-primary"
                  : "bg-surface-overlay text-text-secondary"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-surface-overlay text-text-secondary whitespace-pre-wrap">
              {streamingContent || (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-border-default">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 bg-surface-input text-text-primary text-sm rounded-lg px-3 py-2 outline-none border border-border-default focus:border-border-focus resize-none min-h-[40px] max-h-[120px]"
            placeholder={`Message ${agentData.name}...`}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="self-end px-3 py-2 bg-accent-primary text-text-primary rounded-lg text-sm hover:bg-accent-primary-hover disabled:opacity-40 shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
