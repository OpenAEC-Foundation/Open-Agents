import * as vscode from "vscode";
import { getWebviewContent } from "./webviewContent";
import { StateManager } from "./stateManager";
import type { WebviewToExtension, ExtensionToWebview } from "./bridge";

let currentPanel: vscode.WebviewPanel | undefined;
let pollInterval: ReturnType<typeof setInterval> | undefined;

export function createWebviewPanel(
  context: vscode.ExtensionContext,
  options?: { action?: string },
) {
  // Reuse existing panel if open
  if (currentPanel) {
    currentPanel.reveal();
    if (options?.action) {
      postToWebview({ type: "action", action: options.action });
    }
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "openAgentsCanvas",
    "Open-Agents Canvas",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, "media"),
      ],
    },
  );

  currentPanel = panel;
  const stateManager = new StateManager(context);

  panel.webview.html = getWebviewContent(
    panel.webview,
    context.extensionUri,
    vscode.Uri,
  );

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(
    async (message: WebviewToExtension) => {
      switch (message.type) {
        case "saveState":
          await stateManager.save(message.payload);
          break;
        case "loadState": {
          const state = await stateManager.load();
          postToWebview({ type: "stateLoaded", payload: state });
          break;
        }
        case "getSettings": {
          const config = vscode.workspace.getConfiguration("open-agents");
          postToWebview({
            type: "settings",
            payload: {
              apiUrl: config.get("apiUrl", "http://localhost:3001"),
              defaultModel: config.get("defaultModel", "anthropic/claude-sonnet-4-6"),
              theme: config.get("theme", "impertio"),
            },
          });
          break;
        }
        case "canvasChanged":
          // Could be used for MCP sync in Fase 7.4
          break;
      }
    },
    undefined,
    context.subscriptions,
  );

  // Start polling backend for config changes (Fase 7.4 sync)
  startConfigPolling(context);

  // Cleanup on dispose
  panel.onDidDispose(() => {
    currentPanel = undefined;
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = undefined;
    }
  });

  // Send initial action if provided
  if (options?.action) {
    postToWebview({ type: "action", action: options.action });
  }
}

function postToWebview(message: ExtensionToWebview) {
  currentPanel?.webview.postMessage(message);
}

export function getPanel(): vscode.WebviewPanel | undefined {
  return currentPanel;
}

/** Poll backend for config changes and push to webview (for MCP sync) */
function startConfigPolling(context: vscode.ExtensionContext) {
  if (pollInterval) return;

  const apiUrl = vscode.workspace
    .getConfiguration("open-agents")
    .get("apiUrl", "http://localhost:3001");

  let lastHash = "";

  pollInterval = setInterval(async () => {
    if (!currentPanel) return;
    try {
      const res = await fetch(`${apiUrl}/api/configs`);
      if (!res.ok) return;
      const configs = await res.json();
      const hash = JSON.stringify(configs);
      if (hash !== lastHash) {
        lastHash = hash;
        postToWebview({ type: "configsUpdated", payload: configs });
      }
    } catch {
      // Backend offline, ignore
    }
  }, 2000);
}
