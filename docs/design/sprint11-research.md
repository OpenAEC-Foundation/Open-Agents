# Sprint 11 Research: VS Code Bridge Implementation Plan

**Date**: 2026-03-08
**Author**: sprint11-researcher (automated)
**Sprint**: 11 — VS Code Bridge & Terminal Agents
**Status**: Research complete → ready for implementation

---

## 1. What the VS Code Extension Needs from oa-cli

The VS Code extension is the UI shell. oa-cli is the execution engine. The extension needs:

### Commands
| Action | oa-cli equivalent | HTTP equivalent |
|--------|-------------------|-----------------|
| Start session | `oa start` | `POST /api/session/start` |
| Spawn agent | `oa run "<task>"` | `POST /api/agents` |
| Get status | `oa status` | `GET /api/agents` |
| Kill agent | `oa kill <name>` | `POST /api/agents/<name>/kill` |
| Get output | `oa collect <name>` | `GET /api/agents/<name>/output` |
| Send message | `oa send <to> "<msg>"` | `POST /api/messages` |
| Broadcast | `oa broadcast "<msg>"` | `POST /api/broadcast` |
| List templates | `oa templates` | `GET /api/templates` |
| Clean workspaces | `oa clean` | `POST /api/clean` |
| Check health | — | `GET /api/health` |

### Real-time Data
- Live agent output (streaming) during execution
- Agent status changes (running → done/failed)
- Unread message count updates

### Extension UI Components
- Status bar item: session state + running agent count
- TreeView panel: agent list with status icons
- Webview panel: embedded Open Agents SPA (already served at `http://localhost:5174`)
- Command palette: all `oa` commands as VS Code commands
- Terminal integration: `oa attach <name>` for live tmux output

---

## 2. Communication Channel Analysis

### Options Evaluated

#### A) stdio (direct subprocess)
- Extension spawns `oa` CLI commands as child processes via `child_process.spawn()`
- Output captured via stdout pipe
- **Pro**: No server needed, no port conflicts
- **Con**: No streaming state, WSL path complexity for spawning, no persistent connection, difficult to multiplex multiple agents
- **Verdict**: Suitable only for one-off commands, not for real-time monitoring

#### B) REST (polling)
- Extension polls `GET /api/agents` every 2s for status
- POST commands to spawn/kill agents
- **Pro**: Simple, stateless, already implemented in `bridge.py`
- **Con**: Polling adds latency; not suited for live output streaming
- **Verdict**: Good for commands; insufficient for streaming

#### C) SSE (Server-Sent Events)
- Extension uses `fetch()` + `ReadableStream` or `EventSource` on `/api/agents/<name>/stream`
- Already implemented in `bridge.py` at lines 168-201
- **Pro**: Unidirectional server push, HTTP-based, works through localhost, reconnects automatically
- **Con**: One stream per agent (N connections for N agents), no bidirectional data
- **Verdict**: Excellent for live output per agent

#### D) WebSocket
- Full-duplex over single connection
- **Pro**: Bidirectional, multiplexed, lower overhead than polling
- **Con**: Requires adding WebSocket server to bridge.py, adds complexity
- **Verdict**: Overkill for current use case; add only if SSE proves insufficient

### Recommendation: REST + SSE (hybrid)

```
VS Code Extension
    │
    ├── REST (HTTP) ──────────→ bridge.py :5174
    │    ├── GET /api/agents      (poll every 2s for status list)
    │    ├── POST /api/agents     (spawn agent)
    │    ├── POST /api/.../kill   (stop agent)
    │    └── GET /api/health      (bridge alive check)
    │
    └── SSE (streaming) ──────→ bridge.py :5174
         └── GET /api/agents/<name>/stream  (live output per agent)
```

**Rationale**:
- REST + SSE covers 100% of the needed functionality
- Both are already implemented in `bridge.py` — zero new server code needed
- VS Code extension is TypeScript/Node.js: `fetch()` and `EventSource` both work natively
- WSL2 on Windows: `localhost:5174` is automatically forwarded → no special handling needed

---

## 3. Existing bridge.py: What Exists, What's Missing

### What Exists (already usable)
```
bridge.py — Flask server on :5174
├── GET  /api/agents              → list all agents (with 1s cache)
├── GET  /api/agents/<name>       → single agent detail
├── GET  /api/agents/<name>/output → raw output (running or finished)
├── POST /api/agents              → spawn agent (task, name, model, parent)
├── POST /api/agents/<name>/kill  → stop agent
├── POST /api/agents/<name>/pause → pause tmux pane
├── POST /api/agents/<name>/resume → resume tmux pane
├── GET  /api/agents/<name>/stream → SSE live output ✓
├── GET  /api/health              → {"status": "ok"}
├── GET  /api/session/status      → tmux session exists?
├── POST /api/session/start       → start tmux session
├── POST /api/messages            → send message to agent
├── GET  /api/messages/<name>     → get inbox
├── POST /api/broadcast           → broadcast to all agents
├── GET  /api/templates           → list agent templates
├── POST /api/clean               → clean finished workspaces
└── GET  /                        → serves React SPA (web/dist)
```

