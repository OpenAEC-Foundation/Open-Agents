# Open-Agents Product Assessment

**Datum:** 2026-03-08
**Assessor:** product-assessor (Claude Opus)
**Scope:** CLI, Bridge API, Web UI (frontend + backend), end-to-end flows

---

## Werkt ✅

### 1. CLI Commands — Kernfunctionaliteit
- **`oa start`** — Maakt tmux sessie aan met dashboard window, preflight checks werken.
- **`oa stop`** — Stopt sessie, triggert session_end guardians.
- **`oa status`** — Toont rich table met alle agents via `print_status()`.
- **`oa run`** — Spawnt agents met task, model, template, context-skills, parent, workspace, direct mode. Volledige feature set.
- **`oa kill`** — Stopt agent en sluit tmux window.
- **`oa collect`** — Leest output.md uit workspace van voltooide agent.
- **`oa clean`** — Ruimt workspaces op van voltooide agents.
- **`oa web`** — Start Flask bridge + serveert React SPA op poort 5174.
- **`oa dashboard`** — Start interactieve TUI dashboard.
- **`oa attach / watch`** — Live output bekijken van draaiende agents.
- **`oa send / inbox / broadcast`** — Inter-agent messaging werkt volledig.
- **`oa delegate`** — Spawnt orchestrator + workers automatisch.
- **`oa pipeline`** — Planner -> subtasks -> combiner flow.
- **`oa templates`** — List templates uit agents/library/ directory.
- **`oa team create/list/add-member/delete`** — Team management.
- **`oa task create/list/done/update`** — Task management per team.
- **`oa checkpoint list/show`** — Checkpoint inspectie.
- **`oa resume`** — Herstart agent vanuit checkpoint.
- **`oa setup`** — Preflight checks + ~/.oa/ initialisatie.
- **`oa guardians`** — List/trigger guardians.

### 2. Bridge API — Agent Endpoints
- `GET /api/agents` — Lijst met caching (1s TTL), status refresh voor running agents.
- `GET /api/agents/<name>` — Detail met live_output (running) of result (done).
- `GET /api/agents/<name>/output` — Live terminal output van tmux pane.
- `POST /api/agents` — Spawn agent, auto-genereert naam, auto-start sessie.
- `POST /api/agents/<name>/kill` — Stop agent.
- `POST /api/agents/<name>/pause` en `/resume` — Pause/resume via tmux.
- `POST /api/clean` — Cleanup.
- `POST /api/session/start` en `GET /api/session/status` — Sessie management.
- `GET /api/health` — Health check.

### 3. Bridge API — Messaging
- `GET /api/messages/<name>` — Inbox ophalen met unread count.
- `POST /api/messages` — Bericht sturen.
- `POST /api/messages/broadcast` en `/api/broadcast` — Broadcast.
- `POST /api/messages/<name>/read` — Mark as read.

### 4. Bridge API — Teams, Tasks, Guardians
- `GET/POST /api/teams`, `GET /api/teams/<name>` — Team CRUD.
- `GET/POST /api/tasks/<team>`, `PUT /api/tasks/<team>/<id>` — Task CRUD.
- `GET /api/guardians` — List met last_triggered timestamps uit session log.
- `GET /api/pipeline` — List pipeline agents.

### 5. State Management
- `state.py` — Atomic writes via temp file + rename (race condition fix).
- File locking met `fcntl` voor concurrent access.
- In-memory cache met mtime-based invalidation.
- AgentRecord dataclass met hiërarchie (depth, lineage, max_children).
- Spawn validatie: diepte limiet, max children, task-hash deduplicatie.

### 6. Frontend — Agent Dashboard
- `agentStore.ts` — Zustand store met polling, activity log, hierarchy builder.
- `SpawnForm.tsx` — Agent spawnen via UI met task, model, naam. Werkt end-to-end via `POST /api/agents`.
- `GuardianPanel.tsx` — Toont guardians met trigger type, model, last triggered.

### 7. Tmux Layer
- Veilige command execution (geen shell=True, shlex.split).
- Session create/check/destroy.

---

## Gedeeltelijk ⚠️

### 1. Templates Feature — Twee Gescheiden Systemen
**Backend:** CLI `oa run --template` en `oa templates` werken perfect — lezen JSON uit `agents/library/`.
**Bridge:** `/api/templates` endpoint bestaat, maar importeert `template_loader` module die optioneel is (try/except). Als module ontbreekt → 501 response.
**Frontend:** `templateStore.ts` werkt VOLLEDIG op localStorage met hardcoded default templates. Haalt NOOIT data op van de backend API. Dit zijn twee compleet gescheiden template-systemen die niet met elkaar communiceren.

**Impact:** Gebruiker ziet in de web UI hardcoded demo templates (Code Review, Bug Fixer, etc.) die NIETS te maken hebben met de echte templates in `agents/library/`. "Use" knop op TemplateCard roept `onUse` callback aan, maar de koppeling naar SpawnForm is onduidelijk — het navigeert naar een template builder, niet naar agent spawning.

### 2. Live Output — Polling, Geen Streaming
- Bridge levert `live_output` via `capture_agent_output()` (tmux capture-pane).
- Frontend pollt elke ~2 seconden — geen WebSocket of SSE streaming.
- Bij snel werkende agents mis je output tussen polls.
- Type definitie: `live_output?: string | null` is correct aanwezig.

