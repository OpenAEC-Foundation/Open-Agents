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

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/20 focus:border-[#ff6b35] transition-colors bg-white placeholder:text-gray-400';

  return (
    <div className="bg-white border-t border-gray-200 p-4 space-y-3">
      {/* Template */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Template
        </label>
        <select
          value={template}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className={inputClass}
          style={{ color: '#1a2a3a' }}
        >
          {TEMPLATES.map((t) => (
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Task */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Task
        </label>
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
          rows={4}
          className={`${inputClass} resize-y leading-relaxed`}
          style={{ color: '#1a2a3a' }}
        />
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Model
        </label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CLAUDE_MODELS.map((m) => (
            <button
              key={m.value}
              onClick={() => { setModel(m.value); setUseOllama(false); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                model === m.value && !useOllama
                  ? 'bg-[#ff6b35] text-white border-[#ff6b35]'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
          <button
            onClick={() => {
              if (!useOllama) { setUseOllama(true); setModel(OLLAMA_MODELS[0].value); }
              else { setUseOllama(false); setModel('claude/sonnet'); }
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              useOllama
                ? 'bg-[#ff6b35] text-white border-[#ff6b35]'
                : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700'
            }`}
          >
            ollama
          </button>
        </div>
        {useOllama && (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={`mt-2 ${inputClass}`}
            style={{ color: '#1a2a3a' }}
          >
            {OLLAMA_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Advanced: name + parent */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Advanced options
        </button>
        {showAdvanced && (
          <div className="flex gap-2 mt-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className={inputClass}
              style={{ color: '#1a2a3a' }}
            />
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className={inputClass}
              style={{ color: '#1a2a3a' }}
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
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            task.trim()
              ? 'bg-[#ff6b35] text-white cursor-pointer hover:bg-[#e55a2a]'
              : 'bg-gray-100 text-gray-400 cursor-default'
          }`}
        >
          <Zap size={14} />
          Spawn Agent
        </button>
        <button
          onClick={() => useAgentStore.getState().cleanAgents()}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-white text-gray-500 border border-gray-200 rounded-lg text-sm cursor-pointer hover:text-gray-700 hover:border-gray-300 transition-colors"
        >
          <Trash2 size={13} />
          Clean
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border ${
            feedback.ok
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
