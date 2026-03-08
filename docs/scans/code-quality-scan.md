# Code Quality Scan — Open Agents
**Datum:** 2026-03-08
**Scanner:** scanner-code-quality agent
**Scope:** oa-cli/src/open_agents/*.py + oa-cli/web/src/**/*.ts(x)

---

## Samenvatting

| Severity | Aantal |
|----------|--------|
| HIGH     | 7      |
| MED      | 13     |
| LOW      | 7      |
| **Totaal** | **27** |

---

## HIGH — Bug/crash risico

---

### [SEVERITY: HIGH] state.py:94
**Probleem:** Race condition in `save_agents`. Het bestand wordt geopend met mode `'w'` (truncate) VOORDAT de exclusive lock wordt verkregen. Als twee processen tegelijk `save_agents` aanroepen, trunceren ze allebei het bestand voordat één van beiden de lock krijgt — dit kan leiden tot permanent leeg/corrupt agents.json.
```python
with open(STATE_FILE, "w") as f:   # ← truncate direct, nog geen lock
    fcntl.flock(f, fcntl.LOCK_EX)  # ← te laat
```
**Fix:** Schrijf naar een temp-bestand en vervang atomisch: `tmp.write_text(json.dumps(...)); tmp.replace(STATE_FILE)`. Of gebruik `open(STATE_FILE, "r+")` + lock + seek(0) + truncate.

---

### [SEVERITY: HIGH] checkpoint.py:36
**Probleem:** `_write_locked` heeft dezelfde race condition als state.py: `path.open("w")` trunceert het bestand direct, daarna pas lock. Crash-recovery checkpoints kunnen corrupt raken.
**Fix:** Zelfde patroon: schrijf naar tmp-file en `tmp.replace(path)`.

---

### [SEVERITY: HIGH] guardians.py:79
**Probleem:** `SESSION_LOG_PATH.write_text(json.dumps(log, indent=2))` heeft geen file locking. Als twee guardian triggers tegelijk `log_event` aanroepen (bijv. `session_end` + `agent_spawned`), overschrijven ze elkaars writes. Log entries gaan verloren.
**Fix:** Gebruik fcntl locking zoals in messaging.py, of schrijf via een queue.

---

### [SEVERITY: HIGH] guardians.py:17–54
**Probleem:** GUARDIANS dict bevat hardgecodeerde absolute paden voor de machine van de oorspronkelijke ontwikkelaar (`/mnt/c/Users/Freek Heijting/...`). Op elke andere machine falen alle guardians.
```python
"output": "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/LESSONS.md",
```
**Fix:** Gebruik relatieve paden via `_resolve_library_dir()`, of lees deze paden uit config.json.

---

### [SEVERITY: HIGH] spawner.py:63
**Probleem:** Het Claude-opstartcommando bevat een hardgecodeerde Dutch prompt die niet via config of template overschreven kan worden. Dit koppelt alle agents onnodig aan een specifieke taalinstelling en voorkomt customisatie.
```python
claude_prompt = "Lees CLAUDE.md en voer de taak uit. Schrijf al je output naar ./output/ en maak een .done file als je klaar bent."
```
**Fix:** Maak dit configureerbaar via `config.json` key `claude_start_prompt`, met fallback naar de huidige default.

---

### [SEVERITY: HIGH] bridge.py:alle endpoints
**Probleem:** Geen authenticatie op REST API. Iedereen die op localhost poort 5174 kan komen (bijv. via SSRF of malicieuze webapp) kan agents spawnen, killen, berichten sturen, of sessies stoppen.
**Fix:** Voeg een API key toe via config of gebruik UNIX socket in plaats van TCP. Minimaal: genereer een random token bij `run_bridge()` en vereis dat in de `Authorization` header.

---

### [SEVERITY: HIGH] tmux.py:11–13
**Probleem:** `_run()` gebruikt `shell=True`. Tmux-commando's worden opgebouwd met user-gecontroleerde data (agent namen, task strings). Hoewel `shlex.quote` gebruikt wordt in callers, is het gebruik van `shell=True` inherent riskant — een bug in één caller kan leiden tot command injection.
**Fix:** Gebruik `shell=False` met een lijst van argumenten: `subprocess.run(["tmux"] + shlex.split(args), ...)`.

