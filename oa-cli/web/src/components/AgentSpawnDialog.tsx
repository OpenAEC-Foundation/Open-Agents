import { useState, useEffect, useRef } from 'react';
import { X, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';

const TEMPLATES: { label: string; prompt: string }[] = [
  { label: 'Custom task', prompt: '' },
  { label: 'Researcher', prompt: 'Research the following topic in depth and produce a structured report with key findings, sources, and recommendations:\n\n[Topic here]' },
  { label: 'Developer', prompt: 'Implement the following feature/fix. Read relevant files first, then write clean, well-structured code:\n\n[Task here]' },
  { label: 'Reviewer', prompt: 'Review the following code or document for quality, correctness, and improvements. Provide actionable feedback:\n\n[File or content here]' },
  { label: 'Analyzer', prompt: 'Analyze the following data, logs, or codebase and provide a structured breakdown of patterns, issues, and insights:\n\n[Input here]' },
];

const CLAUDE_MODELS = [
  { value: 'claude/haiku', label: 'haiku' },
  { value: 'claude/sonnet', label: 'sonnet' },
  { value: 'claude/opus', label: 'opus' },
];

interface AgentSpawnDialogProps {
  onClose: () => void;
}

export function AgentSpawnDialog({ onClose }: AgentSpawnDialogProps) {
  const [task, setTask] = useState('');
  const [model, setModel] = useState('claude/sonnet');
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('Custom task');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [spawning, setSpawning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const spawn = useAgentStore((s) => s.spawnAgent);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleTemplateChange = (label: string) => {
    setTemplate(label);
    const found = TEMPLATES.find((t) => t.label === label);
    if (found && found.prompt) setTask(found.prompt);
    else if (found && !found.prompt) setTask('');
  };

  const handleSpawn = async () => {
    if (!task.trim() || spawning) return;
    setSpawning(true);
    const body: { task: string; model?: string; name?: string } = {
      task: task.trim(),
      model,
    };
    if (name.trim()) body.name = name.trim();
    try {
      await spawn(body);
      setFeedback({ ok: true, msg: 'Agent spawned!' });
      setTimeout(() => onClose(), 800);
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : 'Spawn failed' });
    } finally {
      setSpawning(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--color-oa-border)',
    borderRadius: '8px',
    fontSize: '13px',
    background: 'var(--color-oa-surface)',
    color: 'var(--color-oa-text)',
    outline: 'none',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden"
        style={{
          background: 'var(--color-oa-sidebar)',
          borderColor: 'var(--color-oa-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-oa-border)' }}
        >
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: 'var(--color-oa-accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--color-oa-text)' }}>
              Spawn Agent
            </span>
            <kbd
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border ml-2"
              style={{
                background: 'var(--color-oa-surface)',
                borderColor: 'var(--color-oa-border)',
                color: 'var(--color-oa-text-dim)',
              }}
            >
              F2
            </kbd>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors hover:bg-white/10 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} style={{ color: 'var(--color-oa-text-muted)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Template */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-oa-text-muted)' }}>
              Template
            </label>
            <select
              value={template}
              onChange={(e) => handleTemplateChange(e.target.value)}
              style={inputStyle}
            >
              {TEMPLATES.map((t) => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Task */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-oa-text-muted)' }}>
              Task
            </label>
            <textarea
              ref={textareaRef}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSpawn();
                }
              }}
              placeholder="Describe the task... (Ctrl+Enter to spawn)"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          {/* Model pills */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-oa-text-muted)' }}>
              Model
            </label>
            <div className="flex items-center gap-1.5">
              {CLAUDE_MODELS.map((m) => {
                const active = model === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => setModel(m.value)}
                    style={{
                      padding: '3px 12px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: `1px solid ${active ? 'var(--color-oa-accent)' : 'var(--color-oa-border)'}`,
                      background: active ? 'var(--color-oa-accent)' : 'var(--color-oa-surface)',
                      color: active ? '#fff' : 'var(--color-oa-text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced: name */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs cursor-pointer"
              style={{ color: 'var(--color-oa-text-dim)' }}
            >
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Advanced options
            </button>
            {showAdvanced && (
              <div className="mt-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Agent name (optional)"
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--color-oa-border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-oa-text-dim)' }}>
            <kbd className="font-mono">Ctrl+Enter</kbd> spawn &middot; <kbd className="font-mono">Esc</kbd> close
          </span>
          <button
            onClick={handleSpawn}
            disabled={!task.trim() || spawning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              background: task.trim() && !spawning ? 'var(--color-oa-accent)' : 'var(--color-oa-border)',
              color: task.trim() && !spawning ? '#fff' : 'var(--color-oa-text-dim)',
              cursor: task.trim() && !spawning ? 'pointer' : 'default',
            }}
          >
            <Zap size={14} />
            {spawning ? 'Spawning...' : 'Spawn Agent'}
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mx-5 mb-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border ${
              feedback.ok
                ? 'bg-green-900/30 border-green-700 text-green-400'
                : 'bg-red-900/30 border-red-700 text-red-400'
            }`}
          >
            {feedback.msg}
          </div>
        )}
      </div>
    </div>
  );
}
