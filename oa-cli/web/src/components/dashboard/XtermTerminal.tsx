import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface XtermTerminalProps {
  output: string;
  agentName: string;
  isRunning: boolean;
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

export function XtermTerminal({ output, agentName, isRunning }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const prevAgentRef = useRef<string>('');
  const prevOutputRef = useRef<string>('');

  // Initialize terminal once
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      theme: IMPERTIO_THEME,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 11,
      lineHeight: 1.4,
      cursorBlink: isRunning,
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

  // When agentName changes: clear terminal
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    if (prevAgentRef.current !== agentName) {
      terminal.clear();
      prevAgentRef.current = agentName;
      prevOutputRef.current = '';
    }
  }, [agentName]);

  // When output changes: reset and write
  useEffect(() => {
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
  }, [output]);

  // Update cursor blink when running state changes
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.options.cursorBlink = isRunning;
  }, [isRunning]);

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
