# Sprint 20 T20.2 — xterm.js Terminal Emulator

## Summary
Replaced the `<pre>` output display in `TerminalPanel.tsx` with a real xterm.js terminal emulator.

## Changes

### New file: `src/components/dashboard/XtermTerminal.tsx`
- Full xterm.js terminal with Impertio brand theme
- FitAddon for automatic resize via ResizeObserver
- WebLinksAddon for clickable links in output
- Props: `{ output: string; agentName: string; isRunning: boolean }`
- On `output` change: `terminal.reset()` + `terminal.write(output)` for full ANSI re-render
- On `agentName` change: `terminal.clear()` to start fresh
- Proper cleanup: `terminal.dispose()` in useEffect return

### Updated: `src/components/dashboard/TerminalPanel.tsx`
- Replaced `<pre>` with `<XtermTerminal>` component
- Removed `outputRef` (no longer needed — xterm handles scrolling)
- Removed auto-scroll `useEffect` (xterm handles this)
- Fixed SSE cleanup: `streamAgentOutput` returns `SSEStreamHandle`, now calling `handle.close()` properly

### Updated: `src/components/dashboard/AgentPanel.tsx`
- Fixed same SSE cleanup bug: `handle.close()` instead of returning raw `SSEStreamHandle`

## Packages installed
- `@xterm/xterm` — core terminal emulator
- `@xterm/addon-fit` — auto-resize to container
- `@xterm/addon-web-links` — clickable URL detection

## TypeScript
`npx tsc --noEmit` — 0 errors after changes.
