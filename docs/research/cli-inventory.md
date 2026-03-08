# oa-cli Inventory — Commands, API Endpoints & Data Model

> Generated: 2026-03-08 | Input: cli.py, bridge.py, spawner.py, teams.py, pipeline.py, checkpoint.py, guardians.py, messaging.py

---

## 1. CLI Commands

### Core Commands

| Command | Flags | Beschrijving |
|---------|-------|-------------|
| `oa setup` | — | Voert preflight checks uit en initialiseert ~/.oa/ met config.json |
| `oa start` | `--chat/--no-chat` | Start de oa tmux-sessie met dashboard-window en optionele chat |
| `oa stop` | `--no-guardians` | Stopt de tmux-sessie en triggert session_end guardians |
| `oa status` | — | Toont status van alle agents in een rich tabel |
| `oa dashboard` | — | Interactief TUI-dashboard voor agent monitoring |
| `oa version` | — | Toont de CLI-versie |

### Agent Lifecycle

| Command | Flags | Beschrijving |
|---------|-------|-------------|
| `oa run <task>` | `--name`, `--model`, `--parent`, `--workspace`, `--direct`, `--template`, `--context-skills`, `--guardians` | Spawnt een agent met taak in een nieuw tmux-window |
| `oa attach <name>` | — | Koppelt aan het tmux-window van een draaiende agent |
| `oa watch <name>` | — | Streamt live output van een agent (polling, Ctrl-C om te stoppen) |
| `oa kill <name>` | — | Stopt een draaiende agent en sluit het tmux-window |
| `oa collect <name>` | — | Toont de output van een voltooide agent |
| `oa clean` | — | Ruimt workspaces op van alle afgeronde agents |
| `oa resume <name>` | — | Hervat een agent vanuit zijn laatste checkpoint |

### Orchestratie

| Command | Flags | Beschrijving |
|---------|-------|-------------|
| `oa pipeline <task>` | — | Voert multi-agent pipeline uit: planner → subtasks → combiner (blocking) |
| `oa delegate <task>` | `--model`, `--orchestrator-model`, `--name`, `--max-workers` | Spawnt orchestrator + workers automatisch (D-051) |
| `oa templates` | `--category` | Lijst alle beschikbare agent-templates uit agents/library/ |

### Web & Bridge

| Command | Flags | Beschrijving |
|---------|-------|-------------|
| `oa web` | `--port` (default 5174) | Start web UI (React SPA + lokale bridge server) |
| `oa vscode-bridge` | `--port` (default 5175) | Start lichtgewicht VS Code bridge server |

### Messaging

| Command | Flags | Beschrijving |
|---------|-------|-------------|
| `oa send <to> <message>` | `--from` (default "user") | Stuurt een direct bericht naar een agent |
| `oa inbox <name>` | `--unread`, `--mark-read` | Toont het berichteninbox van een agent |
| `oa broadcast <message>` | `--from` (default "user") | Broadcast bericht naar alle draaiende agents |
| `oa shutdown-request <name>` | `--from` | Stuurt een graceful shutdown-verzoek naar een agent |

### Guardians

| Command | Flags | Beschrijving |
|---------|-------|-------------|
| `oa guardians` | `--register`, `--trigger <event>` | Lijst, registreer of trigger guardian agents |

### Team Sub-commands (`oa team`)

| Command | Flags | Beschrijving |
|---------|-------|-------------|
| `oa team create <name>` | `--member` (herhaalbaar) | Maakt een nieuw agent-team aan |
| `oa team list` | — | Lijst alle teams |
| `oa team add-member <team> <agent>` | — | Voegt een agent toe aan een team |
| `oa team delete <name>` | — | Verwijdert een team |

### Task Sub-commands (`oa task`)

| Command | Flags | Beschrijving |
|---------|-------|-------------|
| `oa task create <team> <title>` | `--desc`, `--assign`, `--blocked-by` | Maakt een nieuwe taak aan voor een team |
| `oa task list <team>` | — | Lijst alle taken voor een team |
| `oa task claim <team> <task_id>` | `--agent` (verplicht) | Claimen van een taak met file-locking |
| `oa task done <team> <task_id>` | — | Markeert een taak als voltooid |
| `oa task complete <team> <task_id>` | — | Voltooit taak en deblokkeert afhankelijke taken |
| `oa task update <team> <task_id> <status>` | — | Updatet de status van een taak |

### Checkpoint Sub-commands (`oa checkpoint`)

| Command | Flags | Beschrijving |
|---------|-------|-------------|
| `oa checkpoint list` | — | Lijst alle onvoltooide checkpoints |
| `oa checkpoint show <name>` | — | Toont details van een checkpoint |

---

## 2. Bridge API Endpoints

### Agents

