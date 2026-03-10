# Frontend Package Research — Open-Agents Web App

**Date:** 2026-03-08
**Stack:** React 19.2.4 · Vite 7.3.1 · Tailwind 4.1 · TypeScript 5.9 · Tauri 2.x
**Targets:** chrome105 (Windows/Tauri), safari14 (macOS/Linux/Tauri)

---

## Install Order (recommended)

```bash
# 1. Lowest risk, instant value
npm install sonner

# 2. Standalone, no deps
npm install react-hotkeys-hook

# 3. Layout change — do before adding panels to views
npm install react-resizable-panels

# 4. Command palette — integrates with existing Radix/Zustand setup
npm install cmdk

# 5. Most complex — needs Tauri shell wiring
npm install @xterm/xterm @xterm/addon-fit
```

---

## Impact vs Effort Matrix

| Package | Impact | Setup Time | ROI |
|---|---|---|---|
| `sonner` | High (all async ops) | ~15 min | **⭐ Highest** |
| `react-hotkeys-hook` | High (power users) | ~30 min | ⭐⭐ |
| `react-resizable-panels` | Medium-high | ~1–2h | ⭐⭐ |
| `cmdk` | High (discovery) | ~2–3h | ⭐⭐ |
| `@xterm/xterm` | Very high (terminal) | ~3–4h | ⭐ (complex) |

**Highest impact per hour: `sonner`** — 15-minute install, immediate UX improvement across all agent status/error flows.

---

## 1. `sonner` — Toast Notifications

### Install
```bash
npm install sonner
```

### App.tsx setup
```tsx
// App.tsx — add to top-level return
import { Toaster } from 'sonner';

export default function App() {
  // ... existing code ...
  return (
    <div className="flex h-screen bg-oa-bg text-oa-text font-sans overflow-hidden">
      {/* existing style tag */}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--oa-surface)',
            color: 'var(--oa-text)',
            border: '1px solid var(--oa-border)',
          },
        }}
      />
      <Sidebar />
      {/* ... rest of layout ... */}
    </div>
  );
}
```

### Usage in components
```tsx
import { toast } from 'sonner';

// Success
toast.success('Agent started', { description: 'research-packages is running' });

// Error
toast.error('Agent failed', { description: err.message });

// Promise (auto pending → success/error)
toast.promise(startAgent(name), {
  loading: `Starting ${name}...`,
  success: (data) => `${name} started`,
  error: (err) => `Failed: ${err.message}`,
});

// Action button
toast('Agent completed', {
  action: { label: 'View output', onClick: () => openOutput(name) },
});
```

### Gotchas with Vite/React 19/Tailwind 4
- No CSS import needed — fully self-contained styles
- `theme="dark"` doesn't auto-sync with CSS vars — use `toastOptions.style` for theme tokens
- Tailwind 4 purge: sonner uses inline styles, no purge issues
- safari14 target: fully supported (no modern JS features used)

### Alternative
`react-hot-toast` — lighter, but sonner has better promise API and Vercel polish.

---

## 2. `react-hotkeys-hook` — Keyboard Shortcuts

### Install
```bash
npm install react-hotkeys-hook
```

### App.tsx setup
```tsx
// No provider needed — works out of the box
// Import directly in components or create a global hooks file
```

### Global shortcuts file
```tsx
// src/hooks/useGlobalHotkeys.ts
import { useHotkeys } from 'react-hotkeys-hook';
import { useUIStore } from '../stores/uiStore';

export function useGlobalHotkeys() {
  const setActiveMainTab = useUIStore((s) => s.setActiveMainTab);

  // Tab navigation
  useHotkeys('ctrl+1', () => setActiveMainTab('dashboard'), { preventDefault: true });
  useHotkeys('ctrl+2', () => setActiveMainTab('builder'), { preventDefault: true });
  useHotkeys('ctrl+3', () => setActiveMainTab('templates'), { preventDefault: true });
  useHotkeys('ctrl+4', () => setActiveMainTab('context'), { preventDefault: true });
  useHotkeys('ctrl+5', () => setActiveMainTab('teams'), { preventDefault: true });
  useHotkeys('ctrl+,', () => setActiveMainTab('settings'), { preventDefault: true });

  // Command palette trigger (pairs with cmdk)
  useHotkeys('ctrl+k, meta+k', () => {
    useUIStore.getState().setCommandPaletteOpen(true);
  }, { preventDefault: true });
}
```

### Usage in App.tsx
```tsx
import { useGlobalHotkeys } from './hooks/useGlobalHotkeys';

export default function App() {
  useGlobalHotkeys(); // call at top level
  // ... rest of component
}
```

### Scoped shortcut in component
```tsx
import { useHotkeys } from 'react-hotkeys-hook';

function AgentCard({ agent }) {
  const ref = useHotkeys<HTMLDivElement>('enter', () => openAgent(agent.id), {
    enableOnFormTags: false,
  });
  return <div ref={ref} tabIndex={0}>{/* ... */}</div>;
}
```

