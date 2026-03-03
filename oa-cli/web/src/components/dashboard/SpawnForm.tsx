import { useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';

export function SpawnForm() {
  const [task, setTask] = useState('');
  const [model, setModel] = useState('claude/sonnet');
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');

  const spawn = useAgentStore((s) => s.spawnAgent);
  const running = useAgentStore((s) => s.getRunning)();

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
    } catch {
      // ignore
    }
  };

  return (
    <div className="border-t border-oa-border p-2.5 bg-oa-surface">
      <div className="pb-1.5 text-[10px] font-bold text-oa-text-muted uppercase tracking-widest">
        Spawn Agent
      </div>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs font-mono mb-1.5"
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
      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSpawn();
          }
        }}
        placeholder="Describe the task..."
        rows={3}
        className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs resize-y font-sans mb-1.5 leading-relaxed"
      />
      <div className="flex gap-1 mb-1.5">
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
      <div className="flex gap-1.5">
        <button
          onClick={handleSpawn}
          disabled={!task.trim()}
          className={`flex-1 py-1.5 rounded font-bold text-xs transition-all ${
            task.trim()
              ? 'bg-oa-accent text-oa-bg cursor-pointer hover:brightness-110'
              : 'bg-oa-bg text-oa-text-dim cursor-default'
          }`}
        >
          Spawn
        </button>
        <button
          onClick={() => useAgentStore.getState().cleanAgents()}
          className="px-3 py-1.5 bg-oa-bg text-neutral-400 border border-neutral-700 rounded text-[11px] cursor-pointer hover:text-neutral-200"
        >
          Clean
        </button>
      </div>
    </div>
  );
}
