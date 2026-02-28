import type {
  ChatMessage,
  ChatEvent,
  AgentNodeData,
  ExecutionRun,
  ExecutionStatus,
  SSEEvent,
} from "@open-agents/shared";
import type { SliceCreator, ExecutionSlice } from "../types";

const API_BASE = "/api";

export const createExecutionSlice: SliceCreator<ExecutionSlice> = (set, get) => ({
  // Chat state
  activeNodeId: null,
  sessions: {},
  messages: {},
  isStreaming: false,
  streamingContent: "",

  // Canvas execution state
  activeRun: null,
  nodeStatuses: {},
  nodeOutputs: {},
  runError: null,
  isRunning: false,

  openChat: (nodeId) => set((state) => { state.activeNodeId = nodeId; }),

  closeChat: () => set((state) => { state.activeNodeId = null; }),

  clearChatHistory: (nodeId) => {
    set((state) => {
      delete state.messages[nodeId];
      delete state.sessions[nodeId];
    });
  },

  resetExecution: () => {
    set((state) => {
      state.activeRun = null;
      state.nodeStatuses = {};
      state.nodeOutputs = {};
      state.runError = null;
      state.isRunning = false;
    });
  },

  startExecution: async (config) => {
    set((state) => {
      state.activeRun = null;
      state.nodeStatuses = {};
      state.nodeOutputs = {};
      state.runError = null;
      state.isRunning = true;
    });

    try {
      const res = await fetch(`${API_BASE}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const run = (await res.json()) as ExecutionRun;
      set((state) => { state.activeRun = run; });

      // Open SSE connection to stream execution events
      const sseRes = await fetch(`${API_BASE}/execute/${run.id}/status`);
      if (!sseRes.ok) {
        throw new Error(`SSE connection failed: HTTP ${sseRes.status}`);
      }

      const reader = sseRes.body?.getReader();
      if (!reader) throw new Error("No response body for SSE stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          const event = JSON.parse(json) as SSEEvent;

          switch (event.type) {
            case "step:start":
              if (event.nodeId) {
                set((state) => { state.nodeStatuses[event.nodeId!] = "running"; });
              }
              break;
            case "step:output":
              if (event.nodeId) {
                set((state) => { state.nodeOutputs[event.nodeId!] = event.data ?? ""; });
              }
              break;
            case "step:complete":
              if (event.nodeId) {
                set((state) => {
                  state.nodeStatuses[event.nodeId!] = "completed";
                  state.nodeOutputs[event.nodeId!] = event.data ?? "";
                });
              }
              break;
            case "step:error":
              if (event.nodeId) {
                set((state) => {
                  state.nodeStatuses[event.nodeId!] = "error";
                  state.nodeOutputs[event.nodeId!] = event.data ?? "";
                });
              }
              break;
            case "run:complete":
              set((state) => {
                state.isRunning = false;
                if (state.activeRun) state.activeRun.status = "completed";
              });
              break;
          }
        }
      }

      // Stream ended — ensure isRunning is false
      if (get().isRunning) {
        set((state) => { state.isRunning = false; });
      }
    } catch (err: unknown) {
      set((state) => {
        state.isRunning = false;
        state.runError = err instanceof Error ? err.message : "Unknown execution error";
      });
    }
  },

  sendMessage: async (nodeId, message, agent) => {
    const userMsg: ChatMessage = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    set((state) => {
      if (!state.messages[nodeId]) state.messages[nodeId] = [];
      state.messages[nodeId].push(userMsg);
      state.isStreaming = true;
      state.streamingContent = "";
    });

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          agent,
          sessionId: get().sessions[nodeId],
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let sseBuffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          const event = JSON.parse(json) as ChatEvent;

          if (event.type === "chat:session" && event.sessionId) {
            set((state) => { state.sessions[nodeId] = event.sessionId!; });
          } else if (event.type === "chat:delta" && event.delta) {
            fullContent += event.delta;
            set((state) => { state.streamingContent = fullContent; });
          } else if (event.type === "chat:complete") {
            fullContent = event.content ?? fullContent;
          } else if (event.type === "chat:error") {
            throw new Error(event.error ?? "Chat error");
          }
        }
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: fullContent,
        timestamp: new Date().toISOString(),
      };
      set((state) => {
        if (!state.messages[nodeId]) state.messages[nodeId] = [];
        state.messages[nodeId].push(assistantMsg);
        state.isStreaming = false;
        state.streamingContent = "";
      });
    } catch (err: unknown) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      set((state) => {
        if (!state.messages[nodeId]) state.messages[nodeId] = [];
        state.messages[nodeId].push(errorMsg);
        state.isStreaming = false;
        state.streamingContent = "";
      });
    }
  },
});
