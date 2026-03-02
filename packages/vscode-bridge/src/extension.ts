import * as vscode from "vscode";
import { createHttpServer, type BridgeServer } from "./httpServer";
import { createStatusBar, type StatusBar } from "./statusBar";

let bridgeServer: BridgeServer | undefined;

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const statusBar = createStatusBar(context);

  const getPort = () =>
    vscode.workspace.getConfiguration("open-agents.bridge").get<number>("port", 7483);

  const startBridge = async () => {
    if (bridgeServer) {
      vscode.window.showInformationMessage(
        "Open-Agents: Bridge is already running",
      );
      return;
    }

    const port = getPort();
    try {
      bridgeServer = await createHttpServer(port);
      statusBar.setOnline(port);
      vscode.window.showInformationMessage(
        `Open-Agents: Bridge started on port ${port}`,
      );
    } catch (err) {
      statusBar.setError();
      vscode.window.showErrorMessage(
        `Open-Agents: Failed to start bridge on port ${port}: ${err}`,
      );
    }
  };

  const stopBridge = async () => {
    if (bridgeServer) {
      await bridgeServer.stop();
      bridgeServer = undefined;
      statusBar.setOffline();
      vscode.window.showInformationMessage(
        "Open-Agents: Bridge stopped",
      );
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("open-agents.bridge.start", startBridge),
    vscode.commands.registerCommand("open-agents.bridge.stop", stopBridge),
    vscode.commands.registerCommand("open-agents.bridge.status", () => {
      const port = getPort();
      vscode.window.showInformationMessage(
        bridgeServer
          ? `Open-Agents: Bridge running on port ${port}`
          : "Open-Agents: Bridge not running",
      );
    }),
  );

  const config = vscode.workspace.getConfiguration("open-agents.bridge");
  const autoStart = config.get<boolean>("autoStart", true);
  const autoOpenClaude = config.get<boolean>("autoOpenClaude", true);

  if (autoStart) {
    await startBridge();
  }

  if (bridgeServer) {
    // Clean startup: close welcome page, open Claude Code
    setTimeout(async () => {
      // Close all editor tabs (welcome page etc)
      try {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
      } catch { /* ignore */ }

      if (autoOpenClaude) {
        try {
          await vscode.commands.executeCommand("claude-vscode.sidebar.open");
        } catch {
          try {
            await vscode.commands.executeCommand("workbench.action.chat.open");
          } catch { /* ignore */ }
        }
      }
    }, 2000);
  }
}

export async function deactivate(): Promise<void> {
  if (bridgeServer) {
    await bridgeServer.stop();
  }
}
