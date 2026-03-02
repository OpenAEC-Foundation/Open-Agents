import * as vscode from "vscode";
import type {
  DebugStateResponse,
  StartDebugRequest,
} from "../shared";

export async function getDebugState(): Promise<DebugStateResponse> {
  const activeSessions = vscode.debug.breakpoints.length >= 0
    ? vscode.debug.activeDebugSession
      ? [
          {
            id: vscode.debug.activeDebugSession.id,
            name: vscode.debug.activeDebugSession.name,
            type: vscode.debug.activeDebugSession.type,
          },
        ]
      : []
    : [];

  return {
    activeSessions,
    hasActiveSession: vscode.debug.activeDebugSession !== undefined,
  };
}

export async function startDebug(body: unknown): Promise<{ success: boolean }> {
  const req = body as StartDebugRequest;

  const folder = req.workspaceFolder
    ? vscode.workspace.workspaceFolders?.find(
        (f) => f.name === req.workspaceFolder,
      )
    : vscode.workspace.workspaceFolders?.[0];

  const started = await vscode.debug.startDebugging(
    folder,
    req.configName ?? "",
  );

  return { success: started };
}

export async function stopDebug(): Promise<{ success: boolean }> {
  await vscode.debug.stopDebugging();
  return { success: true };
}