### Gotchas with Vite/React 19/Tailwind 4
- React 19 Strict Mode: hooks fire twice in dev — add deduplication guard if needed
- `meta+k` = Cmd+K on Mac; use `ctrl+k, meta+k` for cross-platform
- `enableOnFormTags: true` needed if shortcuts should fire inside inputs
- No SSR/hydration issues (Tauri is client-only)
- Vite HMR: hotkeys registered in root component survive HMR fine

### Alternative
Native `useEffect` + `addEventListener('keydown')` — viable but verbose. react-hotkeys-hook is strongly preferred.

---

## 3. `react-resizable-panels` — Resizable Layout

### Install
```bash
npm install react-resizable-panels
```

### Agent detail view with resizable panels
```tsx
// src/components/dashboard/AgentDetailPanel.tsx
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
} from 'react-resizable-panels';

export function AgentDetailPanel() {
  return (
    <PanelGroup direction="horizontal" autoSaveId="agent-detail-layout">
      {/* Agent list / sidebar */}
      <Panel defaultSize={25} minSize={15} maxSize={40}>
        <AgentList />
      </Panel>

      <PanelResizeHandle className="w-1 bg-[var(--oa-border)] hover:bg-[var(--oa-accent)] transition-colors cursor-col-resize" />

      {/* Main content */}
      <Panel defaultSize={75}>
        <PanelGroup direction="vertical">
          <Panel defaultSize={60} minSize={30}>
            <AgentOutput />
          </Panel>

          <PanelResizeHandle className="h-1 bg-[var(--oa-border)] hover:bg-[var(--oa-accent)] transition-colors cursor-row-resize" />

          {/* Terminal panel */}
          <Panel defaultSize={40} minSize={20}>
            <TerminalPanel />
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}
```

### Persistent layout (localStorage)
```tsx
// autoSaveId="agent-detail-layout" handles persistence automatically
// Layout is saved per-user across sessions — no extra code needed
```

### Collapsed panel (toggle terminal)
```tsx
import { Panel, ImperativePanelHandle } from 'react-resizable-panels';
import { useRef } from 'react';

function TerminalToggle() {
  const panelRef = useRef<ImperativePanelHandle>(null);

  const toggle = () => {
    if (panelRef.current?.isCollapsed()) {
      panelRef.current.expand();
    } else {
      panelRef.current?.collapse();
    }
  };

  return (
    <>
      <button onClick={toggle}>Toggle Terminal</button>
      <Panel ref={panelRef} collapsible collapsedSize={0} minSize={20}>
        <TerminalPanel />
      </Panel>
    </>
  );
}
```

### Gotchas with Vite/React 19/Tailwind 4
- Panels need `height: 100%` on children — add `className="h-full overflow-auto"` to panel children
- PanelGroup must have explicit height — wrap in `<div className="h-full">` or use `flex-1`
- `autoSaveId` uses localStorage key prefix `react-resizable-panels` — won't conflict with existing oa_ keys
- safari14: fully supported
- Tailwind 4: no class-name issues, use arbitrary values `w-[4px]` for handle width

### Alternative
`allotment` — similar API, slightly less maintained. react-resizable-panels is preferred (bvaughn/Brian Vaughn author).

---

## 4. `cmdk` — Command Palette

### Install
```bash
npm install cmdk
```

### UIStore additions needed
```tsx
// src/stores/uiStore.ts — add:
commandPaletteOpen: boolean;
setCommandPaletteOpen: (open: boolean) => void;
```

