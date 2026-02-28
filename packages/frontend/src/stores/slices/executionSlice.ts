import type { ChatMessage } from "@open-agents/shared";
import type { SliceCreator, ExecutionSlice } from "../types";
import {
  streamChat,
  createExecutionRun,
  streamExecution,
} from "../../services/executionService";

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
      const run = await createExecutionRun(config);
      set((state) => { state.activeRun = run; });

      for await (const event of streamExecution(run.id)) {
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
      let fullContent = "";

      for await (const event of streamChat(message, agent, get().sessions[nodeId])) {
        switch (event.type) {
          case "session":
            set((state) => { state.sessions[nodeId] = event.sessionId; });
            break;
          case "delta":
            fullContent += event.delta;
            set((state) => { state.streamingContent = fullContent; });
            break;
          case "complete":
            fullContent = event.content || fullContent;
            break;
          case "error":
            throw new Error(event.error);
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
