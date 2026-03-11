import { useEffect, useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAgentStore } from '../stores/agentStore';
import type { MainTab } from '../types';

const TAB_ORDER: MainTab[] = [
  'dashboard',
  'builder',
  'templates',
  'context',
  'teams',
  'settings',
  'demo',
];

interface KeyboardShortcutsOptions {
  onToggleHelp: () => void;
  onToggleCommandPalette: () => void;
}

export function useKeyboardShortcuts({ onToggleHelp, onToggleCommandPalette }: KeyboardShortcutsOptions) {
  const setMainTab = useUIStore((s) => s.setMainTab);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const agents = useAgentStore((s) => s.agents);
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const hierarchy = useAgentStore((s) => s.getHierarchy)();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+K: command palette
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        onToggleCommandPalette();
        return;
      }

      // ? : toggle keyboard help overlay
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // 1-7: switch tabs
      if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[1-7]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < TAB_ORDER.length) {
          e.preventDefault();
          setMainTab(TAB_ORDER[idx]);
        }
        return;
      }

      // j/k: navigate agent list up/down
      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'j' || e.key === 'k')) {
        if (hierarchy.length === 0) return;
        e.preventDefault();

        const names = hierarchy.map((h) => h.agent.name);
        const currentIdx = selectedAgent ? names.indexOf(selectedAgent) : -1;

        if (e.key === 'j') {
          // Down
          const nextIdx = currentIdx < names.length - 1 ? currentIdx + 1 : 0;
          selectAgent(names[nextIdx]);
        } else {
          // Up
          const prevIdx = currentIdx > 0 ? currentIdx - 1 : names.length - 1;
          selectAgent(names[prevIdx]);
        }
        return;
      }
    },
    [setMainTab, selectAgent, agents, selectedAgent, hierarchy, onToggleHelp, onToggleCommandPalette]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