---

## MED — Functionaliteitsproblemen

---

### [SEVERITY: MED] state.py:13 / teams.py:12 / task_list.py:12
**Probleem:** `OA_DIR` is gedefinieerd op 4 plekken (`state.py`, `teams.py`, `task_list.py`, `config.py`). Als het pad ooit gewijzigd wordt, moet dit op 4 plekken bijgewerkt worden. Inconsistentie-risico.
**Fix:** Importeer `OA_DIR` overal uit `config.py`: `from .config import OA_DIR`.

---

### [SEVERITY: MED] spawner.py:26–29 / lifecycle.py:20–21
**Probleem:** Config wordt eenmalig geladen op module-import niveau (`_config = load_config()`). Als de gebruiker config.json aanpast terwijl `oa` draait, worden de nieuwe waarden niet opgepikt tot herstart. Dit geldt voor `TIMEOUT_MINUTES`, `DEFAULT_MODEL` en `MAX_DEPTH`.
**Fix:** Laad config per functieaanroep, of invalideer de cache bij config file wijziging (bijv. `functools.lru_cache` met TTL of inotify).

---

### [SEVERITY: MED] messaging.py:36–37
**Probleem:** `_msg_filename` genereert bestandsnamen op basis van milliseconde-timestamp + sender. Als twee berichten in dezelfde milliseconde van dezelfde sender komen, overschrijft het tweede bericht het eerste stilzwijgend.
```python
def _msg_filename(sender: str) -> str:
    ts = int(time.time() * 1000)
    return f"{ts}-{sender}.json"
```
**Fix:** Voeg een random suffix toe: `import secrets; return f"{ts}-{sender}-{secrets.token_hex(4)}.json"`.

---

### [SEVERITY: MED] messaging.py:159
**Probleem:** Broadcast-deduplicatie werkt op float timestamp vergelijking (`msg.get("timestamp") in seen_timestamps`). Float timestamps kunnen botsen als twee berichten exact dezelfde float hebben. Broadcast berichten kunnen onterecht overgeslagen worden.
**Fix:** Gebruik de bestandsnaam als deduplicatie-sleutel in plaats van timestamp.

---

### [SEVERITY: MED] auto_manager.py:47
**Probleem:** `_notified: set[str]` groeit onbeperkt. Afgehandelde agents worden nooit verwijderd uit de set. Bij een langlopende sessie met veel agents is dit een memory leak.
**Fix:** Verwijder entries uit `_notified` zodra een agent ook uit de state verdwijnt (via een cleanup-hook), of beperk de set tot de laatste N namen.

---

### [SEVERITY: MED] pipeline.py:203
**Probleem:** Agent naam `f"pipe-{pid}-{st['name']}"` kan de maximale lengte van 62 tekens overschrijden als de subtask `name` lang is. De spawn zal dan falen met een `RuntimeError` zonder duidelijke melding aan de gebruiker.
**Fix:** Trunceer `st['name']` zodat de totale naam altijd ≤ 62 tekens: `agent_name = f"pipe-{pid}-{st['name'][:50-len(pid)]}"`.

---

### [SEVERITY: MED] orchestrator.py:33
**Probleem:** Return type annotatie `"AgentRecord"` als forward reference, maar `AgentRecord` wordt niet geïmporteerd in orchestrator.py. Type checkers (mypy/pyright) zullen hier een fout geven.
**Fix:** Voeg toe: `from .state import AgentRecord` en verwijder de string-quotes.

---

### [SEVERITY: MED] pipeline.py:7
**Probleem:** `import shutil` is geïmporteerd maar nergens in pipeline.py gebruikt.
**Fix:** Verwijder de ongebruikte import.

---

### [SEVERITY: MED] client.ts:alle functies
**Probleem:** Geen error handling op `fetch` calls. `res.json()` wordt aangeroepen zonder te checken of `res.ok`. Bij 4xx/5xx responses van de bridge wordt de error body als het verwachte type geparsed, wat leidt tot onverwachte runtime errors verder in de applicatie.
```typescript
const res = await fetch(`${API}/agents`);
return res.json();  // ← geen res.ok check
```
**Fix:** Voeg toe: `if (!res.ok) throw new Error(await res.text());` voor elke `res.json()` call.

