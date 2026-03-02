# test-workspace

## VS Code Bridge (Open-Agents VS Code Bridge)

Er draait een HTTP bridge op `http://localhost:7483` waarmee je VS Code volledig extern kunt besturen.
MCP tools zijn beschikbaar als de bridge draait (start met F5 of het "Open-Agents VS Code Bridge: Start Bridge" command).

### Quick Reference (curl)

```bash
# Health check
curl http://localhost:7483/health

# Actieve editor info
curl http://localhost:7483/active-editor

# Open bestanden
curl http://localhost:7483/open-files

# Bestand openen op regel 42
curl -X POST http://localhost:7483/open-file -H "Content-Type: application/json" -d '{"path":"/pad/naar/bestand.ts","line":42}'

# Tekst lezen (regels 10-20)
curl -X POST http://localhost:7483/get-text -H "Content-Type: application/json" -d '{"startLine":10,"endLine":20}'

# VS Code command uitvoeren
curl -X POST http://localhost:7483/execute-command -H "Content-Type: application/json" -d '{"command":"editor.action.formatDocument"}'

# Tekst naar terminal sturen
curl -X POST http://localhost:7483/send-text -H "Content-Type: application/json" -d '{"text":"npm test"}'
```

### Alle Endpoints

**GET endpoints (geen body nodig):**
- `/health` - Bridge status
- `/workspace-state` - Workspace naam en folders
- `/window-state` - Window focus status
- `/active-editor` - Actief bestand, cursor, selectie
- `/open-files` - Alle open tabs
- `/terminals` - Open terminals
- `/extensions` - Geinstalleerde extensies
- `/debug-state` - Debug sessies
- `/scm-state` - Git status
- `/tasks` - Beschikbare tasks

**POST endpoints (JSON body):**
- `/open-file` - `{path, line?, character?, preview?}`
- `/close-editor` - `{path?, all?}`
- `/get-text` - `{path?, startLine?, endLine?}`
- `/insert-text` - `{path?, line, text}`
- `/replace-text` - `{path?, startLine, endLine, text}`
- `/set-cursor` - `{line, character?}`
- `/reveal-line` - `{line}`
- `/save-file` - `{path?}`
- `/file-exists` - `{path}`
- `/read-file` - `{path, encoding?}`
- `/write-file` - `{path, content, createDirectories?}`
- `/delete-file` - `{path, recursive?, useTrash?}`
- `/rename-file` - `{oldPath, newPath, overwrite?}`
- `/create-directory` - `{path}`
- `/list-directory` - `{path, recursive?}`
- `/create-terminal` - `{name?, cwd?, show?}`
- `/send-text` - `{text, terminalId?, addNewLine?}`
- `/kill-terminal` - `{terminalId?}`
- `/execute-command` - `{command, args?}`
- `/start-debug` - `{configName?, workspaceFolder?}`
- `/stop-debug` - `{}`
- `/run-task` - `{label}`

Regelnummers zijn 1-based. Zonder `path` parameter werken editor-endpoints op de actieve editor.

### Orchestrator Endpoints

Spawn en beheer geïsoleerde Claude Code agents:

**POST endpoints:**
- `/orchestrator/spawn-agent` - `{agentId, sandboxDir, task, context?, claudeArgs?}` — Start een agent in eigen sandbox
- `/orchestrator/agent-status` - `{agentId}` — Check status (spawning/working/done/error)
- `/orchestrator/agent-result` - `{agentId}` — Lees result.md van agent
- `/orchestrator/kill-agent` - `{agentId, cleanup?}` — Stop agent, optioneel cleanup
- **GET** `/orchestrator/agents` — Lijst alle actieve agents

**Agent sandbox structuur:**
```
sandboxDir/
  task.md       ← jouw opdracht
  context.md    ← extra context (optioneel)
  CLAUDE.md     ← agent instructies (automatisch)
  status.json   ← { "status": "working"|"done"|"error", "summary": "..." }
  result.md     ← agent's antwoord
```

**Voorbeeld: spawn een agent**
```bash
curl -X POST http://localhost:7483/orchestrator/spawn-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"researcher","sandboxDir":"C:/tmp/agents/researcher","task":"Zoek de top 3 performance bottlenecks in het project"}'
```

**Voorbeeld: check resultaat**
```bash
curl -X POST http://localhost:7483/orchestrator/agent-result \
  -H "Content-Type: application/json" \
  -d '{"agentId":"researcher"}'
```
