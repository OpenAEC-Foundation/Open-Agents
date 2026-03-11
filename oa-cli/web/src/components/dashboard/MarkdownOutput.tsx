import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownOutputProps {
  content: string;
  compact?: boolean;
}

export function MarkdownOutput({ content, compact = false }: MarkdownOutputProps) {
  return (
    <div
      style={{
        padding: compact ? '0' : '1rem 1.25rem',
        overflowY: compact ? undefined : 'auto',
        height: compact ? undefined : '100%',
        fontSize: compact ? '12px' : '13px',
        lineHeight: '1.7',
        color: 'var(--color-oa-text)',
        fontFamily: 'var(--font-display, system-ui, sans-serif)',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 style={{ fontSize: '1.2em', fontWeight: 700, marginBottom: '0.6em', marginTop: '1em', color: 'var(--color-oa-text)', borderBottom: '1px solid var(--color-oa-border)', paddingBottom: '0.3em' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: '1.05em', fontWeight: 700, marginBottom: '0.5em', marginTop: '0.9em', color: 'var(--color-oa-text)' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: '0.95em', fontWeight: 600, marginBottom: '0.4em', marginTop: '0.75em', color: 'var(--color-oa-text-muted)' }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p style={{ marginBottom: '0.6em', color: 'var(--color-oa-text)' }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: 'var(--color-oa-text)' }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: 'var(--color-oa-text-muted)', fontStyle: 'italic' }}>{children}</em>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.startsWith('language-');
            if (isBlock) {
              return (
                <code
                  style={{
                    display: 'block',
                    background: '#0a0a0a',
                    color: '#f0f0f0',
                    padding: '0.75em 1em',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono, monospace)',
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    border: '1px solid var(--color-oa-border)',
                  }}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-oa-accent, #f97316)',
                  padding: '0.15em 0.4em',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono, monospace)',
                  border: '1px solid var(--color-oa-border)',
                }}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre
              style={{
                marginBottom: '0.75em',
                marginTop: '0.5em',
              }}
            >
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul style={{ paddingLeft: '1.25em', marginBottom: '0.6em', listStyleType: 'disc' }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: '1.25em', marginBottom: '0.6em', listStyleType: 'decimal' }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: '0.2em', color: 'var(--color-oa-text)' }}>
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: '3px solid var(--color-oa-accent, #f97316)',
                paddingLeft: '0.75em',
                marginLeft: 0,
                marginBottom: '0.6em',
                color: 'var(--color-oa-text-muted)',
                fontStyle: 'italic',
              }}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', marginBottom: '0.75em' }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  fontSize: '12px',
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              style={{
                padding: '6px 12px',
                textAlign: 'left',
                fontWeight: 600,
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-oa-text-dim)',
                borderBottom: '1px solid var(--color-oa-border)',
                background: 'var(--color-oa-surface)',
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                padding: '5px 12px',
                color: 'var(--color-oa-text)',
                borderBottom: '1px solid var(--color-oa-border)',
              }}
            >
              {children}
            </td>
          ),
          hr: () => (
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-oa-border)', margin: '0.75em 0' }} />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-oa-accent)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
