import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, LayoutDashboard, Cpu, Library, LayersIcon, Users, Settings, Sparkles, Bot } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useAgentStore } from '../stores/agentStore';
import type { MainTab } from '../types';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const setMainTab = useUIStore((s) => s.setMainTab);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const agents = useAgentStore((s) => s.agents);

  const navCommands: CommandItem[] = [
    { id: 'nav-dashboard', label: 'Dashboard', description: 'Go to Dashboard', icon: <LayoutDashboard size={14} />, action: () => { setMainTab('dashboard' as MainTab); onClose(); } },
    { id: 'nav-builder', label: 'Agent Builder', description: 'Go to Agent Builder', icon: <Cpu size={14} />, action: () => { setMainTab('builder' as MainTab); onClose(); } },
    { id: 'nav-templates', label: 'Templates', description: 'Go to Templates', icon: <Library size={14} />, action: () => { setMainTab('templates' as MainTab); onClose(); } },
    { id: 'nav-context', label: 'Context', description: 'Go to Context', icon: <LayersIcon size={14} />, action: () => { setMainTab('context' as MainTab); onClose(); } },
    { id: 'nav-teams', label: 'Teams', description: 'Go to Teams', icon: <Users size={14} />, action: () => { setMainTab('teams' as MainTab); onClose(); } },
    { id: 'nav-settings', label: 'Settings', description: 'Go to Settings', icon: <Settings size={14} />, action: () => { setMainTab('settings' as MainTab); onClose(); } },
    { id: 'nav-demo', label: 'Playground', description: 'Go to Playground', icon: <Sparkles size={14} />, action: () => { setMainTab('demo' as MainTab); onClose(); } },
  ];

  const agentCommands: CommandItem[] = agents.map((agent) => ({
    id: `agent-${agent.name}`,
    label: agent.name,
    description: `${agent.status} · ${agent.model}`,
    icon: <Bot size={14} />,
    action: () => {
      setMainTab('dashboard' as MainTab);
      selectAgent(agent.name);
      onClose();
    },
  }));

  const allCommands = [...navCommands, ...agentCommands];

  const filtered = query.trim()
    ? allCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          (cmd.description && cmd.description.toLowerCase().includes(query.toLowerCase()))
      )
    : allCommands;

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runSelected = useCallback(() => {
    if (filtered[selectedIdx]) {
      filtered[selectedIdx].action();
    }
  }, [filtered, selectedIdx]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        runSelected();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, runSelected, onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden"
        style={{
          background: 'var(--color-oa-sidebar)',
          borderColor: 'var(--color-oa-border)',
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-oa-border)' }}
        >
          <Search size={16} style={{ color: 'var(--color-oa-text-dim)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search agents..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-oa-text-dim"
            style={{ color: 'var(--color-oa-text)' }}
          />
          <kbd
            className="text-xs font-mono px-1.5 py-0.5 rounded border shrink-0"
            style={{
              background: 'var(--color-oa-surface)',
              borderColor: 'var(--color-oa-border)',
              color: 'var(--color-oa-text-dim)',
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div
              className="px-4 py-6 text-sm text-center"
              style={{ color: 'var(--color-oa-text-dim)' }}
            >
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((cmd, idx) => (
              <button
                key={cmd.id}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer"
                style={{
                  background:
                    idx === selectedIdx ? 'var(--color-oa-surface)' : 'transparent',
                  color: 'var(--color-oa-text)',
                }}
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => cmd.action()}
              >
                <span style={{ color: idx === selectedIdx ? 'var(--color-oa-accent)' : 'var(--color-oa-text-dim)' }}>
                  {cmd.icon}
                </span>
                <span className="flex-1 text-sm font-medium">{cmd.label}</span>
                {cmd.description && (
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-oa-text-dim)' }}>
                    {cmd.description}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="px-4 py-2 border-t flex items-center gap-3 text-xs"
          style={{
            borderColor: 'var(--color-oa-border)',
            color: 'var(--color-oa-text-dim)',
          }}
        >
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
