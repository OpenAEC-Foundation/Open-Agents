# Session Persistence — Masterplan Raw

> **Status**: RAW — brainstorm + eerste analyse
> **Datum**: 2026-03-11
> **Auteur**: Freek + Claude (conversatie-gedreven)
> **Pipeline**: masterplan_raw → research → core docs vullen → masterplan → onderzoek → engineering → implementatie

---

## 1. Probleemstelling

Een gebruiker die het kruisje klikt (terminal sluit) verliest:
- Sessie-context (wat was ik aan het doen?)
- Agent state (welke agents draaiden? wat was hun output?)
- Uncommitted werk (bestanden gewijzigd maar niet gestashed)
- Logs en terminal output
- Continuïteit naar de volgende sessie

**Kernvraag**: Hoe zorgen we dat het afsluiten van een terminal (bewust of onbewust) geen informatieverlies veroorzaakt?

---

## 2. Waarom tmux dit deels al oplost

tmux scheidt de terminal (client) van de sessie (server):
- Terminal sluiten = `client-detached` event, NIET sessie dood
- De `oa` tmux sessie en alle agent windows draaien gewoon door
- Agents merken niets van het sluiten van de terminal

**Wat tmux NIET doet**: actief state opslaan, summaries schrijven, notificaties sturen, of opruimen als alles klaar is.

---

## 3. Drie shutdown-modes

Niet elke afsluiting is hetzelfde:

| Mode | Trigger | Verwacht gedrag |
|------|---------|----------------|
| **Bewust stoppen** | `oa stop` | Volledige cleanup: agents afronden, state opslaan, docs updaten, sessie sluiten |
| **Onbewust sluiten** | Kruisje, terminal crash | Lichte cleanup: state snapshot, agents doorlaten draaien, notificatie als klaar |
| **Harde crash** | Laptop dicht, stroom eraf, kernel panic | Geen cleanup mogelijk — afhankelijk van periodieke checkpoints |

### 3.1 Bewust stoppen (`oa stop`)

Huidige `oa stop` is simpel — het stopt de tmux sessie. Nieuw gedrag:

```
oa stop
├── Phase 1: SNAPSHOT (instant)
│   ├── Agent state → ~/.oa/sessions/<timestamp>.json
│   ├── Git status + diff opslaan
│   └── Uncommitted work → git stash (optioneel, configureerbaar)
│
├── Phase 2: FINISH (max timeout, configureerbaar)
│   ├── Lopende agents "wrap up" signaal
│   ├── Output collecten van agents die al klaar zijn
│   └── Wachten op actieve agents OF timeout
│
├── Phase 3: DOCUMENT (optioneel, configureerbaar)
│   ├── Session summary genereren (AI of template-based)
│   ├── Mini-handoff schrijven
│   └── Core docs updaten (ROADMAP, LESSONS)
│
├── Phase 4: NOTIFY (optioneel)
│   ├── Desktop notificatie "Sessie afgerond"
│   └── Resume info opslaan voor volgende start
│
└── Phase 5: CLEANUP
    ├── Temp files opruimen
    ├── Logs archiveren → ~/.oa/logs/
    └── tmux sessie sluiten
```

### 3.2 Onbewust sluiten (kruisje)

tmux `client-detached` hook triggert automatisch:

```
client-detached hook
├── Phase 1: SNAPSHOT (instant, <1 sec)
│   ├── Agent state snapshot
│   ├── Git status opslaan
│   └── Timestamp van disconnect
│
├── Agents draaien DOOR (geen shutdown)
│
├── Background monitor start/continueert
│   ├── Checkt elke 30s of alle agents klaar zijn
│   ├── Als alles klaar → collecteer output
│   └── Desktop notificatie "Alle agents klaar"
│
└── Resume info opslaan
    └── Bij volgende `oa start`: "Je hebt X agents die nog draaien"
```

### 3.3 Harde crash

Geen cleanup mogelijk. Oplossing: **periodieke checkpoints**.

```
Periodieke checkpoint daemon (draait IN de tmux sessie)
├── Elke 5 minuten:
│   ├── Agent state snapshot → ~/.oa/sessions/periodic-<ts>.json
│   ├── Actieve agent output capturen (tmux capture-pane)
│   └── Git status opslaan
│
├── Bij volgende `oa start`:
│   ├── Detecteer incomplete sessie (geen clean shutdown)
│   ├── Toon laatste checkpoint
│   └── Optie: resume of clean start
```

---

## 4. Wat we opslaan (Session Record)

```json
{
  "session_id": "2026-03-11T14-32-00",
  "started_at": "2026-03-11T14:32:00Z",
  "ended_at": "2026-03-11T16:47:00Z",
  "shutdown_mode": "stop|detach|crash",
  "duration_seconds": 8100,

  "agents": {
    "worker-1": {
      "status": "done",
      "task": "Implementeer feature X",
      "output_path": "/path/to/output",
      "started_at": "...",
      "finished_at": "..."
    }
  },
  "agent_summary": {
    "total": 5,
    "done": 3,
    "running": 1,
    "failed": 1
  },

  "git_state": {
    "branch": "main",
    "uncommitted_files": ["file1.py", "file2.md"],
    "stash_ref": "stash@{0}",
    "last_commit": "abc1234"
  },

  "project_root": "/path/to/project",
  "config_snapshot": { "...": "..." }
}
```

