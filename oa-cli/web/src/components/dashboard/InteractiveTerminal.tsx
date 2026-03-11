import { useState, useEffect, useRef } from 'react';
import { XtermTerminal } from './XtermTerminal';
import { WS_BASE } from '../../api/client';

interface InteractiveTerminalProps {
  onClose?: () => void;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function InteractiveTerminal({ onClose }: InteractiveTerminalProps) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  // Track WebSocket status by monitoring a probe connection
  const probeRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Open a probe WebSocket just to detect status changes
    // (XtermTerminal manages its own WS internally)
    const ws = new WebSocket(`${WS_BASE}/ws/terminal`);
    probeRef.current = ws;

    // We close this immediately — XtermTerminal opens its own
    // This probe is only used to detect if the server is reachable
    ws.onopen = () => {
      setStatus('connected');
      ws.close();
    };
    ws.onerror = () => {
      setStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, []);

  const statusColor = status === 'connected' ? '#00ff88' : status === 'connecting' ? '#ffaa00' : '#dc3545';
  const statusLabel = status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting…' : 'disconnected';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          background: '#111',
          borderBottom: '1px solid #1a1a1a',
          flexShrink: 0,
        }}
      >
        {/* Status indicator */}
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: statusColor,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        <span style={{ color: '#4a5568', fontFamily: 'monospace', fontSize: 10 }}>
          bash — {statusLabel}
        </span>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            title="Close terminal"
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#4a5568',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Terminal */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <XtermTerminal mode="interactive" />
      </div>
    </div>
  );
}
