# Migratie: Open-VSCode-Controller → Open-Agents

> **Instructies voor Claude Code instance in Open-Agents workspace**
> **Bron workspace**: `C:\Users\Freek Heijting\Documents\GitHub\Open-VSCode-Controller`
> **Doel workspace**: `C:\Users\Freek Heijting\Documents\GitHub\Open-Agents`

---

## Wat is Open-VSCode-Controller?

Een VS Code extensie die een **HTTP bridge** draait op port 7483, waarmee je VS Code volledig extern kunt besturen. Het biedt:

1. **HTTP Bridge** (35+ endpoints) — bestanden openen/lezen/schrijven, terminals aansturen, commands uitvoeren, git status, debug sessions, etc.
2. **WebSocket events** — real-time notificaties over editor changes, file operations, terminal events
3. **MCP Server** (25 tools) — zodat Claude Code instances de bridge kunnen gebruiken als MCP tools
4. **Agent Orchestrator** — spawnt meerdere `claude` CLI sessies in VS Code terminals, elk in een eigen sandbox directory met task.md/result.md/status.json protocol
5. **CLI tool** (`vscode-ctrl`) — bootstrap workspaces met `vscode-ctrl init`

### Waarom integreren in Open-Agents?

Open-VSCode-Controller is geen los product — het is de **execution backend** voor Open-Agents. De bridge geeft agents toegang tot:
- Het echte filesystem van de gebruiker (via VS Code)
- Geauthenticeerde Claude Code sessies (via Claude subscription, geen API key nodig)
- Live terminal controle (agents zichtbaar voor de gebruiker)

De architectuur:
```
Open-Agents Frontend (:5173) → Open-Agents Backend (:3001) → VS Code Bridge (:7483) → Claude CLI terminals
```

---

## Wat er al gedaan is (in beide workspaces)

### In Open-VSCode-Controller (broncode om te migreren):

De complete codebase staat in `C:\Users\Freek Heijting\Documents\GitHub\Open-VSCode-Controller`:

```
packages/
  shared/           → types, constants (BRIDGE_PORT=7483, event types, agent types)
  vscode-extension/ → de VS Code extensie met:
    src/
      extension.ts        → activate/deactivate, auto-start bridge
      httpServer.ts       → HTTP + WebSocket server op port 7483
      statusBar.ts        → VS Code status bar indicator
      handlers/
        editor.ts         → open/close/read/write editor operations
        files.ts          → filesystem operations (read/write/delete/rename/list)
        terminal.ts       → create/send/kill terminals
        window.ts         → workspace state, window state
        debug.ts          → debug sessions
        extensions.ts     → installed extensions
        scm.ts            → git/scm status
        tasks.ts          → VS Code tasks
        orchestrator.ts   → agent spawning, status, result, kill, list
      mcp/
        server.ts         → MCP server (stdio transport)
        tools.ts          → 25 MCP tool registrations
        handlers.ts       → thin HTTP proxy to bridge
  cli/                → vscode-ctrl CLI tool
    src/
      index.ts            → CLI entry, health/status/start/stop commands
      commands/init.ts    → bootstrap workspace with .mcp.json + CLAUDE.md
```

### In Open-Agents (al gewijzigd):

1. **`packages/shared/src/types.ts`** — `"cli"` toegevoegd aan `ModelProvider`, `"cli/claude"` aan `ModelId`
2. **`packages/backend/src/runtimes/claude-cli.ts`** — NIEUW: `ClaudeCLIRuntime` adapter die agents spawnt via de bridge
3. **`packages/backend/src/server.ts`** — CLI runtime registratie + bridge health check
4. **`packages/frontend/src/services/bridgeService.ts`** — NIEUW: health check, WebSocket events, agent listing
5. **`packages/frontend/src/components/ConnectionIndicator.tsx`** — bridge status indicator (blauw bolletje)

---

## Migratieplan

