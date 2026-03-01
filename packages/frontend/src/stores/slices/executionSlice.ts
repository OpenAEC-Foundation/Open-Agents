import type { ChatMessage } from "@open-agents/shared";
import type { Node, Edge } from "@xyflow/react";
import { nanoid } from "nanoid";
import type { SliceCreator, ExecutionSlice } from "../types";
import {
  streamChat,
  createExecutionRun,
  streamExecution,
  pauseRun,
  cancelRun,
  resumeRun,
  submitDecision,
  listTemplates,
  getTemplate,
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

  // Session management state (Sprint 3 — stubs)
  isPaused: false,
  isCancelled: false,
  stepElapsed: {},
  pendingErrorNodeId: null,

  // Template state (Sprint 3 — stubs)
  templates: [],

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
      state.isPaused = false;
      state.isCancelled = false;
      state.stepElapsed = {};
      state.pendingErrorNodeId = null;
      state.selectedOutputNodeId = null;
    });
  },

  startExecution: async (config) => {
    set((state) => {
      state.activeRun = null;
      state.nodeStatuses = {};
      state.nodeOutputs = {};
      state.runError = null;
      state.isRunning = true;
      state.isPaused = false;
      state.isCancelled = false;
      state.stepElapsed = {};
      state.pendingErrorNodeId = null;
    });

    try {
      const run = await createExecutionRun(config);
      set((state) => { state.activeRun = run; });

      await get()._consumeSSEStream(run.id);
    } catch (err: unknown) {
      set((state) => {
        state.isRunning = false;
        state.runError = err instanceof Error ? err.message : "Unknown execution error";
      });
    }
  },

  /** Internal: consume SSE stream and update state. Reused by startExecution and resumeExecution. */
  _consumeSSEStream: async (runId: string) => {
    try {
      for await (const event of streamExecution(runId)) {
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
          case "step:skipped":
            if (event.nodeId) {
              set((state) => { state.nodeStatuses[event.nodeId!] = "cancelled"; });
            }
            break;
          case "step:timing":
            if (event.nodeId && event.data) {
              try {
                const { elapsed } = JSON.parse(event.data) as { elapsed: number };
                set((state) => { state.stepElapsed[event.nodeId!] = elapsed; });
              } catch { /* ignore parse errors */ }
            }
            break;
          case "pool:start":
            if (event.nodeId) {
              set((state) => {
                state.nodeStatuses[event.nodeId!] = "completed";
                state.nodeOutputs[event.nodeId!] = event.data ?? "Pool routing complete";
              });
            }
            break;
          case "pool:complete":
            if (event.nodeId) {
              set((state) => {
                state.nodeOutputs[event.nodeId!] =
                  (state.nodeOutputs[event.nodeId!] ?? "") + "\n" + (event.data ?? "");
              });
            }
            break;
          case "run:paused":
            set((state) => {
              state.isRunning = false;
              state.isPaused = true;
              if (state.activeRun) state.activeRun.status = "paused";
            });
            break;
          case "run:cancelled":
            set((state) => {
              state.isRunning = false;
              state.isCancelled = true;
              if (state.activeRun) state.activeRun.status = "cancelled";
            });
            break;
          case "run:error:awaiting-decision":
            if (event.nodeId) {
              set((state) => { state.pendingErrorNodeId = event.nodeId!; });
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

  // Session management actions (Sprint 3)
  pauseExecution: async () => {
    const runId = get().activeRun?.id;
    if (!runId) return;
    await pauseRun(runId);
    // Optimistic update — confirmed by SSE run:paused event
    set((state) => { state.isPaused = true; });
  },

  resumeExecution: async () => {
    const runId = get().activeRun?.id;
    if (!runId) return;
    await resumeRun(runId);
    set((state) => {
      state.isPaused = false;
      state.isRunning = true;
      if (state.activeRun) state.activeRun.status = "running";
    });
    // Re-subscribe to SSE stream for continued events
    await get()._consumeSSEStream(runId);
  },

  cancelExecution: async () => {
    const runId = get().activeRun?.id;
    if (!runId) return;
    await cancelRun(runId);
    set((state) => {
      state.isRunning = false;
      state.isPaused = false;
      state.isCancelled = true;
      if (state.activeRun) state.activeRun.status = "cancelled";
    });
  },

  restartExecution: async () => {
    get().resetExecution();
    const config = get().getCanvasConfig();
    await get().startExecution(config);
  },

  submitErrorDecision: async (decision) => {
    const runId = get().activeRun?.id;
    if (!runId) return;
    await submitDecision(runId, decision);
    set((state) => { state.pendingErrorNodeId = null; });
  },

  // Template actions (Sprint 3)
  loadTemplates: async () => {
    try {
      const templates = await listTemplates();
      set((state) => { state.templates = templates; });
    } catch {
      // Templates not available yet — silently ignore
    }
  },

  applyTemplate: async (templateId) => {
    const template = await getTemplate(templateId);

    // Generate fresh IDs to avoid conflicts with existing canvas nodes
    const idMap = new Map<string, string>();
    for (const node of template.nodes) {
      idMap.set(node.id, `tmpl-${nanoid(6)}`);
    }

    const nodes: Node[] = template.nodes.map((n) => ({
      id: idMap.get(n.id)!,
      type: n.type ?? "agent",
      position: n.position,
      data: n.data as unknown as Record<string, unknown>,
    }));

    const edges: Edge[] = template.edges.map((e) => ({
      id: `e-${nanoid(6)}`,
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));

    get().setCanvas(nodes, edges);
    get().resetExecution();
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
