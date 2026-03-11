# Code Quality Report — oa-cli 2026-03-11

_Gegenereerd door code-quality-agent op 2026-03-11_

---

## Module Status

| Module | Volledig geïmplementeerd | Geïntegreerd | Kritieke issues |
|--------|--------------------------|--------------|-----------------|
| `telemetry.py` | ✅ Ja | ⚠️ Gedeeltelijk | `finish_run()` nooit aangeroepen |
| `hooks.py` | ✅ Ja | ⚠️ Gedeeltelijk | File-system hooks werken; programmatic hooks en `apply_hooks_config()` niet opgeroepen |
| `a2a_adapter.py` | ✅ Ja | ✅ Ja | In-memory state verloren bij herstart (gedocumenteerd PoC) |
| `analytics.py` | ✅ Ja | ✅ Ja | Cascading failure door ontbrekende `finish_run()` |
| `context_tracker.py` | ✅ Ja | ✅ Ja | Geen kritieke issues |
| `__init__.py` | ✅ Ja | n.v.t. | Geen |

---

## Gevonden problemen

### 🔴 KRITIEK: `finish_run()` wordt nooit aangeroepen

**Bestand:** `lifecycle.py` (alle status-update-locaties)
**Betreffend:** `telemetry.py` ↔ `lifecycle.py` — ontbrekende integratie

**Beschrijving:**
`telemetry.start_run()` wordt correct aangeroepen in `spawner.py` (regel 234–242), maar `telemetry.finish_run()` wordt **nergens** aangeroepen. `lifecycle.py` importeert `telemetry` niet en roept `finish_run()` niet aan bij agent-completion.

Dit betekent dat:
- Alle run-logs blijven staan op `"exit_status": "unknown"` en `"finished_at": null`
- `analytics.health_report()` berekent altijd 0% success rate (regel 44–45 in `analytics.py`:  `finished = [r for r in runs if r.get("exit_status") not in ("unknown", None)]` → lege lijst)
- `duration_seconds` is altijd `null` in alle run-logs

**Locaties waar `finish_run()` ontbreekt in `lifecycle.py`:**
- Regel 54: na `update_agent(name, status="done", ...)` voor remote agents
- Regel 85: na `update_agent(name, status="done", ...)` voor lokale agents
- Regel 107: na `update_agent(name, status="failed", ...)` bij tmux-sessie-failure
- Regel 121: na `update_agent(name, status="error", ...)` bij verdwenen tmux-window
- Regel 140: na `update_agent(name, status="timeout", ...)` bij timeout

**Fix:** In `lifecycle.py`, voeg bovenaan het bestand toe:
```python
from . import telemetry as _telemetry
```
En roep na elke `update_agent(...)` aan:
```python
if getattr(rec, "run_id", None):
    _telemetry.finish_run(rec.run_id, exit_status="<status>")
```

---

### 🟡 WAARSCHUWING: `apply_hooks_config()` wordt nooit aangeroepen

**Bestand:** `hooks.py:279` — functie bestaat maar wordt niet gebruikt
**Bestand:** `cli.py` — geen aanroep van `apply_hooks_config()`

**Beschrijving:**
`hooks.py` bevat een complete YAML-configuratie loader (`load_hooks_config()`) en applicator (`apply_hooks_config()`). Deze lezen `~/.oa/hooks-config.yaml` en registreren Python-callables als hooks. Maar `apply_hooks_config()` wordt nergens aangeroepen in `cli.py` of `bridge.py`. Gebruikers die hooks configureren via `~/.oa/hooks-config.yaml` zullen nooit werken.

**Fix:** Voeg in `cli.py` aan het `start`-commando (of een startup-functie) toe:
```python
from .hooks import apply_hooks_config
apply_hooks_config()
```

---

### 🟡 WAARSCHUWING: Programmatic `trigger_hook()` / `HOOKS` dict niet gebruikt

**Bestand:** `hooks.py:51` — `trigger_hook()` bestaat maar wordt niet aangeroepen
**Bestand:** `lifecycle.py` — roept alleen file-system `run_hooks()` aan

