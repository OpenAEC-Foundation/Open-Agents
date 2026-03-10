import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            background: '#0f1923',
            color: '#e2e8f0',
            padding: '2rem',
            gap: '1rem',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              color: '#f97316',
              marginBottom: '0.5rem',
            }}
          >
            ⚠
          </div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#f97316',
              margin: 0,
            }}
          >
            {this.props.fallbackTitle ?? 'Er is iets misgegaan'}
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#94a3b8',
              textAlign: 'center',
              maxWidth: '480px',
              margin: 0,
              fontFamily: 'monospace',
              background: '#1a2a3a',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: '1px solid #2a4a6b',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error?.message ?? 'Onbekende fout'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1.25rem',
              background: '#f97316',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Probeer opnieuw
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
