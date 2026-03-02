/**
 * VS Code Bridge service.
 * Connects to the Open-VSCode-Controller bridge for real-time agent status
 * via WebSocket and health checks via HTTP.
 */

const BRIDGE_URL = "http://localhost:7483";
const BRIDGE_WS_URL = "ws://localhost:7483";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export type BridgeAgentEvent =
  | { type: "agent.spawned"; agentId: string; sandboxDir: string }
  | { type: "agent.status"; agentId: string; status: string; summary?: string }
  | { type: "agent.completed"; agentId: string; resultPreview: string };

type BridgeEventListener = (event: BridgeAgentEvent) => void;
const listeners = new Set<BridgeEventListener>();

/** Check if the VS Code bridge is reachable */
export async function checkBridgeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Subscribe to bridge agent events */
export function onBridgeEvent(listener: BridgeEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Connect WebSocket to bridge for real-time events */
export function connectBridgeWebSocket(): void {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  try {
    ws = new WebSocket(BRIDGE_WS_URL);

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data as string) as BridgeAgentEvent;
        if (event.type?.startsWith("agent.")) {
          for (const listener of listeners) {
            listener(event);
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      ws = null;
      // Reconnect after 5 seconds
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectBridgeWebSocket();
        }, 5000);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  } catch {
    // Bridge not available
  }
}

/** Disconnect WebSocket */
export function disconnectBridgeWebSocket(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

/** Get all agents from bridge */
export async function listBridgeAgents(): Promise<unknown[]> {
  try {
    const res = await fetch(`${BRIDGE_URL}/orchestrator/agents`);
    if (!res.ok) return [];
    const data = (await res.json()) as { agents: unknown[] };
    return data.agents;
  } catch {
    return [];
  }
}