**Beschrijving:**
Er zijn twee parallel hook-systemen in `hooks.py`:
1. **File-system hooks** (`run_hooks()`, `HOOK_DIRS`) — worden correct aangeroepen vanuit `lifecycle.py`
2. **Programmatic hooks** (`register_hook()`, `trigger_hook()`, `HOOKS` dict) — worden nergens aangeroepen

Het is onduidelijk of het tweede systeem intentioneel ongebruikt is (voor externe gebruikers die hooks willen registreren via Python API) of een incomplete integratie. Als het intentioneel is, ontbreekt documentatie hierover.

---

### 🟡 WAARSCHUWING: `bridge.py` — `api_session_cost()` is permanent een stub

**Bestand:** `bridge.py:366–369`
```python
@app.route("/api/session/cost")
def api_session_cost():
    """Return session cost (telemetry placeholder — sprint 22)."""
    return jsonify({"tokens_used": 0, "cost_usd": 0.0})
```

**Beschrijving:**
Hardcoded zeros. De telemetry-module bevat wel run-logs maar geen cost/token tracking. Sprint 22 is voorbij (vandaag is 2026-03-11). Als token/cost-weergave gewenst is, vereist dit ofwel echte implementation of het endpoint moet worden verwijderd.

---

### 🔵 INFO: `a2a_adapter.py` — in-memory task-mapping verloren bij herstart

**Bestand:** `a2a_adapter.py:52–53`
```python
# In-memory bidirectional map (sufficient for PoC; file-backed in Phase 2)
_task_to_agent: dict[str, str] = {}
_agent_to_task: dict[str, str] = {}
```

**Beschrijving:**
A2A task-IDs worden niet gepersisteerd. Bij server-herstart zijn alle bestaande mappings weg. De code documenteert dit als PoC-beperking voor Phase 2. Geen actie vereist tenzij Phase 2 gepland is.

---

### 🔵 INFO: `context_tracker.py` — `shlex.quote()` in subprocess-lijst

**Bestand:** `context_tracker.py:44` en `context_tracker.py:145`
```python
target = f"{session}:{shlex.quote(tmux_window)}"
# ...
result = subprocess.run(["tmux", "capture-pane", "-t", target, ...])
```

**Beschrijving:**
`shlex.quote()` is bedoeld voor shell-escaping, niet voor subprocess-list-argumenten. In de praktijk doet dit geen schade omdat agent-namen gevalideerd worden als `[a-z0-9-]` en `shlex.quote()` deze ongewijzigd laat. Maar het is technisch incorrect gebruik van de functie. Als een window-naam ooit speciale tekens zou bevatten (bijv. via een race condition of externe aanpassing), zou `shlex.quote()` single quotes toevoegen die tmux niet begrijpt.

---

## Samenvatting aanbevelingen

### Prioriteit 1 — Hoge urgentie

1. **Voeg `telemetry.finish_run()` toe aan `lifecycle.py`** bij elke agent status-transitie (done/failed/error/timeout). Dit repareert ook `analytics.health_report()` in één keer.

### Prioriteit 2 — Gemiddelde urgentie

2. **Roep `apply_hooks_config()` aan bij startup** (in `cli.py` `start`-commando) zodat `~/.oa/hooks-config.yaml` effect heeft.
3. **Besluit over programmatic hooks**: documenteer of verwijder het `HOOKS`/`trigger_hook()` systeem als het niet bedoeld is voor interne gebruik.

### Prioriteit 3 — Lage urgentie / informationeel

4. **`api_session_cost` endpoint**: implementeer of verwijder.
5. **`shlex.quote()` in `context_tracker.py`**: vervang door directe window-naam string voor correctheid.

---

_Rapport klaar. 5 modules volledig geïmplementeerd. 1 kritieke integratiegap gevonden (telemetry.finish_run), 2 gemiddelde issues, 3 informatieve bevindingen._
