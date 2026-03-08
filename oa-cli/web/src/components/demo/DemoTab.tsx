import { useState } from 'react';
import { Zap, Bot, CheckCircle, XCircle, Clock, ChevronRight, Play, Trash2, Copy, MoreHorizontal } from 'lucide-react';

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="text-[11px] font-bold uppercase tracking-[0.15em] mb-4" style={{ color: '#555' }}>{title}</div>
      {children}
    </div>
  );
}

// ─── Agent card variants ──────────────────────────────────────────────────────
const STATUSES = [
  { label: 'running', dot: '#ff6b00', pulse: true },
  { label: 'done',    dot: '#22c55e', pulse: false },
  { label: 'failed',  dot: '#ef4444', pulse: false },
];

function CardV1({ status }: { status: typeof STATUSES[0] }) {
  return (
    <div style={{ background: '#111', border: `1px solid #222`, borderRadius: 8, padding: '12px 14px', width: 240, transition: 'border-color 150ms' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,107,0,0.4)'}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.dot, flexShrink: 0,
          animation: status.pulse ? 'ccPulse 1.5s infinite' : 'none' }} />
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f0f0f0', flex: 1 }}>researcher-a</span>
      </div>
      <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 8 }}>
        Research modern UI patterns for agent dashboards…
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, border: '1px solid #60a5fa44', color: '#60a5fa', background: '#60a5fa11' }}>sonnet</span>
        <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>2m 14s</span>
      </div>
    </div>
  );
}

function CardV2({ status }: { status: typeof STATUSES[0] }) {
  return (
    <div style={{ background: '#0f0f0f', border: `1px solid ${status.dot}33`, borderLeft: `3px solid ${status.dot}`,
      borderRadius: 6, padding: '10px 14px', width: 240 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#f0f0f0' }}>researcher-a</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: status.dot, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{status.label}</span>
      </div>
      <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>Research modern UI patterns…</div>
      <div style={{ marginTop: 8, fontSize: 10, color: '#444', fontFamily: 'monospace' }}>claude/sonnet · 2m 14s</div>
    </div>
  );
}

function CardV3({ status }: { status: typeof STATUSES[0] }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #111 0%, #0d0d0d 100%)',
      border: '1px solid #1a1a1a', borderRadius: 10, padding: '14px 16px', width: 240,
      boxShadow: status.pulse ? `0 0 20px ${status.dot}22` : '0 2px 12px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Bot size={14} style={{ color: status.dot }} />
        <span style={{ fontWeight: 800, fontSize: 13, color: '#f0f0f0', letterSpacing: '-0.01em' }}>researcher-a</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
          background: `${status.dot}22`, color: status.dot, textTransform: 'uppercase' }}>{status.label}</span>
      </div>
      <div style={{ fontSize: 11, color: '#777', lineHeight: 1.6, marginBottom: 10, fontStyle: 'italic' }}>
        "Research modern UI patterns for agent dashboards"
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#1a1a1a', color: '#555' }}>sonnet</span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#1a1a1a', color: '#555' }}>2m 14s</span>
      </div>
    </div>
  );
}

function CardV4({ status }: { status: typeof STATUSES[0] }) {
  return (
    <div style={{ background: '#111', borderRadius: 8, padding: '12px 14px', width: 240,
      outline: status.pulse ? `1px solid ${status.dot}` : '1px solid transparent',
      boxShadow: 'none', transition: 'all 200ms' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: status.dot, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
        ● {status.label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4 }}>researcher-a</div>
      <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5, marginBottom: 10 }}>
        Research modern UI patterns…
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#444', fontFamily: 'monospace' }}>claude/sonnet</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 2 }}><Copy size={11} /></button>
          <button style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 2 }}><MoreHorizontal size={11} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Button variants ──────────────────────────────────────────────────────────
