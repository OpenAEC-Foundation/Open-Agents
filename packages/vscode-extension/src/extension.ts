import * as vscode from "vscode";
import { createWebviewPanel } from "./webviewProvider";
import { createStatusBar } from "./statusBar";
import { OpenAgentsSidebarProvider } from "./sidebarProvider";

export function activate(context: vscode.ExtensionContext) {
  // Status bar: live backend health indicator
  createStatusBar(context);

  // Sidebar: quick actions + tips
  const sidebarProvider = new OpenAgentsSidebarProvider();
  vscode.window.registerTreeDataProvider(
    "openAgentsExplorer",
    sidebarProvider,
  );

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

  // Command: Open Settings
  context.subscriptions.push(
    vscode.commands.registerCommand("open-agents.openSettings", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "open-agents",
      );
    }),
  );

  // Watch agents/presets/ for changes
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
}

export function deactivate() {}