### 3. Guardian Panel — Read-Only
- `GuardianPanel.tsx` toont guardians met naam, trigger, model, last triggered.
- Er is **geen UI trigger knop** — guardians kunnen alleen via CLI getriggerd worden (`oa guardians --trigger <event>`).
- Bridge heeft geen `POST /api/guardians/trigger` endpoint.

### 4. Onboarding — Component Bestaat, Niet Aangesloten
- `Onboarding.tsx` bestaat met Tauri provider detectie (ollama, openrouter, claude).
- Slaat `oa_onboarded` op in localStorage.
- **Niet geïntegreerd in App.tsx** — wordt nooit gerenderd.
- Code is functioneel maar dode code in de huidige app.

### 5. Agent Types in Frontend
- `types/index.ts` definieert `Agent` type met `live_output`, `result`, `unread_messages`.
- Mist velden die backend WEL levert: `depth`, `lineage`, `task_hash`, `max_children`, `project_root`, `auto_cleanup_minutes`, `last_activity`.
- Geen blocking issue maar verliest informatie.

---

## Kapot/Ontbreekt ❌

### 1. `template_loader.py` — Ontbreekt
Bridge.py regel 37-39:
```python
from .template_loader import list_templates, load_template
```
Dit bestand bestaat NIET in de codebase. Import faalt silently (try/except), waardoor:
- `/api/templates` → 501 "template_loader module not available"
- `/api/templates/<id>` → 501
- Frontend kan geen backend templates laden (maar gebruikt localStorage, dus zichtbaar effect is beperkt)

### 2. Template "Use" Flow — Niet End-to-End
TemplateCard "Use" knop → `onUse(template)` callback → navigeert waarschijnlijk naar template builder/editor.
Er is **geen pad** van "Use template" → SpawnForm met vooraf ingevulde task/model.
De frontend templates (localStorage) hebben een `nodes/edges` graph structuur die NERGENS wordt uitgevoerd.

### 3. Onboarding Niet Geïntegreerd
Component bestaat maar wordt niet geïmporteerd of gerenderd in de app.

### 4. Guardian Trigger via UI
Geen endpoint en geen UI om guardians te triggeren vanuit de web interface.

### 5. Checkpoint/Resume via UI
Backend heeft endpoints (`GET /api/checkpoints`, `POST /api/resume/<agent>`), maar er is **geen frontend component** voor checkpoint management of agent resume.

### 6. Template Sync Backend ↔ Frontend
Twee gescheiden werelden:
- Backend: JSON files in `agents/library/`
- Frontend: localStorage met hardcoded defaults
- Geen sync, geen bridge

### 7. Auto-Cleanup
`AgentRecord` heeft `auto_cleanup_minutes` en `last_activity` velden, maar er is **geen achtergrondproces** dat agents automatisch opruimt op basis van inactiviteit.

### 8. Error Handling Frontend
`agentStore.ts` vangt API errors op met lege catch blocks (`catch { // Bridge not running }`). Gebruiker krijgt geen feedback als bridge down is.

---

## Top 5 Fixes voor Grootste Impact

### 1. **Maak `template_loader.py` aan** (30 min)
Schrijf een simpele module die `agents/library/*.json` leest en `list_templates()` / `load_template(id)` implementeert. Dit ontgrendelt de `/api/templates` endpoints en maakt het mogelijk om echte templates in de web UI te tonen.

```python
# template_loader.py
def list_templates() -> list[dict]: ...
def load_template(template_id: str) -> dict | None: ...
```

### 2. **Koppel frontend templates aan backend** (1-2 uur)
Verander `templateStore.ts` om templates van `/api/templates` te laden in plaats van localStorage. Behoud localStorage als offline fallback. Dit verbindt de twee template-werelden.

### 3. **Template "Use" → SpawnForm flow** (1 uur)
Als gebruiker "Use" klikt op een template:
1. Vul SpawnForm in met `systemPrompt` als task en `modelHint` als model
2. Open spawn dialog
3. Gebruiker kan aanpassen en spawnen

Dit maakt de hele template experience functioneel.

### 4. **Integreer Onboarding in App.tsx** (30 min)
Check `localStorage.getItem('oa_onboarded')` bij app start. Als niet aanwezig, toon Onboarding component. Na voltooiing, sla provider config op en ga naar dashboard.

### 5. **Guardian trigger via UI** (1 uur)
- Voeg `POST /api/guardians/trigger` endpoint toe aan bridge.py
- Voeg trigger knop toe aan GuardianPanel.tsx
- Optioneel: toon trigger history

---

## Architectuur Observaties

**Sterke punten:**
- Clean separation of concerns: CLI → state → tmux → bridge → frontend
- Atomic file writes in state.py met temp file + rename
- In-memory caching met mtime invalidation
- Veilige tmux command execution (geen shell=True)
- Graceful degradation in bridge.py (try/except imports)
- Hiërarchie ondersteuning in AgentRecord (depth, lineage, spawn validatie)

**Aandachtspunten:**
- `fcntl` is Linux-only — werkt niet native op Windows (alleen via WSL)
- Flask in development mode (debug=False maar geen production WSGI server)
- Geen authentication op bridge API
- Polling-based UI (geen WebSocket/SSE)
- Twee template systemen die niet met elkaar praten
