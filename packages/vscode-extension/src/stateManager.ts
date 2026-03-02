import type * as vscode from "vscode";

const STATE_KEY = "open-agents.canvasState";

export class StateManager {
  constructor(private context: vscode.ExtensionContext) {}

  async save(serializedState: string): Promise<void> {
    await this.context.workspaceState.update(STATE_KEY, serializedState);
  }

  async load(): Promise<string | null> {
    return this.context.workspaceState.get<string>(STATE_KEY) ?? null;
  }
}
