# oa-cli Command Reference

> Gegenereerd door mistral:7b op Hetzner GPU server — 2026-03-11
> Open Agents CLI — tmux-based multi-agent orchestrator

---

## Sessie

| Commando | Beschrijving | Gebruik |
|----------|-------------|---------|
| `oa setup` | Initialiseer `~/.oa/` en voer preflight checks uit | Eerste keer instellen |
| `oa doctor` | Controleer omgeving: tmux, claude CLI, Python versie, actieve sessie | Troubleshooten |
| `oa start` | Start de oa tmux sessie met dashboard window | Begin van elke werksessie |
| `oa stop` | Stop de oa tmux sessie (met session persistence) | Afsluiten |
| `oa version` | Toon CLI versie | Versie controleren |
| `oa handoff` | Genereer handoff document voor de volgende sessie | Einde van sessie |

```bash
oa start
oa doctor
```

---

## Agents spawnen

| Commando | Beschrijving | Gebruik |
|----------|-------------|---------|
| `oa run "<taak>"` | Spawn een agent met een taak in een nieuw tmux window | De meest gebruikte command |
| `oa pipeline "<taak>"` | Multi-agent pipeline: planner → subtasks → combiner | Complexe taken met meerdere stappen |
| `oa delegate "<taak>"` | Delegeer automatisch: spawnt orchestrator + workers (D-051) | Grote taken |
| `oa loop "<taak>"` | Spawn agent op een terugkerend interval | Monitoring, polling |
| `oa templates` | Lijst alle beschikbare agent templates | Template kiezen |

**Opties voor `oa run`:**
- `--name <naam>` — geef de agent een naam
- `--model <model>` — kies model: `claude/sonnet`, `hetzner/mistral:7b`, `ollama/mistral`
- `--direct` — schrijf output direct naar project (altijd gebruiken!)
- `--template <id>` — gebruik een template uit de library

```bash
oa run "Schrijf unit tests voor lifecycle.py" --name tester --model hetzner/mistral:7b --direct
oa pipeline "Bouw een REST API voor agentbeheer"
```

---

## Monitoring

| Commando | Beschrijving | Gebruik |
|----------|-------------|---------|
| `oa status` | Toon status van alle agents in een tabel | Overzicht lopende agents |
| `oa dashboard` | Interactieve TUI voor real-time monitoring | Visueel overzicht |
| `oa web` | Start web UI op localhost:5174 | Browser-gebaseerd dashboard |
| `oa attach <naam>` | Attach aan een agent's tmux window | Live meekijken |
| `oa watch <naam>` | Stream output van een agent real-time | Output volgen |
| `oa logs [naam]` | Toon run logs (van agent of recente runs) | Debuggen |
| `oa collect <naam>` | Toon output van een voltooide agent | Resultaat ophalen |

```bash
oa status
oa collect mijn-agent
oa watch mijn-agent
```

---

## Agent lifecycle

| Commando | Beschrijving | Gebruik |
|----------|-------------|---------|
| `oa kill <naam>` | Stop een draaiende agent | Forceer stop |
| `oa clean` | Verwijder workspaces van afgeronde agents | Opruimen |
| `oa resume <naam>` | Resume agent vanuit zijn laatste checkpoint | Na crash |
| `oa compact [naam]` | Trigger context compaction voor agent(s) | Context window vol |
| `oa shutdown <naam>` | Graceful shutdown met approve/reject en timeout | Nette afsluiting |
| `oa review <naam>` | Spawn adversarial reviewer op output van agent | QA check |
| `oa guardians` | List, trigger of registreer guardian agents | Doc-updates |

```bash
oa kill langzame-agent
oa resume gecrasht-agent
oa review mijn-agent
```

---

## Communicatie (inter-agent messaging)

| Commando | Beschrijving | Gebruik |
|----------|-------------|---------|
| `oa send <naar> "<bericht>"` | Stuur bericht naar een agent | DM tussen agents |
| `oa inbox <naam>` | Check inbox van een agent | Berichten lezen |
| `oa broadcast "<bericht>"` | Broadcast naar alle draaiende agents | Team-aankondiging |
| `oa watch-inbox <naam>` | Watch inbox real-time | Live berichten |
| `oa shutdown-request <naam>` | Stuur graceful shutdown request | Zachte stop |

```bash
oa send worker-1 "Klaar met jouw deel? Stuur output naar /tmp/results/"
oa inbox meta
oa broadcast "Sessie eindigt over 5 minuten — rond af"
```

---

## Advanced / Infrastructuur

| Commando | Beschrijving | Gebruik |
|----------|-------------|---------|
| `oa hooks` | Beheer post-run hooks (list, run, install) | Automatisering |
| `oa mcp` | Start Open Agents MCP server (stdio transport) | Claude Code integratie |
| `oa vscode-bridge` | Start VS Code bridge server op port 5175 | VS Code koppeling |
| `oa session-start` | Spawn persistent session-orchestrator die taken aanneemt | Altijd-aan orchestrator |

```bash
oa mcp
oa hooks list
```

---

## Snelreferentie

```bash
# Sessie starten
oa start && oa status

# Agent spawnen (altijd --direct!)
oa run "jouw taak" --name mijn-agent --model hetzner/mistral:7b --direct

# Monitoren
oa status
oa collect mijn-agent

# Communicatie
oa send mijn-agent "volgende stap"
oa inbox meta

# Afsluiten
oa clean && oa stop
```