### What's Missing for VS Code Integration

1. **Bridge auto-start**: No mechanism for VS Code to start `oa web` automatically.
   - Fix: Extension uses `child_process.spawn('oa', ['web'])` on activation if `/api/health` fails.

2. **Agent events push**: `/api/agents` requires polling. For real-time status changes (not output), there's no push mechanism.
   - Fix: Add `GET /api/events` SSE endpoint that broadcasts agent status changes.
   - Alternatively: poll every 2s (acceptable for status list, bridge already caches for 1s).

3. **No CORS for VS Code webview**: The webview runs in a sandboxed iframe. `localhost` fetch works, but `vscode-webview://` origin may be blocked.
   - Fix: `CORS(app)` is already applied globally in bridge.py — should be permissive enough.
   - Verify: `Access-Control-Allow-Origin: *` header is set.

4. **No WebSocket** (not a blocker, SSE is sufficient).

5. **No authentication**: By design (localhost only, D-012). Acceptable.

---

## 4. VS Code Extension Architecture

### Extension Structure

```
packages/vscode-bridge/         (from Open-VSCode-Controller, task 11.1)
├── package.json                (contributes commands, views, activationEvents)
├── src/
│   ├── extension.ts            (activate/deactivate entry point)
│   ├── bridgeClient.ts         (REST + SSE client for :5174)
│   ├── bridgeManager.ts        (start/stop oa web process)
│   ├── agentTreeProvider.ts    (TreeDataProvider for sidebar)
│   ├── agentStreamPanel.ts     (Webview panel for live output)
│   ├── commands.ts             (VS Code command registrations)
│   └── statusBar.ts            (session + agent count status bar)
├── webview/                    (optional: embedded SPA, or link to :5174)
└── .vscode/launch.json         (F5 → Extension Development Host, task 11.2)
```

### Activation Events
```json
"activationEvents": [
  "onStartupFinished",
  "onCommand:openAgents.runAgent",
  "onCommand:openAgents.openDashboard"
]
```

### Key VS Code Commands
```typescript
// commands.ts
vscode.commands.registerCommand('openAgents.startSession', ...)
vscode.commands.registerCommand('openAgents.runAgent', ...)     // input prompt
vscode.commands.registerCommand('openAgents.killAgent', ...)    // quickpick
vscode.commands.registerCommand('openAgents.openDashboard', ...) // opens :5174 in webview
vscode.commands.registerCommand('openAgents.openWeb', ...)      // opens :5174 in browser
```

### BridgeClient — REST + SSE
```typescript
class BridgeClient {
  baseUrl = 'http://localhost:5174'

  // REST
  async health(): Promise<boolean>
  async listAgents(): Promise<Agent[]>
  async spawnAgent(task: string, name?: string, model?: string): Promise<Agent>
  async killAgent(name: string): Promise<void>

  // SSE streaming
  streamAgent(name: string, onData: (chunk: OutputChunk) => void): () => void {
    // Uses fetch() + ReadableStream (works in VS Code extension Node.js runtime)
    // Returns cleanup function
  }
}
```

### BridgeManager — Process Lifecycle
```typescript
class BridgeManager {
  private proc: ChildProcess | null = null

  async ensureRunning(): Promise<void> {
    if (await this.client.health()) return
    // Spawn: oa web --port 5174
    this.proc = spawn('oa', ['web', '--port', '5174'], {
      shell: true,
      detached: false,
      stdio: 'pipe',  // capture stderr for error reporting
    })
    await this.waitForHealth(5000)
  }

  dispose() {
    this.proc?.kill()
  }
}
```

### Webview Panel — Embedded Dashboard
The simplest approach: open `http://localhost:5174` in a VS Code webview panel.
```typescript
panel.webview.html = `
  <html><body style="margin:0;padding:0;overflow:hidden">
    <iframe src="http://localhost:5174" style="width:100%;height:100vh;border:none"/>
  </body></html>
`
```
Note: VS Code webview security policy may block iframe to localhost.
Alternative: open in external browser with `vscode.env.openExternal(Uri.parse('http://localhost:5174'))`.

---

## 5. Implementation Order

