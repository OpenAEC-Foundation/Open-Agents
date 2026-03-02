import * as vscode from "vscode";
import type {
  ListTerminalsResponse,
  CreateTerminalRequest,
  CreateTerminalResponse,
  SendTextRequest,
  KillTerminalRequest,
} from "../shared";

export async function listTerminals(): Promise<ListTerminalsResponse> {
  const terminals: ListTerminalsResponse["terminals"] = [];

  for (let i = 0; i < vscode.window.terminals.length; i++) {
    const t = vscode.window.terminals[i];
    const pid = await t.processId;
    terminals.push({
      id: pid ?? i,
      name: t.name,
      processId: pid ?? undefined,
      isActive: vscode.window.activeTerminal === t,
    });
  }

  return { terminals };
}

export async function createTerminal(body: unknown): Promise<CreateTerminalResponse> {
  const req = body as CreateTerminalRequest;
  const terminal = vscode.window.createTerminal({
    name: req.name,
    cwd: req.cwd,
    env: req.env,
    shellPath: req.shellPath,
  });

  if (req.show !== false) {
    terminal.show();
  }

  const pid = (await terminal.processId) ?? 0;
  return { id: pid, name: terminal.name };
}

export async function sendText(body: unknown): Promise<{ success: boolean }> {
  const req = body as SendTextRequest;

  let terminal: vscode.Terminal | undefined;

  if (req.terminalId !== undefined) {
    for (const t of vscode.window.terminals) {
      const pid = await t.processId;
      if (pid === req.terminalId) {
        terminal = t;
        break;
      }
    }
    if (!terminal) throw new Error(`Terminal with PID ${req.terminalId} not found`);
  } else {
    terminal = vscode.window.activeTerminal;
    if (!terminal) throw new Error("No active terminal");
  }

  terminal.sendText(req.text, req.addNewLine ?? true);
  return { success: true };
}

export async function killTerminal(body: unknown): Promise<{ success: boolean }> {
  const req = body as KillTerminalRequest;

  if (req.terminalId !== undefined) {
    for (const t of vscode.window.terminals) {
      const pid = await t.processId;
      if (pid === req.terminalId) {
        t.dispose();
        return { success: true };
      }
    }
    throw new Error(`Terminal with PID ${req.terminalId} not found`);
  } else {
    const terminal = vscode.window.activeTerminal;
    if (terminal) terminal.dispose();
  }

  return { success: true };
}