### Stap 1: Nieuw package `packages/vscode-bridge`

Kopieer de VS Code extensie uit Open-VSCode-Controller naar Open-Agents als nieuw package:

```bash
# Bron
cp -r "C:/Users/Freek Heijting/Documents/GitHub/Open-VSCode-Controller/packages/vscode-extension" \
      "C:/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/vscode-bridge"
```

**Aanpassingen na kopiëren:**
- `package.json`: naam wijzigen naar `@open-agents/vscode-bridge`
- Dependencies updaten: gebruik `@open-agents/shared` in plaats van `@vscode-ctrl/shared`
- De shared types uit Open-VSCode-Controller's shared package integreren in Open-Agents's `@open-agents/shared`

### Stap 2: Shared types mergen

De bridge-specifieke types uit `Open-VSCode-Controller/packages/shared/src/types.ts` moeten naar `Open-Agents/packages/shared/src/types.ts`:

Types om te mergen:
- `AgentStatus` = `"spawning" | "working" | "done" | "error"`
- `SpawnAgentRequest` = `{ agentId, sandboxDir, task, context?, claudeArgs? }`
- `SpawnAgentResponse` = `{ agentId, sandboxDir, terminalId }`
- `AgentInfo` = `{ agentId, sandboxDir, terminalId, status, summary?, spawnedAt }`
- `AgentStatusResponse`, `AgentResultResponse`, `ListAgentsResponse`
- `VSCodeEvent` union type (25+ event types voor editor, files, terminal, agent lifecycle)

En constants:
- `BRIDGE_PORT = 7483`
- `BRIDGE_HOST = "localhost"`
- `BRIDGE_BASE_URL = "http://localhost:7483"`
- `BRIDGE_WS_URL = "ws://localhost:7483"`

### Stap 3: pnpm-workspace.yaml updaten

```yaml
packages:
  - packages/*
```

Verifieer dat `packages/vscode-bridge` wordt opgepikt.

### Stap 4: Launch configuratie

In Open-Agents root, maak `.vscode/launch.json` aan (of update) met:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Bridge (Extension Host)",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}/packages/vscode-bridge",
        "--disable-extension", "3bm-engineering.vscode-mcp-bridge",
        "--disable-extension", "yutengjing.vscode-mcp-bridge",
        "${workspaceFolder}/test-workspace"
      ],
      "outFiles": ["${workspaceFolder}/packages/vscode-bridge/dist/**/*.js"],
      "preLaunchTask": "npm: build:bridge"
    }
  ]
}
```

### Stap 5: test-workspace migreren

Kopieer `Open-VSCode-Controller/test-workspace` naar `Open-Agents/test-workspace` (of integreer in bestaande test setup). Dit bevat:
- `.mcp.json` — MCP server configuratie (pad updaten naar nieuwe locatie)
- `CLAUDE.md` — bridge endpoint documentatie
- `.vscode/settings.json` — headless UI settings

### Stap 6: CLI integreren

De `vscode-ctrl` CLI kan:
- Worden opgenomen als script in de root `package.json`
- Of als apart package `packages/cli` (kopieer van Open-VSCode-Controller)

### Stap 7: MASTERPLAN.md updaten

Voeg een nieuwe sprint toe aan MASTERPLAN.md:

```markdown
## Sprint 11: VS Code Bridge & Terminal Agents

**Doel**: Agents uitvoeren als echte Claude Code CLI sessies via VS Code bridge.
Geauthenticeerd via Claude subscription (geen API key nodig).

**Bron**: Gemigreerd van Open-VSCode-Controller repository.

### Wat het toevoegt aan Open-Agents:
1. **ClaudeCLIRuntime** — nieuwe runtime adapter naast ClaudeSDKRuntime
   - SDK runtime = API calls, geen filesystem access
   - CLI runtime = echte Claude Code sessies met Read/Write/Edit/Bash tools
