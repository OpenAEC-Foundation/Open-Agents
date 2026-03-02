// =============================================
// Assistant Slice — AI Assembly Assistant state (Sprint 6c)
// =============================================

import type { AssistantContext, AssistantMessage, CanvasAction, AgentNodeData } from "@open-agents/shared";
import type { SliceCreator, AssistantSlice } from "../types";
import { streamAssistantChat, fetchSuggestions } from "../../services/assistantService";

let idCounter = 0;
function nextId(): string {
  return `assistant-msg-${Date.now()}-${++idCounter}`;
}

export const createAssistantSlice: SliceCreator<AssistantSlice> = (set, get) => ({
  assistantVisible: false,
  assistantContext: "neutral",
  assistantMessages: [],
  assistantStreaming: false,
  assistantStreamingContent: "",
  pendingActions: [],
  assistantSuggestions: [],

  toggleAssistant: () => set((state) => {
    state.assistantVisible = !state.assistantVisible;
  }),

  setAssistantContext: (context) => set((state) => {
    state.assistantContext = context;
  }),

  sendAssistantMessage: async (message) => {
    // Add user message
    const userMsg: AssistantMessage = {
      id: nextId(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    set((state) => {
      state.assistantMessages.push(userMsg);
      state.assistantStreaming = true;
      state.assistantStreamingContent = "";
      state.pendingActions = [];
    });

    // Build history from existing messages
    const history = get().assistantMessages
      .filter((m) => m.id !== userMsg.id)
      .map((m) => ({ role: m.role, content: m.content }));

    const canvasConfig = get().getCanvasConfig();
    const context = get().assistantContext;

    try {
      let fullContent = "";
      const actions: CanvasAction[] = [];

      for await (const event of streamAssistantChat(message, canvasConfig, context, history)) {
        if (event.type === "delta") {
          fullContent += event.delta;
          set((state) => {
            state.assistantStreamingContent = fullContent;
          });
        } else if (event.type === "action") {
          actions.push(event.action);
          set((state) => {
            state.pendingActions = [...actions];
          });
        } else if (event.type === "complete") {
          fullContent = event.content;
        } else if (event.type === "error") {
          set((state) => {
            state.assistantStreaming = false;
            state.assistantStreamingContent = "";
            state.assistantMessages.push({
              id: nextId(),
              role: "assistant",
              content: `Error: ${event.error}`,
              timestamp: new Date().toISOString(),
            });
          });
          return;
        }
      }

      // Add the complete assistant message
      set((state) => {
        state.assistantStreaming = false;
        state.assistantStreamingContent = "";
        state.assistantMessages.push({
          id: nextId(),
          role: "assistant",
          content: fullContent,
          timestamp: new Date().toISOString(),
          actions: actions.length > 0 ? actions : undefined,
        });
      });
    } catch (err) {
      set((state) => {
        state.assistantStreaming = false;
        state.assistantStreamingContent = "";
        state.assistantMessages.push({
          id: nextId(),
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          timestamp: new Date().toISOString(),
        });
      });
    }
  },

  applyAction: (action) => {
    const state = get();

    switch (action.type) {
      case "add-node": {
        const pos = action.position ?? { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 };
        state.addNode(action.data, pos);
        break;
      }
      case "remove-node": {
        state.removeNode(action.nodeId);
        break;
      }
      case "update-node": {
        state.updateNodeData(action.nodeId, action.patch as Partial<AgentNodeData>);
        break;
      }
      case "add-edge": {
        // Use onConnect to add an edge
        state.onConnect({
          source: action.source,
          target: action.target,
          sourceHandle: null,
          targetHandle: null,
        });
        break;
      }
      case "replace-all": {
        if (action.config.nodes && action.config.edges) {
          const rfNodes = action.config.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data as unknown as Record<string, unknown>,
          }));
          const rfEdges = action.config.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
          }));
          state.setCanvas(rfNodes, rfEdges);
        }
        break;
      }
    }

    // Remove from pending
    set((s) => {
      s.pendingActions = s.pendingActions.filter((a) => a !== action);
    });
  },

  applyAllActions: () => {
    const actions = [...get().pendingActions];
    for (const action of actions) {
      get().applyAction(action);
    }
  },

  clearAssistantChat: () => set((state) => {
    state.assistantMessages = [];
    state.assistantStreamingContent = "";
    state.pendingActions = [];
    state.assistantSuggestions = [];
  }),

  fetchAssistantSuggestions: async () => {
    const canvasConfig = get().getCanvasConfig();
    const suggestions = await fetchSuggestions(canvasConfig);
    set((state) => {
      state.assistantSuggestions = suggestions;
    });
  },
});
