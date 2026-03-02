import * as http from "http";
import { WebSocketServer } from "ws";
import * as vscode from "vscode";
import type { VSCodeEvent, ErrorResponse } from "./shared";
import * as editorHandlers from "./handlers/editor";
import * as fileHandlers from "./handlers/files";
import * as terminalHandlers from "./handlers/terminal";
import * as windowHandlers from "./handlers/window";
import * as extensionHandlers from "./handlers/extensions";
import * as debugHandlers from "./handlers/debug";
import * as scmHandlers from "./handlers/scm";
import * as taskHandlers from "./handlers/tasks";
import * as orchestratorHandlers from "./handlers/orchestrator";

export interface BridgeServer {
  stop(): Promise<void>;
  broadcast(event: VSCodeEvent): void;
}

type Handler = (body: unknown) => Promise<unknown>;

interface Route {
  method: "GET" | "POST";
  path: string;
  handler: Handler;
}

function json(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

async function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: string) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

export async function createHttpServer(port: number): Promise<BridgeServer> {
  const routes: Route[] = [
    // Health
    {
      method: "GET",
      path: "/health",
      handler: async () => ({
        status: "ok",
        version: "0.1.0",
        port,
        uptime: Math.floor(process.uptime()),
        workspaceCount: vscode.workspace.workspaceFolders?.length ?? 0,
      }),
    },

    // Workspace / Window
    { method: "GET", path: "/workspace-state", handler: windowHandlers.getWorkspaceState },
    { method: "GET", path: "/window-state", handler: windowHandlers.getWindowState },
    { method: "POST", path: "/execute-command", handler: windowHandlers.executeCommand },

    // Editor
    { method: "GET", path: "/active-editor", handler: editorHandlers.getActiveEditor },
    { method: "GET", path: "/open-files", handler: editorHandlers.getOpenFiles },
    { method: "POST", path: "/open-file", handler: editorHandlers.openFile },
    { method: "POST", path: "/close-editor", handler: editorHandlers.closeEditor },
    { method: "POST", path: "/get-text", handler: editorHandlers.getText },
    { method: "POST", path: "/insert-text", handler: editorHandlers.insertText },
    { method: "POST", path: "/replace-text", handler: editorHandlers.replaceText },
    { method: "POST", path: "/set-cursor", handler: editorHandlers.setCursor },
    { method: "POST", path: "/reveal-line", handler: editorHandlers.revealLine },
    { method: "POST", path: "/save-file", handler: editorHandlers.saveFile },

    // Files
    { method: "POST", path: "/file-exists", handler: fileHandlers.fileExists },
    { method: "POST", path: "/read-file", handler: fileHandlers.readFile },
    { method: "POST", path: "/write-file", handler: fileHandlers.writeFile },
    { method: "POST", path: "/delete-file", handler: fileHandlers.deleteFile },
    { method: "POST", path: "/rename-file", handler: fileHandlers.renameFile },
    { method: "POST", path: "/create-directory", handler: fileHandlers.createDirectory },
    { method: "POST", path: "/list-directory", handler: fileHandlers.listDirectory },

    // Terminal
    { method: "GET", path: "/terminals", handler: terminalHandlers.listTerminals },
    { method: "POST", path: "/create-terminal", handler: terminalHandlers.createTerminal },
    { method: "POST", path: "/send-text", handler: terminalHandlers.sendText },
    { method: "POST", path: "/kill-terminal", handler: terminalHandlers.killTerminal },

    // Extensions
    { method: "GET", path: "/extensions", handler: extensionHandlers.listExtensions },

    // Debug
    { method: "GET", path: "/debug-state", handler: debugHandlers.getDebugState },
    { method: "POST", path: "/start-debug", handler: debugHandlers.startDebug },
    { method: "POST", path: "/stop-debug", handler: debugHandlers.stopDebug },

    // SCM
    { method: "GET", path: "/scm-state", handler: scmHandlers.getScmState },

    // Tasks
    { method: "GET", path: "/tasks", handler: taskHandlers.listTasks },
    { method: "POST", path: "/run-task", handler: taskHandlers.runTask },

    // Orchestrator
    { method: "POST", path: "/orchestrator/spawn-agent", handler: orchestratorHandlers.spawnAgent },
    { method: "POST", path: "/orchestrator/agent-status", handler: orchestratorHandlers.getAgentStatus },
    { method: "POST", path: "/orchestrator/agent-result", handler: orchestratorHandlers.getAgentResult },
    { method: "POST", path: "/orchestrator/kill-agent", handler: orchestratorHandlers.killAgent },
    { method: "GET", path: "/orchestrator/agents", handler: orchestratorHandlers.listAgents },
  ];

  const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    const route = routes.find(
      (r) => r.method === req.method && r.path === req.url,
    );
    if (!route) {
      json(res, 404, { error: "Not found", code: "NOT_FOUND" } satisfies ErrorResponse);
      return;
    }

    try {
      const body = req.method === "POST" ? await parseBody(req) : {};
      const result = await route.handler(body);
      json(res, 200, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: message, code: "INTERNAL_ERROR" } satisfies ErrorResponse);
    }
  });

  const wss = new WebSocketServer({ server });

  const broadcast = (event: VSCodeEvent): void => {
    const msg = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(msg);
      }
    }
  };

  registerEventListeners(broadcast);
  orchestratorHandlers.setBroadcast(broadcast);

  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  return {
    stop: () =>
      new Promise<void>((resolve) => {
        wss.close();
        server.close(() => resolve());
      }),
    broadcast,
  };
}

function registerEventListeners(
  broadcast: (event: VSCodeEvent) => void,
): void {
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      broadcast({
        type: "editor.changed",
        filePath: editor.document.uri.fsPath,
        languageId: editor.document.languageId,
      });
    }
  });

  vscode.workspace.onDidSaveTextDocument((doc) => {
    broadcast({ type: "editor.saved", filePath: doc.uri.fsPath });
  });

  vscode.workspace.onDidCloseTextDocument((doc) => {
    broadcast({ type: "editor.closed", filePath: doc.uri.fsPath });
  });

  vscode.window.onDidChangeTextEditorSelection((e) => {
    const sel = e.selections[0];
    if (sel) {
      broadcast({
        type: "selection.changed",
        filePath: e.textEditor.document.uri.fsPath,
        selection: {
          anchor: { line: sel.anchor.line, character: sel.anchor.character },
          active: { line: sel.active.line, character: sel.active.character },
          text: e.textEditor.document.getText(sel),
        },
      });
    }
  });

  vscode.window.onDidOpenTerminal(async (t) => {
    const pid = await t.processId;
    broadcast({ type: "terminal.opened", id: pid ?? 0, name: t.name });
  });

  vscode.window.onDidCloseTerminal(async (t) => {
    const pid = await t.processId;
    broadcast({ type: "terminal.closed", id: pid ?? 0 });
  });

  vscode.debug.onDidStartDebugSession((session) => {
    broadcast({
      type: "debug.started",
      session: { id: session.id, name: session.name, type: session.type },
    });
  });

  vscode.debug.onDidTerminateDebugSession((session) => {
    broadcast({ type: "debug.stopped", sessionId: session.id });
  });

  vscode.window.onDidChangeWindowState((state) => {
    broadcast(state.focused ? { type: "window.focused" } : { type: "window.blurred" });
  });
}