2. **VS Code Bridge** (:7483) — HTTP + WebSocket control over VS Code
3. **Agent Orchestrator** — spawn meerdere claude CLI terminals met sandbox isolatie
4. **MCP Server** — 25 tools voor external Claude Code instances

### Architectuur:
- VS Code Extension Host = headless backend (F5 om te starten)
- Open-Agents backend detecteert bridge en registreert cli/claude runtime
- Agents met model "cli/claude" worden uitgevoerd via bridge terminals
- Frontend toont bridge status (blauw indicator) + real-time agent events via WebSocket
```

---

## Technische Details

### Agent Orchestrator Protocol

Elke agent krijgt een sandbox directory:
```
C:/tmp/open-agents/{agentId}/
  task.md         ← opdracht (geschreven door orchestrator)
  context.md      ← extra context (optioneel)
  CLAUDE.md       ← agent instructies (automatisch gegenereerd)
  .claude/
    settings.json ← permissions: allow Read, Write, Edit, Bash(*)
  status.json     ← { "status": "working"|"done"|"error", "summary": "..." }
  result.md       ← agent's antwoord
```

De agent wordt gestart met:
```bash
claude "Read task.md and execute the task. Write your result to result.md. Update status.json when done." --allowedTools Edit,Write,Read,Bash
```

### Bridge Endpoints (referentie)

**GET endpoints:**
- `/health` — bridge status + uptime
- `/workspace-state` — workspace naam en folders
- `/active-editor` — actief bestand, cursor, selectie
- `/open-files` — alle open tabs
- `/terminals` — open terminals
- `/extensions` — geinstalleerde extensies
- `/debug-state` — debug sessies
- `/scm-state` — git status
- `/tasks` — beschikbare tasks
- `/orchestrator/agents` — alle actieve agents

**POST endpoints:**
- `/open-file` — `{path, line?, character?}`
- `/get-text` — `{path?, startLine?, endLine?}`
- `/insert-text` — `{path?, line, text}`
- `/replace-text` — `{path?, startLine, endLine, text}`
- `/execute-command` — `{command, args?}`
- `/create-terminal` — `{name?, cwd?, show?}`
- `/send-text` — `{text, terminalId?}`
- `/read-file` — `{path}`
- `/write-file` — `{path, content, createDirectories?}`
- `/list-directory` — `{path, recursive?}`
- `/orchestrator/spawn-agent` — `{agentId, sandboxDir, task, context?, claudeArgs?}`
- `/orchestrator/agent-status` — `{agentId}`
- `/orchestrator/agent-result` — `{agentId}`
- `/orchestrator/kill-agent` — `{agentId, cleanup?}`

### Bekende issues / requirements

1. **Claude CLI auth**: De eerste keer dat `claude` wordt gestart in een terminal moet de gebruiker autoriseren via browser (OAuth). Daarna is het permanent opgeslagen in `~/.claude/`.
2. **Theme selectie**: Claude CLI toont een theme picker bij eerste run. Dit is een eenmalige interactie per machine.
3. **Permissions**: `.claude/settings.json` in de sandbox geeft autonomous permissions. `--allowedTools` flag als extra veiligheidslaag.
4. **Terminal als editor tab**: Agents openen als editor tabs (niet in bottom panel) via `vscode.TerminalLocation.Editor`.
5. **Headless EH**: De Extension Host is puur backend — activity bar, menu bar, layout controls zijn verborgen.

---

## Verificatie na migratie

1. `pnpm typecheck` — alle packages slagen (inclusief vscode-bridge)
2. F5 in Open-Agents → EH start → bridge op :7483 → `/health` returnt OK
3. `pnpm dev` → backend detecteert bridge → log: "VS Code bridge connected"
4. Frontend toont blauw "Bridge" bolletje
5. Canvas: agent met `cli/claude` → execute → terminal opent in EH → result verschijnt
6. 10 agents tegelijk spawnen → alle 10 terminals zichtbaar in EH