---

## 5. Session Resume bij volgende start

```
$ oa start

╔══════════════════════════════════════════════════════╗
║  Vorige sessie: 2026-03-11 14:32 — 16:47 (2u 15m)  ║
║  Shutdown: detach (kruisje)                          ║
║                                                      ║
║  Agents: 3 done, 1 running, 1 failed                ║
║  Git: 2 uncommitted files, stash@{0} beschikbaar    ║
║                                                      ║
║  [R] Resume agents  [S] Toon summary  [N] Nieuw     ║
╚══════════════════════════════════════════════════════╝
```

---

## 6. Alle mogelijke acties bij afsluiting

### A. State & Context bewaren

| # | Actie | Complexiteit | Prioriteit |
|---|-------|:---:|:---:|
| A1 | Agent state snapshot → `~/.oa/sessions/<ts>.json` | Laag | P1 |
| A2 | Git status + uncommitted files list opslaan | Laag | P1 |
| A3 | Git stash uncommitted work (configureerbaar) | Laag | P2 |
| A4 | Session summary (AI-generated) | Medium | P3 |
| A5 | Mini-handoff document genereren | Medium | P3 |
| A6 | Clipboard/tmux buffer bewaren | Laag | P4 |

### B. Agents afronden

| # | Actie | Complexiteit | Prioriteit |
|---|-------|:---:|:---:|
| B1 | Graceful shutdown signaal ("wrap up") | Medium | P2 |
| B2 | Timeout met fallback kill | Laag | P2 |
| B3 | Output collecten van klare agents | Laag | P1 |
| B4 | Partial results bewaren van lopende agents | Medium | P3 |

### C. Logging & Audit

| # | Actie | Complexiteit | Prioriteit |
|---|-------|:---:|:---:|
| C1 | Session log archiveren → `~/.oa/logs/` | Laag | P2 |
| C2 | Tijdregistratie (start, eind, duur) | Laag | P1 |
| C3 | Error log apart bewaren | Laag | P2 |
| C4 | Token/cost tracking | Hoog | P4 |

### D. Documentatie auto-update

| # | Actie | Complexiteit | Prioriteit |
|---|-------|:---:|:---:|
| D1 | ROADMAP.md checkboxes updaten | Hoog | P4 |
| D2 | LESSONS.md bijwerken | Hoog | P4 |
| D3 | CHANGELOG.md entry | Hoog | P4 |

### E. Notificaties

| # | Actie | Complexiteit | Prioriteit |
|---|-------|:---:|:---:|
| E1 | Desktop notificatie (Windows toast / Linux notify-send) | Medium | P2 |
| E2 | Notificatie als alle agents klaar zijn | Medium | P2 |
| E3 | Email summary | Medium | P4 |
| E4 | Webhook/Slack | Medium | P4 |

### F. Herstel & Continuïteit

| # | Actie | Complexiteit | Prioriteit |
|---|-------|:---:|:---:|
| F1 | Resume prompt bij volgende `oa start` | Medium | P1 |
| F2 | Periodieke checkpoints (crash safety) | Medium | P1 |
| F3 | Agent queue bewaren (geplande taken) | Medium | P3 |
| F4 | Context restore (bestanden/tabs) | Hoog | P4 |

---

## 7. Open vragen (voor research ronde)

### Platform & Technisch

| # | Vraag | Impact |
|---|-------|--------|
| Q1 | Hoe werkt `client-detached` hook op Windows (WSL/Git Bash)? Triggert dit correct? | **Hoog** — als dit niet werkt op Windows is de hele hook-based aanpak anders |
| Q2 | Kan tmux een script runnen als daemon BINNEN de sessie die de cleanup doet? | Medium — bepaalt architectuur van background monitor |
| Q3 | Hoe detecteer je een "harde crash" vs "clean detach" bij de volgende `oa start`? | Hoog — bepaalt of we een recovery flow moeten tonen |
| Q4 | Wat is de beste manier om desktop notificaties te sturen vanuit tmux/WSL op Windows? | Medium — UX voor de "alles klaar" melding |
| Q5 | Hoeveel disk space gebruiken sessie-snapshots na 100+ sessies? | Laag — bepaalt retentiebeleid |
| Q6 | `fcntl` (file locking) werkt niet op Windows native — alleen in WSL. Is dat een probleem? | Hoog — state.py gebruikt fcntl |

### Architectuur

