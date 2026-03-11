import { X, Keyboard } from 'lucide-react';

interface KeyboardHelpOverlayProps {
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  group: string;
  entries: ShortcutEntry[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    group: 'Navigation',
    entries: [
      { keys: ['1'], description: 'Dashboard' },
      { keys: ['2'], description: 'Agent Builder' },
      { keys: ['3'], description: 'Templates' },
      { keys: ['4'], description: 'Context' },
      { keys: ['5'], description: 'Teams' },
      { keys: ['6'], description: 'Settings' },
      { keys: ['7'], description: 'Playground' },
    ],
  },
  {
    group: 'Agent List',
    entries: [
      { keys: ['j'], description: 'Select next agent' },
      { keys: ['k'], description: 'Select previous agent' },
    ],
  },
  {
    group: 'General',
    entries: [
      { keys: ['Ctrl', 'K'], description: 'Command palette' },
      { keys: ['?'], description: 'Toggle this help overlay' },
      { keys: ['Esc'], description: 'Close overlay / cancel' },
    ],
  },
];

export function KeyboardHelpOverlay({ onClose }: KeyboardHelpOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl border overflow-hidden"
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
            <Keyboard size={16} style={{ color: 'var(--color-oa-accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--color-oa-text)' }}>
              Keyboard Shortcuts
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors hover:bg-white/10 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} style={{ color: 'var(--color-oa-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-oa-text-dim)' }}
              >
                {group.group}
              </div>
              <div className="space-y-1.5">
                {group.entries.map((entry) => (
                  <div
                    key={entry.description}
                    className="flex items-center justify-between text-sm"
                  >
                    <span style={{ color: 'var(--color-oa-text-muted)' }}>
                      {entry.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {entry.keys.map((key) => (
                        <kbd
                          key={key}
                          className="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-mono font-semibold border"
                          style={{
                            background: 'var(--color-oa-surface)',
                            borderColor: 'var(--color-oa-border)',
                            color: 'var(--color-oa-text)',
                            minWidth: '28px',
                          }}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t text-xs text-center"
          style={{
            borderColor: 'var(--color-oa-border)',
            color: 'var(--color-oa-text-dim)',
          }}
        >
          Press <kbd className="font-mono font-bold" style={{ color: 'var(--color-oa-text-muted)' }}>?</kbd> or{' '}
          <kbd className="font-mono font-bold" style={{ color: 'var(--color-oa-text-muted)' }}>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
