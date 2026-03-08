# Security Scan — Open-Agents Codebase
**Datum:** 2026-03-08
**Scanner:** scanner-security agent (v2)
**Scope:** oa-cli/src/open_agents/, web/src/, web/src-tauri/

---

## Samenvatting

| Severity | Aantal |
|----------|--------|
| CRITICAL | 2 |
| HIGH     | 3 |
| MED      | 3 |
| LOW      | 2 |
| **Totaal** | **10** |

---

## Bevindingen

---

### [CRITICAL] tmux.py:10-14
**Vulnerability:** `subprocess.run()` met `shell=True` — systemisch shell injection risico
**Risico:** De centrale `_run()` functie gebruikt `shell=True` met een aaneengeschakelde string. Alle tmux-aanroepen door de codebase passeren hier doorheen. Hoewel de meeste callers `shlex.quote()` gebruiken voor dynamische waarden, introduceert `shell=True` een architectureel risico: één vergeten `shlex.quote()` call, of een future caller die vergeet te quoten, geeft direct remote code execution.

**Kwetsbare code:**
```python
# tmux.py:10-14
def _run(cmd: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, check=check
    )

def _tmux(args: str, check: bool = True) -> subprocess.CompletedProcess:
    return _run(f"tmux {args}", check=check)
```

**Fix:** Refactor naar list-form subprocess:
```python
def _run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, shell=False, capture_output=True, text=True, check=check)

def _tmux(args: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return _run(["tmux"] + args, check=check)

# Callers: _tmux(["new-window", "-t", SESSION_NAME, "-n", window_name])
```

---

### [CRITICAL] spawner.py:64
**Vulnerability:** Shell injection via ongeëscapte `claude_model` parameter in shell script
**Risico:** `model_flag = f" --model {claude_model}"` — GEEN shlex.quote. De waarde is user-controlled via `POST /api/agents {"model": "..."}`. Het wordt ingebed in `.oa-run.sh` dat via bash wordt uitgevoerd.

**Aanvalsketen:**
```
POST /api/agents {"model": "claude/sonnet; rm -rf ~"}
→ bridge.py:124 data.get("model")
→ spawner.py:175 claude_model = "sonnet; rm -rf ~"
→ spawner.py:64 model_flag = " --model sonnet; rm -rf ~"  # ONVEILIG
→ .oa-run.sh voert beide commando's uit
```

**Kwetsbare code:**
```python
# spawner.py:64
model_flag = f" --model {claude_model}" if claude_model else ""
```

**Fix:**
```python
ALLOWED_CLAUDE_MODELS = {"opus", "sonnet", "haiku"}

def _build_claude_command(workspace: Path, name: str, claude_model: str | None = None) -> str:
    if claude_model and claude_model not in ALLOWED_CLAUDE_MODELS:
        raise ValueError(f"Ongeldig model: {claude_model!r}")
    model_flag = f" --model {shlex.quote(claude_model)}" if claude_model else ""
    ...
```

---

### [HIGH] bridge.py:52
**Vulnerability:** CORS volledig open — alle origins toegestaan
**Risico:** `CORS(app)` zonder configuratie staat cross-origin requests toe van elke website. Gecombineerd met afwezigheid van authenticatie kan een kwaadaardige website agents spawnen, killen en berichten lezen via de browser van de gebruiker.

**Kwetsbare code:**
```python
# bridge.py:52
CORS(app)  # Staat ALLE origins toe
```

**Fix:**
```python
CORS(app,
     origins=["http://localhost:5173", "http://127.0.0.1:5173",
               "http://localhost:5174", "http://127.0.0.1:5174",
               "tauri://localhost"],
     methods=["GET", "POST", "PUT"],
     allow_headers=["Content-Type", "X-API-Token"])
```

---

### [HIGH] bridge.py (alle /api/* endpoints)
**Vulnerability:** Geen authenticatie op enig API endpoint
**Risico:** Alle endpoints zijn volledig open. Elke lokale applicatie of script kan agents spawnen, killen, berichten lezen/schrijven, en broadcast versturen. In combinatie met open CORS ook vanuit websites exploiteerbaar.

**Kwetsbare endpoints:** `POST /api/agents`, `POST /api/agents/<name>/kill`, `GET /api/messages/<name>`, `POST /api/broadcast`

**Fix:**
```python
import secrets, functools
from pathlib import Path

_TOKEN_FILE = Path.home() / ".oa" / "bridge-token"

def _load_or_create_token() -> str:
    if _TOKEN_FILE.exists():
        return _TOKEN_FILE.read_text().strip()
    token = secrets.token_hex(32)
    _TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    _TOKEN_FILE.write_text(token)
    _TOKEN_FILE.chmod(0o600)
    return token

API_TOKEN = _load_or_create_token()

def require_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("X-API-Token")
        if not token or not secrets.compare_digest(token, API_TOKEN):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# Voeg @require_auth toe aan alle state-wijzigende endpoints
```

---

### [HIGH] spawner.py:83
**Vulnerability:** Ongevalideerde `ollama_model` parameter
**Risico:** `ollama_model = model.split("/", 1)[1]` is volledig user-controlled en wordt niet gevalideerd op toegestane karakters of formaat, ondanks `shlex.quote()`.

