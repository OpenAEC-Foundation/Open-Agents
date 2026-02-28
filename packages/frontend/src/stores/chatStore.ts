import { create } from "zustand";
import type { ChatMessage, ChatEvent, AgentNodeData } from "@open-agents/shared";

const API_BASE = "http://localhost:3001/api";

interface ChatState {
  /** Which node is open for chat (null = panel closed) */
  activeNodeId: string | null;

  /** Agent SDK session IDs per node (for multi-turn resumption) */
  sessions: Record<string, string>;

  /** Message history per node */
  messages: Record<string, ChatMessage[]>;

  /** Currently streaming? */
  isStreaming: boolean;

  /** Partial content being streamed */
  streamingContent: string;

  /** Actions */
  openChat: (nodeId: string) => void;
  closeChat: () => void;
  sendMessage: (nodeId: string, message: string, agent: AgentNodeData) => Promise<void>;
  clearHistory: (nodeId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeNodeId: null,
  sessions: {},
  messages: {},
  isStreaming: false,
  streamingContent: "",

  openChat: (nodeId) => set({ activeNodeId: nodeId }),

  closeChat: () => set({ activeNodeId: null }),

  clearHistory: (nodeId) => {
    const { messages, sessions } = get();
    const newMessages = { ...messages };
    const newSessions = { ...sessions };
    delete newMessages[nodeId];
    delete newSessions[nodeId];
    set({ messages: newMessages, sessions: newSessions });
  },

  sendMessage: async (nodeId, message, agent) => {
    const { sessions, messages } = get();

    // Add user message to history
    const userMsg: ChatMessage = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    const nodeMessages = [...(messages[nodeId] ?? []), userMsg];
    set({
      messages: { ...get().messages, [nodeId]: nodeMessages },
      isStreaming: true,
      streamingContent: "",
    });

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          agent,
          sessionId: sessions[nodeId],
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          const event = JSON.parse(json) as ChatEvent;

          if (event.type === "chat:session" && event.sessionId) {
            set({ sessions: { ...get().sessions, [nodeId]: event.sessionId } });
          } else if (event.type === "chat:delta" && event.delta) {
            fullContent += event.delta;
            set({ streamingContent: fullContent });
          } else if (event.type === "chat:complete") {
            fullContent = event.content ?? fullContent;
          } else if (event.type === "chat:error") {
            throw new Error(event.error ?? "Chat error");
          }
        }
      }

      // Add assistant message to history
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: fullContent,
        timestamp: new Date().toISOString(),
      };
      set({
        messages: { ...get().messages, [nodeId]: [...(get().messages[nodeId] ?? []), assistantMsg] },
        isStreaming: false,
        streamingContent: "",
      });
    } catch (err: unknown) {
      // Add error as assistant message
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      set({
        messages: { ...get().messages, [nodeId]: [...(get().messages[nodeId] ?? []), errorMsg] },
        isStreaming: false,
        streamingContent: "",
      });
    }
  },
}));
