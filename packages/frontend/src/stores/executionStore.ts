import { create } from "zustand";
import type {
  CanvasConfig,
  ExecutionRun,
  ExecutionStatus,
  SSEEvent,
} from "@open-agents/shared";

const API_BASE = "http://localhost:3001/api";

interface ExecutionState {
  activeRun: ExecutionRun | null;
  nodeStatuses: Record<string, ExecutionStatus>;
  nodeOutputs: Record<string, string>;
  runError: string | null;
  isRunning: boolean;

  startExecution: (config: CanvasConfig) => Promise<void>;
  reset: () => void;
}

const initialState = {
  activeRun: null,
  nodeStatuses: {} as Record<string, ExecutionStatus>,
  nodeOutputs: {} as Record<string, string>,
  runError: null,
  isRunning: false,
};

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  ...initialState,

  reset: () => set(initialState),

  startExecution: async (config) => {
    // Reset state before starting
    set({
      ...initialState,
      isRunning: true,
    });

    try {
      // 1. POST canvas config to create an execution run
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
      set({ activeRun: run });

      // 2. Open SSE connection to stream execution events
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

        // Parse SSE frames (data: {json}\n\n)
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
                set({
                  nodeStatuses: {
                    ...get().nodeStatuses,
                    [event.nodeId]: "running",
                  },
                });
              }
              break;

            case "step:output":
              if (event.nodeId) {
                set({
                  nodeOutputs: {
                    ...get().nodeOutputs,
                    [event.nodeId]: event.data ?? "",
                  },
                });
              }
              break;

            case "step:complete":
              if (event.nodeId) {
                set({
                  nodeStatuses: {
                    ...get().nodeStatuses,
                    [event.nodeId]: "completed",
                  },
                  nodeOutputs: {
                    ...get().nodeOutputs,
                    [event.nodeId]: event.data ?? "",
                  },
                });
              }
              break;

            case "step:error":
              if (event.nodeId) {
                set({
                  nodeStatuses: {
                    ...get().nodeStatuses,
                    [event.nodeId]: "error",
                  },
                  nodeOutputs: {
                    ...get().nodeOutputs,
                    [event.nodeId]: event.data ?? "",
                  },
                });
              }
              break;

            case "run:complete": {
              const currentRun = get().activeRun;
              set({
                isRunning: false,
                activeRun: currentRun
                  ? { ...currentRun, status: "completed" }
                  : null,
              });
              break;
            }
          }
        }
      }

      // Stream ended — ensure isRunning is false
      if (get().isRunning) {
        set({ isRunning: false });
      }
    } catch (err: unknown) {
      set({
        isRunning: false,
        runError: err instanceof Error ? err.message : "Unknown execution error",
      });
    }
  },
}));
