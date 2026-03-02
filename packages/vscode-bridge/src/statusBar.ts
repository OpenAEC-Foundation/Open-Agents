import * as vscode from "vscode";

export interface StatusBar {
  setOnline(port: number): void;
  setOffline(): void;
  setError(): void;
}

export function createStatusBar(context: vscode.ExtensionContext): StatusBar {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  item.command = "open-agents.bridge.status";
  item.show();
  context.subscriptions.push(item);

  setOffline(item);

  return {
    setOnline: (port: number) => {
      item.text = "$(check) OA Bridge";
      item.backgroundColor = undefined;
      item.tooltip = `Bridge running on port ${port}`;
    },
    setOffline: () => setOffline(item),
    setError: () => {
      item.text = "$(error) OA Bridge";
      item.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground",
      );
      item.tooltip = "Bridge failed to start";
    },
  };
}

function setOffline(item: vscode.StatusBarItem): void {
  item.text = "$(circle-slash) OA Bridge";
  item.backgroundColor = new vscode.ThemeColor(
    "statusBarItem.warningBackground",
  );
  item.tooltip = "Bridge offline — Ctrl+Shift+P > Open-Agents: Start Bridge";
}