| Method | Path | Beschrijving |
|--------|------|-------------|
| GET | /api/agents | Lijst alle agents met vernieuwde statussen (1s cache) |
| GET | /api/agents/`<name>` | Haalt één agent op met details + output |
| POST | /api/agents | Spawnt een nieuwe agent (body: task, name, model, parent) |
| DELETE | /api/agents/`<name>` | Kill/verwijder agent |
| GET | /api/agents/`<name>`/output | Haalt live terminal output op (`?lines=N`) |
| GET | /api/agents/`<name>`/stream | SSE-stream van agent output (live, loopt tot done) |
| POST | /api/agents/`<name>`/kill | Kill een draaiende agent |
| POST | /api/agents/`<name>`/pause | Pauzeert agent via tmux pause-pane |
| POST | /api/agents/`<name>`/resume | Hervat gepauzeerde agent via tmux pause-pane -U |
| GET | /api/agents/`<name>`/messages | Haalt berichten op uit inbox (`?unread=true&limit=N`) |
| POST | /api/agents/`<name>`/messages | Stuurt bericht naar agent (body: from, content) |

### Session

| Method | Path | Beschrijving |
|--------|------|-------------|
| POST | /api/session/start | Start de tmux-sessie |
| GET | /api/session/status | Controleert of tmux-sessie bestaat |

### Guardians

| Method | Path | Beschrijving |
|--------|------|-------------|
| GET | /api/guardians | Lijst alle guardians met last-triggered timestamps |
| POST | /api/guardians/trigger | Triggert een specifieke guardian (body: event, guardian) |

### Messaging

| Method | Path | Beschrijving |
|--------|------|-------------|
| GET | /api/messages/`<name>` | Haalt inbox op voor agent (`?unread=true&limit=N`) |
| POST | /api/messages | Stuurt bericht (body: from, to, content) |
| POST | /api/messages/broadcast | Broadcast naar alle agents (body: from, content) |
| POST | /api/messages/`<name>`/read | Markeert berichten als gelezen |
| POST | /api/broadcast | Alias voor /api/messages/broadcast |

### Teams

| Method | Path | Beschrijving |
|--------|------|-------------|
| GET | /api/teams | Lijst alle teams |
| POST | /api/teams | Maakt team aan (body: name, members) |
| GET | /api/teams/`<name>` | Haalt team-config op |
| DELETE | /api/teams/`<name>` | Verwijdert een team |
| POST | /api/teams/`<name>`/members | Voegt lid toe aan team (body: agent) |

### Tasks

| Method | Path | Beschrijving |
|--------|------|-------------|
| GET | /api/tasks/`<team>` | Lijst taken voor een team |
| POST | /api/tasks/`<team>` | Maakt taak aan (body: title, description) |
| PUT | /api/tasks/`<team>`/`<task_id>` | Updatet taakstatus (body: status) |

### Templates

| Method | Path | Beschrijving |
|--------|------|-------------|
| GET | /api/templates | Lijst alle beschikbare agent-templates |
| GET | /api/templates/`<id>` | Laadt een specifiek template |

### Checkpoints

| Method | Path | Beschrijving |
|--------|------|-------------|
| GET | /api/checkpoints | Lijst onvoltooide checkpoints |
| POST | /api/resume/`<agent>` | Hervat agent vanuit checkpoint (geeft resume-prompt terug) |

### Utility

| Method | Path | Beschrijving |
|--------|------|-------------|
| GET | /api/health | Health check (returns `{"status": "ok"}`) |
| GET | /api/pipeline | Lijst pipeline-agents (agents met naam die start met "pipe-") |
| POST | /api/run | Alias voor POST /api/agents |
| POST | /api/spawn | Alias voor POST /api/agents |
| POST | /api/clean | Ruimt workspaces van afgeronde agents op |
| GET | / | Serveert de React SPA (index.html) |

---

## 3. Agent State Transitions

### AgentRecord statussen

| Status | Betekenis | Overgang naar |
|--------|-----------|--------------|
| `running` | Agent is actief in tmux | done, failed, killed, timeout, error, paused |
| `done` | Agent heeft .done file aangemaakt | — (eindstatus) |
| `failed` | Agent is mislukt (niet-nul exit) | — (eindstatus) |
| `killed` | Agent is geforceerd gestopt via `oa kill` | — (eindstatus) |
| `timeout` | Agent heeft de tijdslimiet overschreden | — (eindstatus) |
| `error` | Status niet bepaalbaar / tmux-window weg | — (eindstatus) |
| `paused` | Agent gepauzeerd via API pause-pane | running (via resume) |

### TaskRecord statussen

| Status | Beschrijving |
|--------|-------------|
| `todo` | Taak beschikbaar, nog niet geclaimd |
| `claimed` | Geclaimd door een agent (file-locked) |
| `done` | Voltooid; deblokkeert afhankelijke taken |
| `blocked` | Wacht op afhankelijke taken |

### Checkpoint statussen

| Status | Beschrijving |
|--------|-------------|
| `running` | Checkpoint actief (agent loopt) |
| `completed` | Checkpoint voltooid |
| `failed` | Agent is mislukt |

---

## 4. AgentRecord Data Model