### Phase 1: Foundation (Tasks 11.1 + 11.2) — Do First
1. **Copy** `Open-VSCode-Controller/packages/vscode-extension` → `packages/vscode-bridge`
2. **Update** `package.json`: rename to `@open-agents/vscode-bridge`
3. **Merge** shared bridge types into `@open-agents/shared` (BridgeAgent, AgentStatus, BridgeEvent)
4. **Create** `.vscode/launch.json` entry for Extension Development Host
5. **Create** `test-workspace/` with headless VS Code settings

### Phase 2: BridgeClient (Core Integration) — Next
6. Implement `BridgeClient.ts` (REST calls to `:5174`)
7. Implement `BridgeManager.ts` (spawn `oa web`, health-check loop)
8. Wire into `extension.ts` activate/deactivate

### Phase 3: UI (Sidebar + Commands) — Parallel
9. Implement `AgentTreeProvider` (sidebar panel showing agents)
10. Register VS Code commands (run, kill, status)
11. Add status bar item (session state + running count)

### Phase 4: Live Streaming
12. Implement SSE consumer via `fetch()` + `ReadableStream`
13. Route output to Output Channel or Webview panel

### Phase 5: E2E Verification (Task 11.7)
14. F5 → Extension Host starts
15. Bridge auto-starts (`oa web`)
16. Run agent via command palette
17. Output appears in VS Code panel

### Phase 6: CLI Tool (Task 11.6)
18. Integrate `vscode-ctrl` CLI as `oa bridge` subcommand or standalone script
19. `oa bridge init` for workspace bootstrap

---

## 6. Risks: WSL/Windows Path Differences

### Risk 1: oa not in PATH when spawned from VS Code
**Problem**: VS Code on Windows spawns processes in Windows context. `oa` is installed in WSL.
**Mitigation**:
- If VS Code runs in WSL (Remote-WSL extension): `oa` is in PATH — no issue.
- If VS Code runs natively on Windows: must use `wsl.exe oa web` as spawn command.
- Detection: check `process.platform === 'win32'` in extension.

```typescript
const cmd = process.platform === 'win32' ? 'wsl' : 'oa'
const args = process.platform === 'win32' ? ['oa', 'web'] : ['web']
spawn(cmd, args, { shell: true })
```

### Risk 2: localhost port forwarding WSL → Windows
**Problem**: Bridge runs on WSL `localhost:5174`. Windows VS Code needs to reach it.
**Mitigation**: WSL2 automatically forwards TCP ports. `http://localhost:5174` works from Windows without any configuration. Verified in WSL2 since Windows 10 2004.

### Risk 3: File paths in agent tasks
**Problem**: Extension sends paths like `C:\Users\...` but agents run in WSL expecting `/mnt/c/...`.
**Mitigation**:
- Convert paths in `BridgeClient` before sending: replace `C:\` with `/mnt/c/`, backslashes with `/`
- Or: always use WSL paths in the extension (workspace root via `vscode.workspace.rootPath`)

```typescript
function toWslPath(windowsPath: string): string {
  return windowsPath.replace(/^([A-Z]):\\/, (_, d) => `/mnt/${d.toLowerCase()}/`)
                    .replace(/\\/g, '/')
}
```

### Risk 4: tmux session not running when extension activates
**Problem**: Bridge needs an active `oa` tmux session. Extension may activate before session exists.
**Mitigation**: `BridgeManager.ensureRunning()` calls `POST /api/session/start` after health-check succeeds. The bridge handles this gracefully (auto-starts session on first agent spawn).

### Risk 5: Port 5174 already in use
**Problem**: Another process occupies `:5174`.
**Mitigation**: `bridge.py` already handles this via `_kill_port()` (lines 603-625) using `lsof`. Alternatively, make port configurable in extension settings.

---

## 7. Summary Table: What to Build

| Component | File | Status |
|-----------|------|--------|
| Bridge REST server | `bridge.py` | Done ✓ |
| SSE streaming | `bridge.py:/api/agents/<n>/stream` | Done ✓ |
| Package structure | `packages/vscode-bridge/` | Task 11.1 |
| Launch config | `.vscode/launch.json` | Task 11.2 |
| BridgeClient (TS) | `src/bridgeClient.ts` | TODO |
| BridgeManager (TS) | `src/bridgeManager.ts` | TODO |
| Agent tree view | `src/agentTreeProvider.ts` | TODO |
| VS Code commands | `src/commands.ts` | TODO |
| Status bar | `src/statusBar.ts` | TODO |
| SSE consumer | `src/agentStreamPanel.ts` | TODO |
| WSL path util | `src/utils/wslPaths.ts` | TODO |
| CLI tool | `vscode-ctrl` integration | Task 11.6 |
| E2E test flow | F5 → agent → output | Task 11.7 |

**Bottom line**: The bridge server (Python/Flask) is complete and fully capable. The remaining work is entirely in the TypeScript VS Code extension layer — connecting to what already exists.
