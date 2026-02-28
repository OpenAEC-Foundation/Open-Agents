import * as vscode from "vscode";

let statusBarItem: vscode.StatusBarItem;
let healthInterval: ReturnType<typeof setInterval> | undefined;

export function createStatusBar(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarItem.command = "open-agents.openCanvas";
  statusBarItem.tooltip = "Click to open canvas";
  setOffline();
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Poll health every 5 seconds
  checkHealth();
  healthInterval = setInterval(checkHealth, 5000);
  context.subscriptions.push({ dispose: () => clearInterval(healthInterval) });
}

function getApiUrl(): string {
  return vscode.workspace
    .getConfiguration("open-agents")
    .get("apiUrl", "http://localhost:3001");
}

async function checkHealth(): Promise<void> {
  try {
    const res = await fetch(`${getApiUrl()}/api/health`);
    if (res.ok) {
      setOnline();
    } else {
      setOffline();
    }
  } catch {
    setOffline();
  }
}

function setOnline(): void {
  statusBarItem.text = "$(circuit-board) Open-Agents";
  statusBarItem.backgroundColor = undefined;
  statusBarItem.tooltip = "Backend online — click to open canvas";
}

function setOffline(): void {
  statusBarItem.text = "$(circle-slash) Open-Agents";
  statusBarItem.backgroundColor = new vscode.ThemeColor(
    "statusBarItem.warningBackground",
  );
  statusBarItem.tooltip =
    "Backend offline — click to open canvas, use Ctrl+Shift+P > Start Backend";
}