**Kwetsbare code:**
```python
# spawner.py:83
f"TERM=dumb cat CLAUDE.md | {OLLAMA_CMD} run {shlex.quote(ollama_model)} "
```

**Fix:**
```python
import re
if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}', ollama_model):
    raise ValueError(f"Ongeldig ollama model: {ollama_model!r}")
```

---

### [MED] tauri.conf.json:29
**Vulnerability:** CSP bevat `'unsafe-inline'` voor `script-src` en `style-src`
**Risico:** `'unsafe-inline'` neutraliseert XSS-bescherming. Als agent-output onveilig wordt gerenderd in de React UI, kan injected JavaScript direct worden uitgevoerd. In Tauri-context heeft frontend code toegang tot geregistreerde Tauri commands.

**Kwetsbare code:**
```json
"script-src 'self' 'unsafe-inline'"
"style-src 'self' 'unsafe-inline'"
```

**Fix:**
```json
"csp": "default-src 'self'; connect-src 'self' http://127.0.0.1:5174 ws://127.0.0.1:5174; style-src 'self'; script-src 'self'; img-src 'self' data:"
```

---

### [MED] capabilities/default.json:8-13
**Vulnerability:** Te brede Tauri capabilities zonder whitelist
**Risico:** `shell:allow-spawn` en `shell:allow-execute` zonder beperking van toegestane executables laat de frontend toe om willekeurige systeemcommando's te starten als XSS optreedt.

**Kwetsbare code:**
```json
"shell:allow-spawn",
"shell:allow-execute",
"shell:allow-kill",
"fs:allow-read"
```

**Fix:** Minimale permissions — verwijder shell permissions omdat de Rust sidecar dit afhandelt:
```json
{
  "permissions": [
    "core:default",
    "process:allow-exit",
    "fs:allow-read",
    "dialog:allow-open",
    "dialog:allow-save",
    "os:default"
  ]
}
```

---

### [MED] guardians.py:22-53
**Vulnerability:** Hardcoded absolute paden met gebruikersnaam
**Risico:** Paden zoals `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/` lekken gebruikersnaam en projectstructuur bij publicatie van de repository. Code werkt niet op andere machines.

**Fix:**
```python
import os
from pathlib import Path
OA_REPO = Path(os.environ.get("OA_REPO_PATH", Path.home() / "Open-Agents"))

GUARDIANS = {
    "lessons-guardian": {
        "output": str(OA_REPO / "LESSONS.md"),
        ...
    }
}
```

---

### [LOW] tmux.py:24
**Vulnerability:** Defense-in-depth ontbreekt voor agent naam bij `shell=True`
**Risico:** Regex-validatie in spawner.py beschermt momenteel correct, maar als validatie ooit wordt omzeild bestaat er geen fallback bescherming vanwege `shell=True` in _tmux().

**Fix:** Primaire fix is de `shell=False` refactor van de CRITICAL tmux.py bevinding.

---

### [LOW] bridge.py:401-406
**Vulnerability:** Geen PID-validatie in `_kill_port()`
**Risico:** Ongevalideerde `lsof` output kan leiden tot `SIGTERM` aan verkeerd process bij onverwachte output.

**Kwetsbare code:**
```python
pid = int(pid_str.strip())
os.kill(pid, signal.SIGTERM)
```

**Fix:**
```python
pid = int(pid_str.strip())
if not (1 < pid <= 4194304):
    continue
os.kill(pid, signal.SIGTERM)
```

---

## Geen issues gevonden in

- React componenten — geen `dangerouslySetInnerHTML`
- TypeScript API client — correcte URL parameter handling
- Tauri Rust command handlers — veilige list-form argument passing in lib.rs
- Python deserialisatie — gebruikt `json`, niet `pickle`
- State management — `fcntl` file locking correct geïmplementeerd
- Geen hardcoded API keys of tokens in source code

---

## Prioriteitstabel

| Prioriteit | Actie | Bestand |
|-----------|-------|---------|
| P0 — Onmiddellijk | Verwijder `shell=True` | tmux.py |
| P0 — Onmiddellijk | Whitelist + quote `claude_model` | spawner.py |
| P1 — Deze week | API authenticatie toevoegen | bridge.py |
| P1 — Deze week | CORS origins beperken | bridge.py |
| P1 — Deze week | Valideer ollama modelnaam | spawner.py |
| P2 — Volgende sprint | Fix CSP `unsafe-inline` | tauri.conf.json |
| P2 — Volgende sprint | Minimaliseer Tauri capabilities | capabilities/default.json |
| P2 — Volgende sprint | Vervang hardcoded paden | guardians.py |
| P3 — Backlog | PID-validatie in _kill_port | bridge.py |

---

## Bestanden gescand

- `oa-cli/src/open_agents/tmux.py`
- `oa-cli/src/open_agents/spawner.py`
- `oa-cli/src/open_agents/bridge.py`
- `oa-cli/src/open_agents/guardians.py`
- `oa-cli/src/open_agents/lifecycle.py`
- `oa-cli/src/open_agents/workspace.py`
- `oa-cli/src/open_agents/orchestrator.py`
- `oa-cli/src/open_agents/messaging.py`
- `oa-cli/web/src-tauri/src/lib.rs`
- `oa-cli/web/src-tauri/src/main.rs`
- `oa-cli/web/src-tauri/tauri.conf.json`
- `oa-cli/web/src-tauri/capabilities/default.json`