---

### [SEVERITY: MED] agentStore.ts:171–173 en 181–183
**Probleem:** Lege catch-blokken slikken alle fouten stil, inclusief programmer errors (TypeError, SyntaxError). Debugging is hierdoor onmogelijk.
```typescript
} catch {
  // Bridge not running
}
```
**Fix:** Log minimaal naar console in development: `} catch (e) { if (import.meta.env.DEV) console.warn('fetchAgents:', e); }`.

---

### [SEVERITY: MED] guardians.py:100
**Probleem:** `safe_name = name[:62]` trunceert de guardian-naam maar valideert niet of de naam voldoet aan het patroon `[a-z0-9-]`. Guardian namen als `LESSONS-GUARDIAN` bevatten hoofdletters en falen bij `spawn_agent`.
**Fix:** Voeg validatie toe: `safe_name = re.sub(r'[^a-z0-9-]', '-', name.lower())[:62]`.

---

### [SEVERITY: MED] bridge.py:183
**Probleem:** `import json as _json` binnen functie `api_list_guardians()` terwijl `json` al op module-niveau geïmporteerd is (regel 5). Onnodig en verwarrend.
**Fix:** Verwijder de lokale import; gebruik de al aanwezige module-level `json`.

---

## LOW — Code smells

---

### [SEVERITY: LOW] config.py:33
**Probleem:** Functie `get()` overschaduwt Python's ingebouwde `get`. Als gebruikers `from .config import get` doen, is de ingebouwde `get` verborgen.
**Fix:** Hernoem naar `get_config_value(key)` of `config_get(key)`.

---

### [SEVERITY: LOW] chat.py:232
**Probleem:** Tekst verwijst naar `'oa review <name>'` maar dit commando bestaat niet in de CLI.
```python
self.console.print(f"[dim]Use 'oa review {rec.name}' to check proposals.[/dim]")
```
**Fix:** Vervang door `'oa collect <name>'` of verwijder de hint.

---

### [SEVERITY: LOW] state.py:39
**Probleem:** `lineage: list = field(default_factory=list)` gebruikt bare `list` type zonder type-parameter. Inconsistent met andere annotaties in hetzelfde bestand.
**Fix:** Gebruik `lineage: list[str] = field(default_factory=list)`.

---

### [SEVERITY: LOW] auto_manager.py:54
**Probleem:** `_thread: Optional[threading.Thread] = None` gebruikt `Optional` uit typing, terwijl de rest van de codebase `str | None` syntax gebruikt (Python 3.10+). Stijlinonsistentie.
**Fix:** Gebruik `_thread: threading.Thread | None = None`.

---

### [SEVERITY: LOW] agentStore.ts:150
**Probleem:** `data.find((a) => a.name === name)` wordt aangeroepen in een loop over `Object.keys(prevMap)`. Dit is O(n²) complexiteit. Bij grotere aantallen agents vertraagt dit merkbaar.
**Fix:** Converteer `data` naar een Set of Map voor lookups: `const dataNames = new Set(data.map(a => a.name));`.

---

### [SEVERITY: LOW] agentStore.ts:193
**Probleem:** `get().fetchAgents()` wordt aangeroepen zonder `await` in `spawnAgent`. De functie returnt voor de agent-lijst bijgewerkt is, wat kan leiden tot stale UI state bij de caller.
**Fix:** Voeg `await` toe: `await get().fetchAgents();`.

---

### [SEVERITY: LOW] cli.py:33–45
**Probleem:** `AGENTS_LIBRARY_DIR` wordt aangemaakt als module-level constante bij import. Dit roept `_resolve_library_dir()` aan (en daarmee `load_config()`), wat I/O uitvoert bij elke import. Dit vertraagt de CLI startup en maakt unit-testen moeilijker.
**Fix:** Maak het lazy met `functools.cached_property` op een config object, of evalueer alleen bij de eerste aanroep met `lru_cache`.

---

*Scan voltooid op 2026-03-08 door scanner-code-quality agent.*
