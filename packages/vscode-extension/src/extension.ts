import * as vscode from "vscode";
import { createWebviewPanel } from "./webviewProvider";

export function activate(context: vscode.ExtensionContext) {
  // Command: Open Canvas
  context.subscriptions.push(
    vscode.commands.registerCommand("open-agents.openCanvas", () => {
      createWebviewPanel(context);
    }),
  );

  // Command: New Agent (opens canvas with newAgent action)
  context.subscriptions.push(
    vscode.commands.registerCommand("open-agents.newAgent", () => {
      createWebviewPanel(context, { action: "newAgent" });
    }),
  );

  // Command: Start Backend (opens terminal)
  context.subscriptions.push(
    vscode.commands.registerCommand("open-agents.startBackend", () => {
      const terminal = vscode.window.createTerminal("Open-Agents Backend");
      terminal.sendText("pnpm dev:backend");
      terminal.show();
    }),
  );

  // Watch agents/presets/ for changes (file watcher for Fase 7.4)
  if (vscode.workspace.workspaceFolders?.[0]) {
    const presetsWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.workspace.workspaceFolders[0],
        "agents/presets/*.json",
      ),
    );

    const reloadPresets = async () => {
      const apiUrl = vscode.workspace
        .getConfiguration("open-agents")
        .get("apiUrl", "http://localhost:3001");
      try {
        await fetch(`${apiUrl}/api/presets/reload`, { method: "POST" });
      } catch {
        // Backend offline, ignore
      }
    };

    presetsWatcher.onDidCreate(reloadPresets);
    presetsWatcher.onDidChange(reloadPresets);
    presetsWatcher.onDidDelete(reloadPresets);
    context.subscriptions.push(presetsWatcher);
  }

  // Check backend health on activation
  checkBackendHealth();
}

async function checkBackendHealth() {
  const apiUrl = vscode.workspace
    .getConfiguration("open-agents")
    .get<string>("apiUrl", "http://localhost:3001");
  try {
    const res = await fetch(`${apiUrl}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    const choice = await vscode.window.showWarningMessage(
      "Open-Agents backend is not running. Start it to use the canvas.",
      "Start Backend",
    );
    if (choice === "Start Backend") {
      vscode.commands.executeCommand("open-agents.startBackend");
    }
  }
}

export function deactivate() {}
