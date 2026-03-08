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
      setFeedback({ ok: true, msg: 'Agent spawned successfully!' });
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : 'Spawn failed' });
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="border-t border-oa-border bg-oa-surface">
      {/* Card header */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2 border-b border-oa-border/50">
        <Zap size={11} className="text-oa-accent" />
        <span className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest">
          Spawn Agent
        </span>
      </div>

      <div className="p-2.5 space-y-1.5">
        {/* Template dropdown */}
        <div>
          <div className="text-[9px] uppercase text-oa-text-dim tracking-widest mb-0.5 font-semibold">Template</div>
          <select
            value={template}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs mb-0"
          >
            {TEMPLATES.map((t) => (
              <option key={t.label} value={t.label}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Model dropdown */}
        <div>
          <div className="text-[9px] uppercase text-oa-text-dim tracking-widest mb-0.5 font-semibold">Model</div>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs font-mono"
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

        {/* Task textarea */}
        <div>
          <div className="text-[9px] uppercase text-oa-text-dim tracking-widest mb-0.5 font-semibold">Task</div>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSpawn();
              }
            }}
            placeholder="Describe the task... (Ctrl+Enter to spawn)"
            rows={3}
            className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs resize-y font-sans leading-relaxed"
          />
        </div>

        {/* Name + parent */}
        <div className="flex gap-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="flex-1 px-2 py-1 bg-oa-bg border border-neutral-700 rounded text-oa-text text-[11px]"
          />
          <select
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            className="flex-1 px-2 py-1 bg-oa-bg border border-neutral-700 rounded text-oa-text text-[11px]"
          >
            <option value="">No parent</option>
            {running.map((a) => (
              <option key={a.name} value={a.name}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          <button
            onClick={handleSpawn}
            disabled={!task.trim()}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded font-bold text-xs transition-all ${
              task.trim()
                ? 'bg-oa-accent text-oa-bg cursor-pointer hover:brightness-110'
                : 'bg-oa-bg text-oa-text-dim cursor-default'
            }`}
          >
            <Zap size={11} />
            Spawn
          </button>
          <button
            onClick={() => useAgentStore.getState().cleanAgents()}
            className="flex items-center gap-1 px-3 py-1.5 bg-oa-bg text-neutral-400 border border-neutral-700 rounded text-[11px] cursor-pointer hover:text-neutral-200"
          >
            <Trash2 size={10} />
            Clean
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`flex items-center justify-center gap-1.5 mt-0.5 px-2 py-1.5 rounded text-[11px] font-medium text-center animate-fade-in border ${
            feedback.ok
              ? 'bg-green-950/60 border-green-800/40 text-green-400'
              : 'bg-red-950/60 border-red-800/40 text-red-400'
          }`}>
            {feedback.ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
            {feedback.msg}
          </div>
        )}
      </div>
    </div>
  );
}
