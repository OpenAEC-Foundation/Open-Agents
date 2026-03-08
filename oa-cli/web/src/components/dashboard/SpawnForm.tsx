import { useState, useEffect } from 'react';
import { CheckCircle, Trash2, XCircle, Zap } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import { useUIStore } from '../../stores/uiStore';

const TEMPLATES: { label: string; prompt: string }[] = [
  { label: 'Custom task', prompt: '' },
  {
    label: 'Researcher',
    prompt: 'Research the following topic in depth and produce a structured report with key findings, sources, and recommendations:\n\n[Topic here]',
  },
  {
    label: 'Developer',
    prompt: 'Implement the following feature/fix. Read relevant files first, then write clean, well-structured code:\n\n[Task here]',
  },
  {
    label: 'Reviewer',
    prompt: 'Review the following code or document for quality, correctness, and improvements. Provide actionable feedback:\n\n[File or content here]',
  },
  {
    label: 'Analyzer',
    prompt: 'Analyze the following data, logs, or codebase and provide a structured breakdown of patterns, issues, and insights:\n\n[Input here]',
  },
];

export function SpawnForm() {
  const [task, setTask] = useState('');
  const [model, setModel] = useState('claude/sonnet');
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [template, setTemplate] = useState('Custom task');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const spawn = useAgentStore((s) => s.spawnAgent);
  const running = useAgentStore((s) => s.getRunning)();
  const prefilledTask = useUIStore((s) => s.prefilledTask);
  const prefilledModel = useUIStore((s) => s.prefilledModel);
  const clearPrefilled = useUIStore((s) => s.clearPrefilled);

  useEffect(() => {
    if (prefilledTask !== null) {
      setTask(prefilledTask);
      setTemplate('Custom task');
      if (prefilledModel) setModel(prefilledModel);
      clearPrefilled();
    }
  }, [prefilledTask, prefilledModel, clearPrefilled]);

  const handleTemplateChange = (label: string) => {
    setTemplate(label);
    const found = TEMPLATES.find((t) => t.label === label);
    if (found && found.prompt) setTask(found.prompt);
    else if (found && !found.prompt) setTask('');
  };

  const handleSpawn = async () => {
    if (!task.trim()) return;
    const body: { task: string; model?: string; name?: string; parent?: string } = {
      task: task.trim(),
      model,
    };
    if (name.trim()) body.name = name.trim();
    if (parent) body.parent = parent;
    try {
      await spawn(body);
      setTask('');
      setName('');
      setParent('');
      setTemplate('Custom task');
      setFeedback({ ok: true, msg: 'Agent spawned!' });
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : 'Spawn failed' });
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-oa-bg border border-oa-border rounded-lg text-oa-text text-[13px] placeholder-oa-text-dim transition-colors';
  const labelClass = 'text-[11px] font-semibold text-oa-text-muted uppercase tracking-wider mb-1.5 block';

  return (
    <div className="border-t border-oa-border bg-oa-surface">
      {/* Section header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-oa-border/60">
        <Zap size={13} className="text-oa-accent" />
        <span className="text-[11px] font-bold text-oa-text-muted uppercase tracking-widest">
          Spawn Agent
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Template */}
        <div>
          <label className={labelClass}>Template</label>
          <select
            value={template}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className={inputClass}
          >
            {TEMPLATES.map((t) => (
              <option key={t.label} value={t.label}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className={labelClass}>Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={`${inputClass} font-mono`}
          >
            <option value="claude/opus">claude/opus</option>
            <option value="claude/sonnet">claude/sonnet</option>
            <option value="claude/haiku">claude/haiku</option>
            <optgroup label="Ollama">
              <option value="ollama/qwen3:4b">qwen3:4b</option>
              <option value="ollama/phi4-mini">phi4-mini</option>
              <option value="ollama/qwen2.5-coder:7b">qwen2.5-coder:7b</option>
              <option value="ollama/qwen3:8b">qwen3:8b</option>
              <option value="ollama/llama3.2:3b">llama3.2:3b</option>
            </optgroup>
          </select>
        </div>

        {/* Task */}
        <div>
          <label className={labelClass}>Task</label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSpawn();
              }
            }}
            placeholder="Describe the task… (Ctrl+Enter to spawn)"
            rows={4}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </div>

        {/* Name + parent */}
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="flex-1 px-3 py-2 bg-oa-bg border border-oa-border rounded-lg text-oa-text text-[13px] placeholder-oa-text-dim"
          />
          <select
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            className="flex-1 px-3 py-2 bg-oa-bg border border-oa-border rounded-lg text-oa-text text-[13px]"
          >
            <option value="">No parent</option>
            {running.map((a) => (
              <option key={a.name} value={a.name}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSpawn}
            disabled={!task.trim()}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-[13px] transition-all ${
              task.trim()
                ? 'text-white cursor-pointer hover:brightness-110'
                : 'bg-oa-border text-oa-text-dim cursor-default'
            }`}
            style={task.trim() ? { background: 'linear-gradient(135deg, #f97316, #c2410c)' } : undefined}
          >
            <Zap size={13} />
            Spawn
          </button>
          <button
            onClick={() => useAgentStore.getState().cleanAgents()}
            className="flex items-center gap-1.5 px-3 py-2 bg-oa-bg text-oa-text-muted border border-oa-border rounded-lg text-[13px] cursor-pointer hover:text-oa-text transition-colors"
          >
            <Trash2 size={12} />
            Clean
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium animate-fade-in border ${
              feedback.ok
                ? 'bg-green-950/60 border-green-800/40 text-green-400'
                : 'bg-red-950/60 border-red-800/40 text-red-400'
            }`}
          >
            {feedback.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {feedback.msg}
          </div>
        )}
      </div>
    </div>
  );
}