### Full command palette component
```tsx
// src/components/CommandPalette.tsx
import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAgentStore } from '../stores/agentStore';

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const agents = useAgentStore((s) => s.agents);
  const [search, setSearch] = useState('');

  // Close on Escape (cmdk handles this internally too)
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[20vh] ${open ? '' : 'hidden'}`}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[560px] bg-[var(--oa-surface)] border border-[var(--oa-border)] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={true}>
          <Command.Input
            placeholder="Type a command or search..."
            value={search}
            onValueChange={setSearch}
            className="w-full px-4 py-3 bg-transparent text-[var(--oa-text)] outline-none border-b border-[var(--oa-border)] text-sm placeholder:text-[var(--oa-text-muted)]"
          />
          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[var(--oa-text-muted)]">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-xs text-[var(--oa-text-muted)] px-2 py-1">
              {['dashboard', 'builder', 'templates', 'context', 'teams', 'settings'].map((tab) => (
                <Command.Item
                  key={tab}
                  value={tab}
                  onSelect={() => {
                    useUIStore.getState().setActiveMainTab(tab as any);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm text-[var(--oa-text)] aria-selected:bg-[var(--oa-accent)]/20"
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="my-1 border-t border-[var(--oa-border)]" />

            <Command.Group heading="Running Agents">
              {agents.filter((a) => a.status === 'running').map((agent) => (
                <Command.Item
                  key={agent.name}
                  value={`agent-${agent.name}`}
                  onSelect={() => {
                    // Navigate to agent detail
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm text-[var(--oa-text)] aria-selected:bg-[var(--oa-accent)]/20"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  {agent.name}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
```

### App.tsx integration
```tsx
import { CommandPalette } from './components/CommandPalette';

export default function App() {
  return (
    <div className="flex h-screen bg-oa-bg text-oa-text font-sans overflow-hidden">
      {/* ... existing content ... */}
      <CommandPalette />
    </div>
  );
}
```

### Gotchas with Vite/React 19/Tailwind 4
- **No default styles** — cmdk ships zero CSS; you must style everything (code above is complete)
- `aria-selected` attribute is used for highlighting — use `aria-selected:bg-...` Tailwind variant
- React 19: works fine, no known issues
- cmdk v1.x changed API from v0.x — use `Command.Input`, `Command.List`, `Command.Item` (not `CommandInput` etc.)
- Tailwind 4: `aria-selected:` variant works out of the box (no plugin needed)
- Do NOT wrap in `@radix-ui/react-dialog` — cmdk has its own focus management; double-wrapping breaks keyboard nav

### Alternative
`kbar` — more feature-rich (action registry pattern), but heavier. cmdk is simpler and more composable.

---

## 5. `@xterm/xterm` + `@xterm/addon-fit` — Browser Terminal

### Install
```bash
npm install @xterm/xterm @xterm/addon-fit
```

### CSS import (required — Vite handles this)
```tsx
// src/main.tsx or the terminal component file
import '@xterm/xterm/css/xterm.css';
```

### Terminal component
```tsx
// src/components/terminal/TerminalPanel.tsx
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface Props {
  agentName: string;
  output: string[]; // lines from agent store
}

export function TerminalPanel({ agentName, output }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastLineRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#0d1117',      // oa-bg equivalent
        foreground: '#e6edf3',
        cursor: '#f97316',           // oa-accent orange
        selectionBackground: '#264f78',
      },
      fontFamily: '"JetBrains Mono", "Cascadia Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: false,
      disableStdin: true,            // read-only output display
      convertEol: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Resize observer
    const ro = new ResizeObserver(() => fitAddon.fit());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
    };
  }, []);

  // Append new lines
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    const newLines = output.slice(lastLineRef.current);
    newLines.forEach((line) => term.writeln(line));
    lastLineRef.current = output.length;
  }, [output]);

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      <div className="flex items-center px-3 py-1.5 border-b border-[var(--oa-border)] text-xs text-[var(--oa-text-muted)]">
        <span className="w-2 h-2 rounded-full bg-green-400 mr-2" />
        {agentName}
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden p-2" />
    </div>
  );
}
```

### Tauri-specific: reading agent output
```tsx
// In Tauri context, stream agent output via Tauri event system
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  const unlisten = listen<string>(`agent-output-${agentName}`, (event) => {
    termRef.current?.writeln(event.payload);
  });
  return () => { unlisten.then((fn) => fn()); };
}, [agentName]);
```

### Gotchas with Vite/React 19/Tailwind 4
- **CSS import is mandatory** — without `@xterm/xterm/css/xterm.css` the terminal renders blank
- **Container must have explicit dimensions** — `height: 100%` or fixed px; `h-full` works if parent has height
- **`fitAddon.fit()` must fire after the terminal is visible** — use ResizeObserver (shown above), NOT setTimeout
- **safari14 target**: xterm uses `TextDecoder` which is available in safari14; OK
- **React Strict Mode**: double `useEffect` call disposes and re-creates terminal — this is fine with the cleanup
- **Tailwind 4 purge**: xterm CSS is imported as a file, not Tailwind classes — no purge issues
- **`@xterm/xterm` vs `xterm`**: The `@xterm/` scoped packages are the v5+ packages (rebranded). Do NOT mix with the old `xterm` package (v4) — they are incompatible

### Alternative
`xterm` (v4, unscoped) — older but more Stack Overflow answers. If safari14 compatibility is critical, test xterm v5 first. Alternative: `@codemirror/view` with terminal styling (more complex, but richer editor features).

---

## Summary: Integration Checklist

```
[ ] 1. npm install sonner
       → Add <Toaster /> to App.tsx root
       → Replace alert()/console.error() calls with toast.*()

[ ] 2. npm install react-hotkeys-hook
       → Create src/hooks/useGlobalHotkeys.ts
       → Call useGlobalHotkeys() in App.tsx

[ ] 3. npm install react-resizable-panels
       → Wrap dashboard main area in <PanelGroup>
       → Add autoSaveId for persistence

[ ] 4. npm install cmdk
       → Add commandPaletteOpen to uiStore
       → Add <CommandPalette /> to App.tsx
       → Wire Ctrl+K in useGlobalHotkeys

[ ] 5. npm install @xterm/xterm @xterm/addon-fit
       → Import @xterm/xterm/css/xterm.css in main.tsx
       → Create TerminalPanel component
       → Add to resizable panel layout (step 3)
```
