import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { WS_BASE } from '../../api/client';

interface XtermTerminalProps {
  output?: string;
  agentName?: string;
  isRunning?: boolean;
  /** 'readonly' shows string output; 'interactive' connects to PTY WebSocket */
  mode?: 'readonly' | 'interactive';
}

const IMPERTIO_THEME = {
  background: '#0a0a0a',
  foreground: '#f0f0f0',
  cursor: '#ff6b00',
  selectionBackground: 'rgba(255,107,0,0.3)',
  black: '#0a0a0a',
  brightBlack: '#444444',
  green: '#00ff88',
  brightGreen: '#00cc6a',
  yellow: '#ffaa00',
  red: '#dc3545',
  cyan: '#00d4ff',
  white: '#f0f0f0',
  brightWhite: '#ffffff',
  blue: '#4a9eff',
  brightBlue: '#6ab0ff',
  magenta: '#c678dd',
  brightMagenta: '#d896f5',
  brightRed: '#ff6b6b',
  brightYellow: '#ffd080',
  brightCyan: '#40e0ff',
};

export function XtermTerminal({
  output = '',
  agentName = '',
  isRunning = false,
  mode = 'readonly',
}: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const prevAgentRef = useRef<string>('');
  const prevOutputRef = useRef<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);

  // Initialize terminal once
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      theme: IMPERTIO_THEME,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 11,
      lineHeight: 1.4,
      cursorBlink: mode === 'interactive' ? true : isRunning,
      cursorStyle: 'bar',
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // ResizeObserver for automatic fit
    const observer = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (mode === 'interactive' && wsRef.current?.readyState === WebSocket.OPEN) {
          const dims = fitAddon.proposeDimensions();
          if (dims) {
            wsRef.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
          }
        }
      } catch {
        // ignore resize errors during unmount
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Interactive mode: connect WebSocket + wire input
  useEffect(() => {
    if (mode !== 'interactive') return;

    closedRef.current = false;

    function connect() {
      if (closedRef.current) return;
      const ws = new WebSocket(`${WS_BASE}/ws/terminal`);
      wsRef.current = ws;

      ws.onopen = () => {
        const terminal = terminalRef.current;
        const fitAddon = fitAddonRef.current;
        if (terminal && fitAddon) {
          const dims = fitAddon.proposeDimensions();
          if (dims) {
            ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
          }
        }
      };

      ws.onmessage = (event) => {
        terminalRef.current?.write(event.data);
      };

      ws.onclose = () => {
        if (!closedRef.current) {
          // Auto-reconnect after 2 s
          reconnectTimerRef.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    // Wire keyboard input
    const terminal = terminalRef.current;
    let dataDisposable: { dispose(): void } | null = null;
    if (terminal) {
      dataDisposable = terminal.onData((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'input', data }));
        }
      });
    }

    return () => {
      closedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      dataDisposable?.dispose();
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'close' }));
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [mode]);

  // Readonly mode: when agentName changes → clear terminal
  useEffect(() => {
    if (mode !== 'readonly') return;
    const terminal = terminalRef.current;
    if (!terminal) return;
    if (prevAgentRef.current !== agentName) {
      terminal.clear();
      prevAgentRef.current = agentName;
      prevOutputRef.current = '';
    }
  }, [agentName, mode]);

  // Readonly mode: when output changes → reset and write
  useEffect(() => {
    if (mode !== 'readonly') return;
    const terminal = terminalRef.current;
    if (!terminal) return;
    if (prevOutputRef.current === output) return;
    prevOutputRef.current = output;

    if (output) {
      terminal.reset();
      terminal.write(output);
    } else {
      terminal.reset();
    }
  }, [output, mode]);

  // Update cursor blink when running state changes (readonly only)
  useEffect(() => {
    if (mode !== 'readonly') return;
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.options.cursorBlink = isRunning;
  }, [isRunning, mode]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a0a',
        padding: '4px',
        boxSizing: 'border-box',
      }}
    />
  );
}
