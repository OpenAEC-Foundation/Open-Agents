import { useState, useEffect } from 'react';
import { CheckCircle, Trash2, XCircle, Zap, ChevronDown, ChevronUp } from 'lucide-react';
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

const CLAUDE_MODELS = [
  { value: 'claude/haiku', label: 'haiku' },
  { value: 'claude/sonnet', label: 'sonnet' },
  { value: 'claude/opus', label: 'opus' },
];

const OLLAMA_MODELS = [
  { value: 'ollama/qwen3:4b', label: 'qwen3:4b' },
  { value: 'ollama/phi4-mini', label: 'phi4-mini' },
  { value: 'ollama/qwen2.5-coder:7b', label: 'qwen2.5-coder:7b' },
  { value: 'ollama/qwen3:8b', label: 'qwen3:8b' },
  { value: 'ollama/llama3.2:3b', label: 'llama3.2:3b' },
];

export function SpawnForm() {
  const [task, setTask] = useState('');
  const [model, setModel] = useState('claude/sonnet');
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [template, setTemplate] = useState('Custom task');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useOllama, setUseOllama] = useState(false);

  const spawn = useAgentStore((s) => s.spawnAgent);
  const running = useAgentStore((s) => s.getRunning)();
  const prefilledTask = useUIStore((s) => s.prefilledTask);
  const prefilledModel = useUIStore((s) => s.prefilledModel);
  const clearPrefilled = useUIStore((s) => s.clearPrefilled);

  useEffect(() => {
    if (prefilledTask !== null) {
      setTask(prefilledTask);
      setTemplate('Custom task');
      if (prefilledModel) {
        setModel(prefilledModel);
        if (prefilledModel.startsWith('ollama/')) setUseOllama(true);
      }
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

  const modelPillClass = (value: string) => {
    const active = model === value && !useOllama;
    if (!active) return 'bg-transparent border-neutral-700/40 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600';
    if (value.includes('opus')) return 'bg-violet-950/60 border-violet-700/50 text-violet-300';
    if (value.includes('sonnet')) return 'bg-blue-950/60 border-blue-700/50 text-blue-300';
    return 'bg-cyan-950/60 border-cyan-700/50 text-cyan-300';
  };

  return (
    <div className="border-b border-oa-border bg-oa-surface">
      {/* Section header */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <Zap size={12} className="text-oa-accent" />
        <span className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest">Spawn</span>
        <select
          value={template}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="ml-auto text-[10px] bg-transparent text-oa-text-dim border-none outline-none cursor-pointer"
        >
          {TEMPLATES.map((t) => (
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {/* Task textarea — main focus */}
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSpawn();
            }
          }}
          placeholder="Describe the task… (Ctrl+Enter)"
          rows={5}
          className="w-full px-2.5 py-2 bg-oa-bg border border-oa-border rounded-lg text-oa-text text-[12px] placeholder-oa-text-dim resize-y leading-relaxed focus:outline-none focus:border-oa-accent/50 transition-colors"
        />

        {/* Model pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {CLAUDE_MODELS.map((m) => (
            <button
              key={m.value}
              onClick={() => { setModel(m.value); setUseOllama(false); }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${modelPillClass(m.value)}`}
            >
              {m.label}
            </button>
          ))}
          <button
            onClick={() => {
              if (!useOllama) { setUseOllama(true); setModel(OLLAMA_MODELS[0].value); }
              else { setUseOllama(false); setModel('claude/sonnet'); }
            }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
              useOllama
                ? 'bg-orange-950/60 border-orange-700/50 text-orange-300'
                : 'bg-transparent border-neutral-700/40 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600'
            }`}
          >
            ollama
          </button>
          {useOllama && (
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="text-[10px] bg-oa-bg border border-oa-border rounded px-1.5 py-0.5 text-oa-text"
            >
              {OLLAMA_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Advanced toggle: name + parent */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors cursor-pointer"
          >
            {showAdvanced ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            name / parent
          </button>
          {showAdvanced && (
            <div className="flex gap-2 mt-1.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (optional)"
                className="flex-1 px-2.5 py-1.5 bg-oa-bg border border-oa-border rounded-lg text-oa-text text-[11px] placeholder-oa-text-dim focus:outline-none"
              />
              <select
                value={parent}
                onChange={(e) => setParent(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-oa-bg border border-oa-border rounded-lg text-oa-text text-[11px]"
              >
                <option value="">No parent</option>
                {running.map((a) => (
                  <option key={a.name} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSpawn}
            disabled={!task.trim()}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-[12px] transition-all ${
              task.trim()
                ? 'text-white cursor-pointer hover:brightness-110'
                : 'bg-oa-border text-oa-text-dim cursor-default'
            }`}
            style={task.trim() ? { background: 'linear-gradient(135deg, #f97316, #c2410c)' } : undefined}
          >
            <Zap size={12} />
            Spawn
          </button>
          <button
            onClick={() => useAgentStore.getState().cleanAgents()}
            className="flex items-center gap-1 px-2.5 py-2 bg-oa-bg text-oa-text-muted border border-oa-border rounded-lg text-[11px] cursor-pointer hover:text-oa-text transition-colors"
          >
            <Trash2 size={11} />
            Clean
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium animate-fade-in border ${
              feedback.ok
                ? 'bg-green-950/60 border-green-800/40 text-green-400'
                : 'bg-red-950/60 border-red-800/40 text-red-400'
            }`}
          >
            {feedback.ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
            {feedback.msg}
          </div>
        )}
      </div>
    </div>
  );
}
