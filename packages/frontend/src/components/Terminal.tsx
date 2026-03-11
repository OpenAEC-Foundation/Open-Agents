/**
 * Terminal — xterm.js React component connected to the backend WebSocket PTY.
 *
 * Features:
 * - Full PTY via @fastify/websocket + node-pty on backend
 * - FitAddon: auto-resize terminal to container size
 * - WebLinksAddon: clickable URLs in output
 * - SearchAddon: ctrl+f search in terminal buffer
 * - Sends resize events when container dimensions change
 *
 * Usage:
 *   <Terminal wsUrl="ws://localhost:3001/ws/terminal" />
 *   <Terminal wsUrl="ws://localhost:3001/ws/terminal" shell="/bin/zsh" cwd="/home/user" />
 */

import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";

export interface TerminalProps {
  /** WebSocket URL for the PTY backend (e.g. ws://localhost:3001/ws/terminal) */
  wsUrl: string;
  /** Shell to spawn (default: server $SHELL) */
  shell?: string;
  /** Initial working directory */
  cwd?: string;
  /** Initial columns (default: 80) */
  cols?: number;
  /** Initial rows (default: 24) */
  rows?: number;
  /** Called when the WebSocket connection opens */
  onConnect?: () => void;
  /** Called when the WebSocket connection closes */
  onDisconnect?: (code: number) => void;
  /** Called when the backend is unavailable */
  onError?: (message: string) => void;
  /** CSS class for the outer container div */
  className?: string;
}

export function Terminal({
  wsUrl,
  shell,
  cwd,
  cols = 80,
  rows = 24,
  onConnect,
  onDisconnect,
  onError,
  className = "",
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  const sendResize = useCallback((term: XTerm, ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }),
      );
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Build query string for PTY options.
    const params = new URLSearchParams();
    if (shell) params.set("shell", shell);
    if (cwd) params.set("cwd", cwd);
    params.set("cols", String(cols));
    params.set("rows", String(rows));

    const url = `${wsUrl}?${params.toString()}`;

    // Initialise xterm.js.
    const term = new XTerm({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono Variable", "Cascadia Code", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        selectionBackground: "#264f78",
        black: "#0d1117",
        red: "#ff7b72",
        green: "#3fb950",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#c9d1d9",
        brightBlack: "#6e7681",
        brightRed: "#ffa198",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#f0f6fc",
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitRef.current = fitAddon;

    // Connect WebSocket.
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      sendResize(term, ws);
      onConnect?.();
    };

    ws.onmessage = (event) => {
      const data =
        event.data instanceof ArrayBuffer
          ? new TextDecoder().decode(event.data)
          : (event.data as string);
      term.write(data);
    };

    ws.onclose = (event) => {
      onDisconnect?.(event.code);
    };

    ws.onerror = () => {
      const msg = `WebSocket error connecting to ${wsUrl}`;
      term.write(`\r\n\x1b[31m${msg}\x1b[0m\r\n`);
      onError?.(msg);
    };

    // Forward keyboard input to PTY.
    term.onData((input) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(input);
      }
    });

    // Handle container resize via ResizeObserver.
    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      sendResize(term, ws);
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      ws.close(1000, "Component unmounted");
      term.dispose();
      xtermRef.current = null;
      wsRef.current = null;
      fitRef.current = null;
    };
  }, [wsUrl, shell, cwd, cols, rows, onConnect, onDisconnect, onError, sendResize]);

  return (
    <div
      ref={containerRef}
      className={`oa-terminal ${className}`}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
      // Allow the terminal div to receive focus for keyboard input.
      tabIndex={0}
    />
  );
}

export default Terminal;
