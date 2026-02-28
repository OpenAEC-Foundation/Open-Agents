import { useEffect, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import {
  postToExtension,
  onExtensionMessage,
  isVsCodeWebview,
} from "../vscodeApi";
import { setApiBase } from "@frontend/services/apiConfig";

/**
 * Bridge hook that syncs the webview with the VS Code extension host.
 * - Requests settings on mount (API URL, theme)
 * - Saves canvas state to workspaceState on changes (debounced)
 * - Loads saved state on mount
 */
export function useVsCodeBridge(
  nodes: Node[],
  edges: Edge[],
  setCanvas?: (nodes: Node[], edges: Edge[]) => void,
) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!isVsCodeWebview()) return;

    // Request settings and saved state from extension
    postToExtension({ type: "getSettings" });
    postToExtension({ type: "loadState" });

    const unsub = onExtensionMessage((msg) => {
      switch (msg.type) {
        case "settings":
          // Configure API base URL from extension settings
          setApiBase(`${msg.payload.apiUrl}/api`);
          break;
        case "stateLoaded":
          if (msg.payload && setCanvas && !initialized.current) {
            try {
              const parsed = JSON.parse(msg.payload);
              if (parsed.nodes && parsed.edges) {
                setCanvas(parsed.nodes, parsed.edges);
              }
            } catch {
              // Invalid state, ignore
            }
          }
          initialized.current = true;
          break;
        case "configsUpdated":
          // MCP sync: backend configs changed, could refresh canvas
          break;
        case "presetsReloaded":
          // Presets changed on disk, sidebar will auto-refresh via fetch
          break;
      }
    });

    return unsub;
  }, [setCanvas]);

  // Save state on canvas changes (debounced)
  useEffect(() => {
    if (!isVsCodeWebview() || !initialized.current) return;

    const timer = setTimeout(() => {
      const state = JSON.stringify({ nodes, edges });
      postToExtension({ type: "saveState", payload: state });
      postToExtension({ type: "canvasChanged", payload: state });
    }, 500);

    return () => clearTimeout(timer);
  }, [nodes, edges]);
}