function Buttons() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <button style={{ background: 'linear-gradient(135deg,#ff6b00,#c2410c)', color: '#fff', border: 'none',
        borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={14} /> Spawn Agent
      </button>
      <button style={{ background: '#111', color: '#f0f0f0', border: '1px solid #333',
        borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        Load Template
      </button>
      <button style={{ background: 'none', color: '#ff6b00', border: '1px solid #ff6b0044',
        borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        Run Pipeline
      </button>
      <button style={{ background: '#1a1a1a', color: '#888', border: '1px solid #222',
        borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <Trash2 size={13} /> Clean
      </button>
      <button style={{ background: 'none', color: '#ef4444', border: 'none',
        borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        Kill All
      </button>
    </div>
  );
}

// ─── Status badge variants ────────────────────────────────────────────────────
function Badges() {
  const badges = [
    { label: '3 active', bg: 'rgba(255,107,0,0.12)', color: '#ff6b00' },
    { label: '12 done', bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
    { label: '1 failed', bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    { label: 'sonnet', bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    { label: 'opus', bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
    { label: 'haiku', bg: 'rgba(34,211,238,0.12)', color: '#22d3ee' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {badges.map(b => (
        <span key={b.label} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px',
          borderRadius: 99, background: b.bg, color: b.color }}>{b.label}</span>
      ))}
    </div>
  );
}

// ─── Pipeline step preview ────────────────────────────────────────────────────
function PipelinePreview() {
  const steps = [
    { icon: <Play size={12} />, label: 'Trigger', color: '#22c55e' },
    { icon: <Bot size={12} />, label: 'Researcher', color: '#ff6b00' },
    { icon: <Bot size={12} />, label: 'Builder', color: '#ff6b00' },
    { icon: <CheckCircle size={12} />, label: 'Output', color: '#a78bfa' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ background: '#111', border: `1px solid ${s.color}44`, borderRadius: 8,
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: s.color }}>{s.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <ChevronRight size={16} style={{ color: '#333', margin: '0 4px' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Color palette ────────────────────────────────────────────────────────────
function Palette() {
  const colors = [
    { name: 'bg', hex: '#0a0a0a' }, { name: 'surface', hex: '#111111' },
    { name: 'border', hex: '#222222' }, { name: 'dim', hex: '#555555' },
    { name: 'muted', hex: '#888888' }, { name: 'text', hex: '#f0f0f0' },
    { name: 'accent', hex: '#ff6b00' }, { name: 'running', hex: '#22c55e' },
    { name: 'failed', hex: '#ef4444' }, { name: 'opus', hex: '#a78bfa' },
    { name: 'sonnet', hex: '#60a5fa' }, { name: 'haiku', hex: '#22d3ee' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {colors.map(c => (
        <div key={c.name} style={{ textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 8, background: c.hex,
            border: '1px solid #333', marginBottom: 4 }} />
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'monospace' }}>{c.name}</div>
          <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace' }}>{c.hex}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Input variants ───────────────────────────────────────────────────────────
function Inputs() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
      <input placeholder="Standaard input" style={{ background: '#0a0a0a', border: '1px solid #333',
        borderRadius: 8, padding: '10px 14px', color: '#f0f0f0', fontSize: 13, width: '100%', fontFamily: 'inherit' }} />
      <input placeholder="Met oranje focus" style={{ background: '#0a0a0a', border: '1px solid #ff6b0055',
        borderRadius: 8, padding: '10px 14px', color: '#f0f0f0', fontSize: 13, width: '100%', fontFamily: 'inherit' }} />
      <textarea placeholder="Textarea voor task prompts..." rows={3}
        style={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: 8,
        padding: '10px 14px', color: '#f0f0f0', fontSize: 13, width: '100%', fontFamily: 'inherit', resize: 'vertical' }} />
    </div>
  );
}

// ─── Stat cards ───────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { label: 'Active Agents', value: '3', icon: <Zap size={16} />, color: '#ff6b00' },
    { label: 'Completed', value: '24', icon: <CheckCircle size={16} />, color: '#22c55e' },
    { label: 'Failed', value: '1', icon: <XCircle size={16} />, color: '#ef4444' },
    { label: 'Avg Duration', value: '4m 12s', icon: <Clock size={16} />, color: '#60a5fa' },
  ];
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: '#111', border: '1px solid #222', borderRadius: 10,
          padding: '16px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
            <span style={{ color: s.color }}>{s.icon}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.02em' }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function DemoTab() {
  const [activeSection, setActiveSection] = useState('all');

  const sections = ['all', 'cards', 'buttons', 'inputs', 'pipeline', 'stats'];

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
      {/* Top bar */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}>Design Playground</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {sections.map(s => (
            <button key={s} onClick={() => setActiveSection(s)}
              style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                background: activeSection === s ? '#ff6b0022' : 'transparent',
                color: activeSection === s ? '#ff6b00' : '#555',
                border: 'none', cursor: 'pointer', textTransform: 'capitalize' }}>
              {s}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#333' }}>Probeer dingen uit hier — niks gaat naar productie</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px' }}>

        {(activeSection === 'all' || activeSection === 'stats') && (
          <Section title="Stat Cards">
            <Stats />
          </Section>
        )}

        {(activeSection === 'all' || activeSection === 'cards') && (
          <Section title="Agent Card — 4 variaties">
            {STATUSES.map(status => (
              <div key={status.label} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#333', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{status.label}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <CardV1 status={status} />
                  <CardV2 status={status} />
                  <CardV3 status={status} />
                  <CardV4 status={status} />
                </div>
              </div>
            ))}
          </Section>
        )}

        {(activeSection === 'all' || activeSection === 'pipeline') && (
          <Section title="Pipeline Preview">
            <PipelinePreview />
          </Section>
        )}

        {(activeSection === 'all' || activeSection === 'buttons') && (
          <Section title="Buttons">
            <Buttons />
            <div style={{ marginTop: 16 }}>
              <Badges />
            </div>
          </Section>
        )}

        {(activeSection === 'all' || activeSection === 'inputs') && (
          <Section title="Inputs">
            <Inputs />
          </Section>
        )}

        {(activeSection === 'all') && (
          <Section title="Kleurenpalet">
            <Palette />
          </Section>
        )}
      </div>
    </div>
  );
}