| # | Vraag | Impact |
|---|-------|--------|
| Q7 | Moet de cleanup logica in een apart Python script, of kan het in de bestaande CLI? | Medium — deployment en testbaarheid |
| Q8 | Hoe voorkomen we concurrent writes als cleanup EN een nog-draaiende agent allebei naar state schrijven? | Hoog — data integriteit |
| Q9 | Moet de session record in agents.json (bestaande state) of een apart bestand? | Medium — separation of concerns |
| Q10 | Hoe integreren we dit met het bestaande checkpoint systeem (checkpoint.py)? | Medium — hergebruik vs nieuw |

### UX

| # | Vraag | Impact |
|---|-------|--------|
| Q11 | Wil de gebruiker een interactieve resume flow, of is "automatisch verdergaan" beter? | Medium — UX keuze |
| Q12 | Hoeveel configuratie-opties willen we tonen? Te veel = overweldigend. | Medium — simplicity vs power |

---

## 8. Bestaande code die we hergebruiken

| Module | Wat het doet | Hoe we het hergebruiken |
|--------|-------------|----------------------|
| `state.py` | Agent CRUD in `~/.oa/agents.json` met file locking | State snapshot = `load_agents()` + serialize naar session record |
| `checkpoint.py` | Per-agent checkpoints in `~/.oa/checkpoints/` | Periodieke checkpoints BESTAAN AL — uitbreiden met sessie-level checkpoints |
| `lifecycle.py` | Agent status checking, cleanup, kill | `check_agent()` en `cleanup_idle_agents()` hergebruiken in shutdown flow |
| `hooks.py` | Event-driven hook systeem | Nieuwe events toevoegen: `on_session_end`, `on_detach`, `on_resume` |
| `tmux.py` | tmux operaties | `client-detached` hook registratie bij `start_session()` |
| `config.py` | Config management | `on_disconnect` settings toevoegen aan `DEFAULT_CONFIG` |

---

## 9. Configuratie (voorgesteld)

Toevoegen aan `~/.oa/config.json`:

```json
{
  "on_disconnect": {
    "state_snapshot": true,
    "git_stash": false,
    "session_summary": false,
    "auto_doc_update": false,
    "notify_desktop": true,
    "retention_days": 30,
    "cleanup_timeout_seconds": 300
  },
  "periodic_checkpoint_minutes": 5,
  "session_log_max_mb": 50
}
```

---

## 10. Wat er NIET in scope is

| Onderwerp | Waarom niet |
|-----------|-------------|
| Cloud sync van sessies | Alles is lokaal (D-048) |
| Multi-user sessie delen | Single user tool |
| Real-time collaboration | Buiten scope |
| Token cost tracking | Geen API — subscription model |
| Auto-commit bij afsluiting | Te gevaarlijk als default |

---

## 11. Security overwegingen

- Session snapshots kunnen gevoelige data bevatten (agent output met API keys, credentials)
- `~/.oa/sessions/` moet restrictieve permissions hebben (700)
- Logs scrubben voor bekende secret patterns (regex op `ghp_`, `sk-`, etc.)
- Git stash kan ook gevoelige bestanden bevatten — waarschuwing tonen
- Retentiebeleid voorkomt dat oude sessie-data onbeperkt blijft staan

---

## 12. Implementatie-volgorde (voorstel)

### Wave 1: Foundation (P1 items)
1. Session record schema + opslag (`~/.oa/sessions/`)
2. State snapshot bij `oa stop`
3. Periodieke checkpoints (uitbreiding bestaand systeem)
4. Resume detection bij `oa start`
5. Basis resume flow (toon vorige sessie info)

### Wave 2: Smart Shutdown (P2 items)
6. tmux `client-detached` hook registratie
7. Graceful agent shutdown signaal
8. Session log archivering
9. Desktop notificaties
10. Git stash optie

### Wave 3: Intelligence (P3 items)
11. AI-generated session summary
12. Mini-handoff document
13. Partial results bewaren
14. Agent queue persistence

### Wave 4: Polish (P4 items)
15. Auto doc-updates
16. Email/webhook notificaties
17. Token tracking
18. Context restore

---

## 13. Relatie tot bestaande sprints

Dit feature past het beste als onderdeel van **Sprint 17 (Agent Teams Patterns)** — specifiek het "graceful shutdown" item dat al open staat in de ROADMAP:

> "hooks.py, graceful shutdown, tests, TUI/web views nog open"

Of als een apart **Sprint 19: Session Persistence & Recovery**.

---

## 14. Samenvatting

**Kern**: tmux doet het zware werk al (sessie overleeft terminal sluiting). Wij bouwen de intelligentie eromheen: wat opslaan, wanneer opruimen, hoe hervatten.

**Drie lagen**:
1. **Preventief** — periodieke checkpoints zodat crashes geen data verliezen
2. **Reactief** — hooks bij detach/stop die state opslaan
3. **Proactief** — resume flow die de volgende sessie informeert

**Bestaande code** dekt ~60% van wat nodig is. Checkpoint.py, state.py, lifecycle.py en hooks.py zijn de bouwblokken.

---

*Volgende stap: Research ronde — Q1 t/m Q12 beantwoorden, daarna core docs vullen.*
