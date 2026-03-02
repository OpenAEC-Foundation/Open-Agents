import * as vscode from "vscode";
import type {
  WorkspaceStateResponse,
  WindowStateResponse,
  ExecuteCommandRequest,
  ExecuteCommandResponse,
} from "../shared";

export async function getWorkspaceState(): Promise<WorkspaceStateResponse> {
  const folders = (vscode.workspace.workspaceFolders ?? []).map((f) => ({
    name: f.name,
    uri: f.uri.fsPath,
    index: f.index,
  }));

  return {
    name: vscode.workspace.name,
    rootPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    folders,
  };
}

export async function getWindowState(): Promise<WindowStateResponse> {
  return {
    focused: vscode.window.state.focused,
    activeViewColumn: vscode.window.activeTextEditor?.viewColumn ?? 1,
  };
}

export async function executeCommand(body: unknown): Promise<ExecuteCommandResponse> {
  const req = body as ExecuteCommandRequest;
  try {
    const result = await vscode.commands.executeCommand(
      req.command,
      ...(req.args ?? []),
    );
    return { success: true, result };
  } catch (err) {
    return {
      success: false,
      result: err instanceof Error ? err.message : String(err),
    };
  }
}
