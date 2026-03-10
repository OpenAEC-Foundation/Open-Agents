import React, { useState, useEffect, useCallback } from 'react';
import { Zap, ChevronRight, Clock } from 'lucide-react';

interface PipelineAgent {
  name: string;
  status: 'running' | 'done' | 'failed' | 'error' | string;
  started_at?: number;
  ended_at?: number;
  task?: string;
}

const MODELS = [
  { value: 'claude/sonnet', label: 'sonnet' },
  { value: 'claude/opus', label: 'opus' },
  { value: 'claude/haiku', label: 'haiku' },
];

function statusBadge(status: string) {
  if (status === 'running') {
    return { bg: '#16a34a22', border: '#16a34a55', color: '#4ade80', label: 'running' };
  } else if (status === 'done') {
    return { bg: '#64748b22', border: '#64748b55', color: '#94a3b8', label: 'done' };
  } else {
    return { bg: '#dc262622', border: '#dc262655', color: '#f87171', label: status };
  }
}

function formatDuration(started?: number, ended?: number): string {
  if (!started) return '';
  const end = ended ?? Date.now() / 1000;
  const secs = Math.floor(end - started);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

function detectPhase(name: string): 'planner' | 'worker' | 'combiner' | null {
  const lower = name.toLowerCase();
  if (lower.includes('plan')) return 'planner';
  if (lower.includes('combin') || lower.includes('merge') || lower.includes('final')) return 'combiner';
  if (lower.includes('work') || lower.includes('build') || lower.includes('impl')) return 'worker';
  return null;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #2a4a6b',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#1a2942',
  color: 'var(--color-oa-text, #e2e8f0)',
  outline: 'none',
};

export default function PipelinePanel() {
  const [task, setTask] = useState('');
  const [model, setModel] = useState('claude/sonnet');
  const [agents, setAgents] = useState<PipelineAgent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline');
      if (res.ok) {
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : data.agents ?? []);
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 2000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const handleSubmit = async () => {
    if (!task.trim()) return;
    setSubmitting(true);
    try {
      const name = `pipe-${Date.now()}`;
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: `[PIPELINE] ${task.trim()}`, name, model }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTask('');
      setFeedback({ ok: true, msg: 'Pipeline started!' });
      setTimeout(() => fetchAgents(), 500);
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : 'Failed to start' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Group agents into phases for the visual flow
  const planners = agents.filter(a => detectPhase(a.name) === 'planner');
  const workers = agents.filter(a => detectPhase(a.name) === 'worker');
  const combiners = agents.filter(a => detectPhase(a.name) === 'combiner');
  const unclassified = agents.filter(a => detectPhase(a.name) === null);

  const flowPhases: { label: string; items: PipelineAgent[] }[] = [
    { label: 'planner', items: planners },
    { label: 'workers', items: workers.length ? workers : unclassified },
    { label: 'combiner', items: combiners },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-oa-text, #e2e8f0)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Pipeline
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-oa-text-muted, #64748b)' }}>
          Planner → workers → combiner
        </p>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', background: '#1a2942', border: '1px solid #2a4a6b', borderRadius: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-oa-text-muted, #64748b)', marginBottom: '4px' }}>
            Task
          </label>
          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Describe the pipeline task… (Ctrl+Enter to start)"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-oa-text-muted, #64748b)', marginBottom: '6px' }}>
            Model
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {MODELS.map(m => {
              const active = model === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => setModel(m.value)}
                  style={{
                    padding: '3px 14px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: `1px solid ${active ? '#f97316' : '#2a4a6b'}`,
                    background: active ? '#f97316' : '#1a2942',
                    color: active ? '#fff' : 'var(--color-oa-text-muted, #64748b)',
                    cursor: 'pointer',
                    transition: 'all 120ms',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!task.trim() || submitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            border: 'none',
            background: task.trim() && !submitting ? '#f97316' : '#2a4a6b',
            color: task.trim() && !submitting ? '#fff' : '#64748b',
            cursor: task.trim() && !submitting ? 'pointer' : 'default',
            transition: 'background 150ms',
            width: '100%',
          }}
        >
          <Zap size={14} />
          {submitting ? 'Starting…' : 'Run Pipeline'}
        </button>

        {feedback && (
          <div style={{
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            textAlign: 'center',
            background: feedback.ok ? '#16a34a22' : '#dc262622',
            border: `1px solid ${feedback.ok ? '#16a34a55' : '#dc262655'}`,
            color: feedback.ok ? '#4ade80' : '#f87171',
          }}>
            {feedback.msg}
          </div>
        )}
      </div>

      {/* Active pipelines */}
      {agents.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-oa-text-muted, #64748b)' }}>
            Active Pipelines ({agents.length})
          </h3>

          {/* Visual flow */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {flowPhases.map((phase, idx) => (
              <React.Fragment key={phase.label}>
                {idx > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: '10px' }}>
                    <ChevronRight size={14} style={{ color: '#2a4a6b' }} />
                  </div>
                )}
                <div style={{
                  flex: '1 1 0',
                  minWidth: '80px',
                  padding: '8px',
                  background: '#1a2942',
                  border: '1px solid #2a4a6b',
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: '#f97316', marginBottom: '4px', letterSpacing: '0.05em' }}>
                    {phase.label}
                  </div>
                  {phase.items.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#2a4a6b' }}>—</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {phase.items.map(agent => {
                        const badge = statusBadge(agent.status);
                        return (
                          <div key={agent.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '1px 7px',
                              borderRadius: '999px',
                              fontSize: '10px',
                              fontWeight: 600,
                              background: badge.bg,
                              border: `1px solid ${badge.border}`,
                              color: badge.color,
                            }}>
                              {badge.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Agent list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {agents.map(agent => {
              const badge = statusBadge(agent.status);
              const duration = formatDuration(agent.started_at, agent.ended_at);
              return (
                <div
                  key={agent.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: '#1a2942',
                    border: '1px solid #2a4a6b',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-oa-text, #e2e8f0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {agent.name}
                    </div>
                    {agent.task && (
                      <div style={{ fontSize: '11px', color: 'var(--color-oa-text-muted, #64748b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                        {agent.task.replace(/^\[PIPELINE\]\s*/, '')}
                      </div>
                    )}
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    color: badge.color,
                    flexShrink: 0,
                  }}>
                    {badge.label}
                  </span>
                  {duration && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--color-oa-text-muted, #64748b)', flexShrink: 0 }}>
                      <Clock size={10} />
                      {duration}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {agents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-oa-text-muted, #64748b)', fontSize: '12px', border: '1px dashed #2a4a6b', borderRadius: '8px' }}>
          No active pipelines
        </div>
      )}
    </div>
  );
}