| Veld | Type | Beschrijving |
|------|------|-------------|
| `name` | str | Unieke agent-naam (slug: lowercase, hyphens, max 62 chars) |
| `task` | str | Taakomschrijving (inhoud van CLAUDE.md prompt) |
| `workspace` | str | Absoluut pad naar agent workspace directory |
| `tmux_window` | str | Naam van het tmux-window (`agent-<name>`) |
| `model` | str | Model: `claude`, `claude/sonnet`, `claude/opus`, `claude/haiku`, `ollama/<model>` |
| `status` | str | running \| done \| failed \| killed \| timeout \| error |
| `pid` | Optional[int] | Proces-ID (optioneel) |
| `created_at` | float | Unix timestamp van aanmaak |
| `finished_at` | Optional[float] | Unix timestamp van afsluiting |
| `output_file` | Optional[str] | Pad naar outputbestand |
| `parent` | Optional[str] | Naam van parent-agent (None = root) |
| `depth` | int | Diepte in de hiërarchie (0 = root) |
| `lineage` | list[str] | Lijst van voorouder-namen (root → parent) |
| `task_hash` | str | SHA-256 hash (16 chars) van taak voor deduplicatie |
| `max_children` | int | Max directe kinderen die dit agent mag spawnen (default: 10) |
| `shared_results_dir` | Optional[str] | Gedeeld pad voor output-aggregatie over het subtree |
| `last_activity` | float | Timestamp van laatste activiteit (auto-cleanup) |
| `auto_cleanup_minutes` | int | Na hoeveel minuten inactiviteit opruimen (default: 20) |
| `project_root` | Optional[str] | Project root bij --direct mode |

---

## 5. Feature Gaps

### CLI zonder API endpoint

| CLI Feature | Reden/Opmerking |
|-------------|-----------------|
| `oa setup` | Preflight + initialisatie, eenmalig; geen API-equivalent |
| `oa start / stop` | Tmux-sessiebeheer; start bestaat als POST /api/session/start, stop ontbreekt |
| `oa dashboard` | TUI; client-side functie, geen API-logica |
| `oa attach` | Tmux attach; terminal-only, geen API-equivalent |
| `oa watch` | Polling loop; SSE /stream is het API-equivalent |
| `oa pipeline` | Blocking orchestratie; geen async API-equivalent |
| `oa delegate` | Orchestrator-spawning; geen API-equivalent |
| `oa vscode-bridge` | Start aparte bridge; geen API-equivalent |
| `oa guardians --register` | Interactief registreren; API heeft alleen list + trigger |
| `oa version` | CLI metadata; geen API-endpoint |
| `oa shutdown-request` | Graceful shutdown via messaging; geen dedicated API-endpoint |
| `oa inbox --mark-read` | Via API wel: POST /api/messages/<name>/read |
| `oa task claim` | File-locked claim; API /api/tasks heeft alleen list/create/update |
| `oa task complete` | Auto-unblock logica; API PUT kan status zetten maar voert geen cascade uit |
| `oa checkpoint show` | Detail-view; API /api/checkpoints geeft alleen lijst |
| `oa resume` | Spawnt nieuwe agent; API POST /api/resume geeft alleen prompt terug |

### API zonder CLI-commando

| API Endpoint | Reden/Opmerking |
|-------------|-----------------|
| POST /api/agents/`<name>`/pause | Geen CLI `oa pause` commando |
| POST /api/agents/`<name>`/resume | CLI `oa resume` is checkpoint-resume, niet pane-resume |
| GET /api/agents/`<name>`/stream | SSE streaming; CLI heeft `oa watch` als equivalent |
| GET /api/templates | CLI `oa templates` is equivalent — beide bestaan |
| GET /api/templates/`<id>` | Geen CLI-equivalent voor laden van één template |
| GET / (React SPA) | Geen CLI-equivalent |
| DELETE /api/agents/`<name>` | CLI `oa kill` is functioneel equivalent |
| POST /api/run, /api/spawn | Aliassen; geen extra functionaliteit |
| POST /api/session/stop | Ontbreekt in API (CLI heeft `oa stop`) |

---

## 6. Storage Layout

| Locatie | Inhoud |
|---------|--------|
| `~/.oa/agents.json` | AgentRecord-register (alle agents) |
| `~/.oa/messages/<agent>/inbox/` | Directe berichten per agent |
| `~/.oa/messages/_broadcast/` | Broadcast-berichten (permanent record) |
| `~/.oa/teams/<name>/config.json` | Team-configuraties |
| `~/.oa/tasks/<team>/<id>.json` | Taak-records per team |
| `~/.oa/checkpoints/<name>.json` | Checkpoint-bestanden per agent |
| `~/.oa/session-log.json` | Event log (agent_spawned, session_end, guardian_triggered) |
| `~/.oa/config.json` | Gebruikersconfiguratie (timeout, model, library-pad) |
| `/tmp/oa-<name>-*/` | Agent workspaces (tijdelijk) |
