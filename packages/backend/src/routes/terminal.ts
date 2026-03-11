/**
 * Terminal route — WebSocket PTY server for in-browser terminal sessions.
 *
 * Uses node-pty to spawn a PTY and streams I/O over a WebSocket connection.
 * Each WebSocket connection gets an isolated PTY process.
 *
 * Protocol (binary/text frames):
 *   Client → Server:  JSON { type: "resize", cols: number, rows: number }
 *                     or raw input string (sent directly to PTY)
 *   Server → Client:  raw PTY output string
 *
 * Route: GET /terminal  (upgraded to WebSocket)
 *
 * Query params:
 *   shell   - shell binary (default: $SHELL or /bin/bash)
 *   cols    - initial columns (default: 80)
 *   rows    - initial rows (default: 24)
 *   cwd     - working directory (default: process.cwd())
 */

import type { FastifyInstance } from "fastify";

// Minimal interface subset of node-pty that we use.
// Defined locally to avoid requiring node-pty at typecheck time (native module).
interface IPty {
  pid: number;
  onData(cb: (data: string) => void): void;
  onExit(cb: (e: { exitCode: number }) => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

interface NodePtyModule {
  spawn(
    file: string,
    args: string[],
    options: {
      name?: string;
      cols?: number;
      rows?: number;
      cwd?: string;
      env?: Record<string, string | undefined>;
    },
  ): IPty;
}

// Lazy-load node-pty so the server starts even if native bindings are missing.
// This lets the rest of the API work even without node-pty installed.
function loadPty(): NodePtyModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("node-pty") as NodePtyModule;
  } catch {
    return null;
  }
}

/** Active terminal sessions, keyed by session ID. */
const sessions = new Map<string, { pty: IPty; connectedAt: Date }>();

// Cleanup orphaned sessions every 5 minutes.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    const ageMs = now - session.connectedAt.getTime();
    // Remove sessions older than 4 hours.
    if (ageMs > 4 * 60 * 60 * 1000) {
      try {
        session.pty.kill();
      } catch {
        // Already dead — ignore.
      }
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

interface TerminalQuerystring {
  shell?: string;
  cols?: string;
  rows?: string;
  cwd?: string;
}

export async function terminalRoutes(app: FastifyInstance) {
  const nodePty = loadPty();

  // Availability endpoint — lets frontend check before upgrading to WebSocket.
  app.get("/terminal/available", async (_request, reply) => {
    reply.send({ available: nodePty !== null });
  });

  // List active sessions.
  app.get("/terminal/sessions", async (_request, reply) => {
    const result = Array.from(sessions.entries()).map(([id, s]) => ({
      id,
      connectedAt: s.connectedAt.toISOString(),
      pid: s.pty.pid,
    }));
    reply.send(result);
  });

  if (!nodePty) {
    // node-pty not available: register stub that sends an error message.
    app.get(
      "/terminal",
      { websocket: true },
      (socket) => {
        socket.send(
          "\r\n\x1b[31mnode-pty is not installed. Run: pnpm add node-pty\x1b[0m\r\n",
        );
        socket.close(1011, "node-pty unavailable");
      },
    );
    return;
  }

  // WebSocket PTY route.
  app.get<{ Querystring: TerminalQuerystring }>(
    "/terminal",
    { websocket: true },
    (socket, request) => {
      const {
        shell = process.env["SHELL"] ?? "/bin/bash",
        cols: colsStr = "80",
        rows: rowsStr = "24",
        cwd = process.cwd(),
      } = request.query;

      const cols = Math.max(1, Math.min(500, parseInt(colsStr, 10) || 80));
      const rows = Math.max(1, Math.min(200, parseInt(rowsStr, 10) || 24));
      const sessionId = `pty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Spawn PTY process.
      const ptyProcess = nodePty.spawn(shell, [], {
        name: "xterm-256color",
        cols,
        rows,
        cwd,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      });

      sessions.set(sessionId, { pty: ptyProcess, connectedAt: new Date() });

      // PTY output → WebSocket.
      ptyProcess.onData((data) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(data);
        }
      });

      // PTY exit → close WebSocket.
      ptyProcess.onExit(({ exitCode }) => {
        sessions.delete(sessionId);
        if (socket.readyState === socket.OPEN) {
          socket.send(
            `\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`,
          );
          socket.close(1000, "Process exited");
        }
      });

      // WebSocket input → PTY.
      socket.on("message", (raw: Buffer | string) => {
        const msg = typeof raw === "string" ? raw : raw.toString("utf8");

        // Check for control messages (resize).
        if (msg.startsWith("{")) {
          try {
            const parsed = JSON.parse(msg) as {
              type?: string;
              cols?: number;
              rows?: number;
            };
            if (
              parsed.type === "resize" &&
              typeof parsed.cols === "number" &&
              typeof parsed.rows === "number"
            ) {
              const newCols = Math.max(1, Math.min(500, parsed.cols));
              const newRows = Math.max(1, Math.min(200, parsed.rows));
              ptyProcess.resize(newCols, newRows);
              return;
            }
          } catch {
            // Not JSON — treat as raw input (e.g. paste starting with "{").
          }
        }

        ptyProcess.write(msg);
      });

      // Clean up on WebSocket close.
      socket.on("close", () => {
        sessions.delete(sessionId);
        try {
          ptyProcess.kill();
        } catch {
          // Already dead.
        }
      });
    },
  );
}
