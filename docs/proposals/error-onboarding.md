# Proposal: Error Handling & Onboarding voor oa-cli

**Bestand:** Meerdere bestanden in `oa-cli/src/open_agents/`
**Primaire wijziging:** Nieuwe `cli.py:setup()` command + defensieve error handling in `orchestrator.py`, `state.py`, `workspace.py`, `pipeline.py`, `bridge.py`

---

## 1. FIRST RUN EXPERIENCE ANALYSE

### Wat gebeurt er als een nieuwe gebruiker `oa start` typt?

#### Scenario A: tmux niet geïnstalleerd (meest voorkomend probleem)

```
$ oa start
Traceback (most recent call last):
  File ".../typer/main.py", ...
  File ".../open_agents/orchestrator.py", line 60, in start_session
    _tmux(f"new-session -d -s {SESSION_NAME} -n dashboard")
  File ".../open_agents/orchestrator.py", line 43, in _tmux
    return _run(f"tmux {args}", check=check)
  File ".../open_agents/orchestrator.py", line 36, in _run
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, check=check)
subprocess.CalledProcessError: Command 'tmux new-session -d -s oa -n dashboard' returned non-zero exit status 127
```

**Beoordeling:** ONBEGRIJPELIJK voor nieuwe gebruiker. Exit status 127 = "command not found", maar dat staat er niet bij.

#### Scenario B: tmux aanwezig, claude CLI niet geïnstalleerd

```
$ oa start
Session 'oa' created with dashboard window.
$ oa run "schrijf een hello world"
Agent 'schrijf-abc123' spawned  (claude)
  Task: schrijf een hello world
  Workspace: /tmp/oa-agent-schrijf-abc123/
  Window: agent-schrijf-abc123
$ oa status
# ... 2 seconden later ...
[agent-schrijf-abc123] done
$ oa collect schrijf-abc123
No output.md found in workspace.
```

**Beoordeling:** Agent "slaagt" in 2 seconden — maar heeft niets gedaan. Het script runt `claude --dangerously-skip-permissions -p "..."`, bash zegt "command not found", daarna runt `touch .done` en de agent is "klaar". Compleet misleidend.

#### Scenario C: Alles geïnstalleerd, geen configuratie — werkt!

De happy path werkt correct. Er zijn echter geen guards voor randgevallen.

---

## 2. VOLLEDIGE CRASH-ANALYSE

### orchestrator.py

| Locatie | Probleem | Type fout |
|---|---|---|
| `start_session()` regel 60 | `_tmux(..., check=True)` zonder tmux aanwezig | `CalledProcessError` → raw traceback |
| `start_session()` regel 62-65 | Dashboard setup `send-keys` zonder guard | `CalledProcessError` als sessie niet aanmaakt |
| `spawn_agent()` regel 174 | `_tmux("new-window ...", check=True)` | Crash als sessie tussendoor is verwijderd |
| `spawn_agent()` regel 193 | `_tmux("send-keys ...", check=True)` | Crash als window net werd gesloten |
| `CLAUDE_CMD = "claude"` regel 24 | Hardcoded, geen check of 'claude' in PATH | Stille mislukking — agent start, `.done` wordt aangemaakt, geen output |
| `OLLAMA_CMD = "ollama.exe"` regel 25 | WSL-specifiek, broken op native Linux | Stille mislukking op non-WSL systemen |

### state.py

| Locatie | Probleem | Type fout |
|---|---|---|
| `load_agents()` regel 57 | `json.loads(STATE_FILE.read_text())` geen try/except | `json.JSONDecodeError` bij corrupte JSON |
| `load_agents()` regel 57 | Geen permission check | `PermissionError` als `~/.oa/agents.json` read-only is |
| `save_agents()` regel 77 | `STATE_FILE.write_text(...)` geen try/except | `PermissionError` als `~/.oa/` read-only is |
| `load_agents()` regel 59-70 | `AgentRecord(**data)` bij onverwachte velden | `TypeError: unexpected keyword argument` |

### workspace.py

| Locatie | Probleem | Type fout |
|---|---|---|
| `create_workspace()` regel 17 | `tempfile.mkdtemp(...)` als `/tmp` vol is | `OSError: [Errno 28] No space left on device` |
| `cleanup_workspace()` regel 55 | `shutil.rmtree(path)` zonder try/except | `PermissionError` als workspace locked is |

### bridge.py

| Locatie | Probleem | Type fout |
|---|---|---|
| `run_bridge()` regel 229 | `app.run(port=port)` geen port-conflict handling | `OSError: [Errno 98] Address already in use` |
| `index()` regel 35 | `send_from_directory(WEB_DIR, "index.html")` | `404 Not Found` als web/dist niet gebouwd is — geen vriendelijke foutmelding |
| `WEB_DIR` regel 24 | Hardcoded relatief pad naar `web/dist` | Breekt bij pipx install (dist is niet meegeleverd) |

### pipeline.py

| Locatie | Probleem | Type fout |
|---|---|---|
| `run_pipeline()` regel 145-147 | `start_session()` kan crashen als tmux mist | Propagatie van `CalledProcessError` |
| `_wait_for_agent()` regel 104-114 | Pollt elke 5 sec, geen output aan gebruiker | Ziet er uit als "bevroren" voor nieuwe gebruiker |

### cli.py

| Locatie | Probleem | Type fout |
|---|---|---|
| `run()` regel 61 | Enige guard is `session_exists()` check | Geen check of claude beschikbaar is |
| `collect()` regel 188 | `read_output()` kan `None` teruggeven | Bericht is onduidelijk ("No output.md found") |
| Geen `setup` command | Nieuwe gebruiker weet niet waar te beginnen | UX gap |

---

## 3. ONTWERP: `oa setup` COMMAND

### Voorstel voor `cli.py` — nieuw `setup` command

```python
@app.command()
def setup():
    """Check prerequisites and initialize Open Agents for first use."""
    import shutil
    from pathlib import Path

    console.print("\n[bold cyan]Open Agents — Setup[/bold cyan]")
    console.print("=" * 40)

    all_ok = True

    # --- Check tmux ---
    console.print("\n[bold]1. Checking prerequisites...[/bold]")
    if shutil.which("tmux"):
        result = subprocess.run(["tmux", "-V"], capture_output=True, text=True)
        version = result.stdout.strip()
        console.print(f"  [green]✓[/green] tmux found: {version}")
    else:
        console.print("  [red]✗[/red] tmux not found")
        console.print("    [dim]Install with: sudo apt install tmux  (Ubuntu/Debian)")
        console.print("                  brew install tmux          (macOS)[/dim]")
        all_ok = False

    # --- Check claude CLI ---
    if shutil.which("claude"):
        result = subprocess.run(["claude", "--version"], capture_output=True, text=True)
        version = result.stdout.strip() or result.stderr.strip()
        console.print(f"  [green]✓[/green] claude CLI found: {version}")
    else:
        console.print("  [red]✗[/red] claude CLI not found")
        console.print("    [dim]Install from: https://claude.ai/download")
        console.print("    Run 'claude' once to authenticate.[/dim]")
        all_ok = False

    # --- Create ~/.oa/ directory ---
    console.print("\n[bold]2. Initializing directories...[/bold]")
    oa_dir = Path.home() / ".oa"
    try:
        oa_dir.mkdir(parents=True, exist_ok=True)
        console.print(f"  [green]✓[/green] {oa_dir} ready")
    except PermissionError:
        console.print(f"  [red]✗[/red] Cannot create {oa_dir}: permission denied")
        all_ok = False

    # --- Check /tmp writability ---
    import tempfile
    try:
        with tempfile.NamedTemporaryFile(prefix="oa-test-", delete=True):
            pass
        console.print("  [green]✓[/green] /tmp writable")
    except OSError as e:
        console.print(f"  [red]✗[/red] /tmp not writable: {e}")
        all_ok = False

    # --- Summary ---
    console.print()
    if all_ok:
        console.print("[bold green]✓ All checks passed! Open Agents is ready.[/bold green]")
        console.print()
        console.print("[bold]Quick start:[/bold]")
        console.print("  [cyan]oa start[/cyan]              — Start the tmux session")
        console.print("  [cyan]oa run \"your task\"[/cyan]    — Spawn an agent")
        console.print("  [cyan]oa status[/cyan]             — Check agent status")
        console.print("  [cyan]oa dashboard[/cyan]          — Open interactive TUI")
        console.print("  [cyan]oa collect <name>[/cyan]     — Get agent output")
    else:
        console.print("[bold red]✗ Some checks failed. Fix the issues above and run 'oa setup' again.[/bold red]")
        raise typer.Exit(1)
```

---

## 4. VOORGESTELDE FIXES PER BESTAND

### Fix 1: `orchestrator.py` — Guards bij tmux gebruik

**Probleem:** `start_session()` geeft een ruwe Python traceback als tmux niet aanwezig is.

**Fix:** Voeg een `_require_tmux()` functie toe die wordt aangeroepen voor alle tmux-operaties:

```python
import shutil

def _require_tmux() -> None:
    """Raise a friendly RuntimeError if tmux is not available."""
    if not shutil.which("tmux"):
        raise RuntimeError(
            "tmux is not installed or not in PATH.\n"
            "  Ubuntu/Debian: sudo apt install tmux\n"
            "  macOS:         brew install tmux\n"
            "  Run 'oa setup' to check all prerequisites."
        )

def start_session() -> bool:
    _require_tmux()  # ← nieuw
    if session_exists():
        return False
    try:
        _tmux(f"new-session -d -s {SESSION_NAME} -n dashboard")
        _tmux(
            f"send-keys -t {SESSION_NAME}:dashboard "
            f"'watch -t -n3 oa status' Enter"
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            f"Failed to create tmux session: {e.stderr or e.returncode}\n"
            "Try running 'tmux new-session -d -s oa' manually to diagnose."
        ) from e
    return True
```

### Fix 2: `orchestrator.py` — Check claude CLI bij spawn

**Probleem:** Claude CLI niet gevonden → agent start, `.done` wordt aangemaakt, geen output, geen foutmelding.

**Fix:** Controleer vóór het spawnen van een claude-agent of het commando beschikbaar is:

```python
def _require_claude() -> None:
    """Raise RuntimeError if claude CLI is not available."""
    if not shutil.which(CLAUDE_CMD):
        raise RuntimeError(
            f"'{CLAUDE_CMD}' is not installed or not in PATH.\n"
            "  Download from: https://claude.ai/download\n"
            "  Make sure to run 'claude' once to authenticate.\n"
            "  Run 'oa setup' to check all prerequisites."
        )

# In spawn_agent(), vóór de command build:
if not model.startswith("ollama/"):
    _require_claude()
```

### Fix 3: `state.py` — Robuuste JSON parsing

**Probleem:** Corrupte `agents.json` → `json.JSONDecodeError` propagates als unhandled exception.

**Fix:**

```python
def load_agents() -> dict[str, AgentRecord]:
    """Load all agents from state file."""
    if not STATE_FILE.exists():
        return {}
    try:
        raw_text = STATE_FILE.read_text()
    except PermissionError:
        import warnings
        warnings.warn(
            f"Cannot read {STATE_FILE}: permission denied. "
            "Run 'oa setup' to check configuration."
        )
        return {}

    if not raw_text.strip():
        return {}  # leeg bestand = geen agents

    try:
        raw = json.loads(raw_text)
    except json.JSONDecodeError as e:
        import warnings
        # Backup corrupt file
        backup = STATE_FILE.with_suffix(".json.corrupt")
        try:
            STATE_FILE.rename(backup)
            warnings.warn(
                f"agents.json is corrupt (JSON error: {e}). "
                f"Moved to {backup}. Starting fresh."
            )
        except OSError:
            warnings.warn(
                f"agents.json is corrupt (JSON error: {e}). "
                "Could not create backup — starting with empty state."
            )
        return {}

    result = {}
    for name, data in raw.items():
        try:
            data.setdefault("model", "claude")
            data.setdefault("pid", None)
            data.setdefault("output_file", None)
            data.setdefault("parent", None)
            data.setdefault("depth", 0)
            data.setdefault("lineage", [])
            data.setdefault("task_hash", _task_hash(data.get("task", "")))
            data.setdefault("max_children", 10)
            data.setdefault("shared_results_dir", None)
            result[name] = AgentRecord(**data)
        except (TypeError, KeyError) as e:
            import warnings
            warnings.warn(f"Skipping malformed agent record '{name}': {e}")
    return result


def save_agents(agents: dict[str, AgentRecord]) -> None:
    """Write agents dict to state file."""
    _ensure_dir()
    raw = {name: asdict(rec) for name, rec in agents.items()}
    try:
        STATE_FILE.write_text(json.dumps(raw, indent=2) + "\n")
    except PermissionError as e:
        raise RuntimeError(
            f"Cannot write to {STATE_FILE}: {e}\n"
            "Check permissions with: ls -la ~/.oa/"
        ) from e
```

### Fix 4: `bridge.py` — Port conflict + missing web/dist

**Probleem:** Port bezet → crash zonder uitleg. Web/dist niet gebouwd → onduidelijke 404.

**Fix:**

```python
def run_bridge(port: int = 5174) -> None:
    """Start the bridge server."""
    # Check if web/dist exists
    if not WEB_DIR.exists():
        print(
            f"Warning: Web UI not built. Static files not found at {WEB_DIR}.\n"
            "The API will work but the web interface will not be available.\n"
            "To build: cd web && npm install && npm run build"
        )

    print(f"Open Agents bridge running on http://localhost:{port}")
    try:
        app.run(host="127.0.0.1", port=port, debug=False)
    except OSError as e:
        if "Address already in use" in str(e):
            print(
                f"Error: Port {port} is already in use.\n"
                f"Try a different port with: oa web --port {port + 1}\n"
                f"Or find what's using it: lsof -i :{port}"
            )
        else:
            raise
```

### Fix 5: `cli.py` — Betere foutmeldingen voor bestaande commands

**Probleem:** `oa collect <name>` geeft "No output.md found in workspace" — onduidelijk wat te doen.

**Fix:**

```python
@app.command()
def collect(name: str = typer.Argument(..., help="Agent name to collect output from")):
    """Show the output of a completed agent."""
    rec = get_agent(name)
    if rec is None:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        console.print("[dim]Use 'oa status' to see all agents.[/dim]")
        raise typer.Exit(1)

    current_status = check_agent(name)
    if current_status == "running":
        console.print(f"[yellow]Agent '{name}' is still running. Use 'oa watch {name}' to follow progress.[/yellow]")
        raise typer.Exit(1)

    output = read_output(rec.workspace)
    if output:
        console.print(f"\n[bold]Output from agent '{name}':[/bold]\n")
        console.print(output)
    else:
        console.print(f"[yellow]No output found for agent '{name}'.[/yellow]")
        console.print(f"[dim]  Status:    {current_status}[/dim]")
        console.print(f"[dim]  Workspace: {rec.workspace}[/dim]")
        console.print(f"[dim]  Check: ls {rec.workspace}/output/[/dim]")
        if current_status in ("error", "failed"):
            console.print(
                "[dim]  The agent may have crashed. "
                "Check the tmux window if still open, or inspect the workspace.[/dim]"
            )
```

---

## 5. VOLLEDIG ONTWERP: `oa setup` COMMAND

### Doel
Een enkel command dat:
1. Controleert of alle dependencies aanwezig zijn (tmux, claude)
2. De `~/.oa/` directory aanmaakt
3. Een vriendelijke welcome message toont
4. Concrete fix-instructies geeft als er iets ontbreekt

### Volledige implementatie voor `cli.py`

```python
@app.command()
def setup():
    """Check prerequisites and initialize Open Agents for first use.

    Run this after 'pipx install open-agents-cli' to verify your setup.
    """
    import shutil
    import subprocess
    import tempfile
    from pathlib import Path

    console.print()
    console.print("[bold cyan]  Open Agents — Setup Wizard[/bold cyan]")
    console.print("[dim]  Checking your environment...[/dim]")
    console.print()

    issues: list[str] = []

    # ─── 1. tmux ─────────────────────────────────────────────────────────────
    console.print("[bold]Prerequisites[/bold]")

    if shutil.which("tmux"):
        r = subprocess.run(["tmux", "-V"], capture_output=True, text=True)
        version = r.stdout.strip() or "unknown version"
        console.print(f"  [green]✓[/green] tmux         {version}")
    else:
        console.print("  [red]✗[/red] tmux         [bold red]NOT FOUND[/bold red]")
        console.print("    [dim]→ Ubuntu/Debian:  sudo apt install tmux")
        console.print("    → macOS:           brew install tmux")
        console.print("    → Windows (WSL):   sudo apt install tmux[/dim]")
        issues.append("tmux")

    # ─── 2. claude CLI ───────────────────────────────────────────────────────
    if shutil.which("claude"):
        r = subprocess.run(["claude", "--version"], capture_output=True, text=True)
        version = (r.stdout.strip() or r.stderr.strip() or "found").split("\n")[0]
        console.print(f"  [green]✓[/green] claude CLI   {version}")
    else:
        console.print("  [red]✗[/red] claude CLI   [bold red]NOT FOUND[/bold red]")
        console.print("    [dim]→ Download from: https://claude.ai/download")
        console.print("    → After install, run 'claude' once to authenticate[/dim]")
        issues.append("claude")

    # ─── 3. ~/.oa/ directory ──────────────────────────────────────────────────
    console.print()
    console.print("[bold]Directories[/bold]")

    oa_dir = Path.home() / ".oa"
    try:
        oa_dir.mkdir(parents=True, exist_ok=True)
        console.print(f"  [green]✓[/green] ~/.oa/       {oa_dir}")
    except PermissionError as e:
        console.print(f"  [red]✗[/red] ~/.oa/       [bold red]Cannot create: {e}[/bold red]")
        issues.append("~/.oa permissions")

    # ─── 4. /tmp writability ─────────────────────────────────────────────────
    try:
        with tempfile.NamedTemporaryFile(prefix="oa-test-", delete=True) as f:
            pass
        console.print(f"  [green]✓[/green] /tmp         writable")
    except OSError as e:
        console.print(f"  [red]✗[/red] /tmp         [bold red]Not writable: {e}[/bold red]")
        issues.append("/tmp not writable")

    # ─── 5. Bestaande agents.json check ──────────────────────────────────────
    state_file = oa_dir / "agents.json"
    if state_file.exists():
        import json
        try:
            data = json.loads(state_file.read_text())
            n = len(data)
            console.print(f"  [green]✓[/green] agents.json  {n} agent(s) registered")
        except (json.JSONDecodeError, OSError):
            console.print(f"  [yellow]![/yellow] agents.json  [yellow]WARNING: corrupt or unreadable[/yellow]")
            console.print(f"    [dim]→ Delete with: rm {state_file}[/dim]")

    # ─── Summary ─────────────────────────────────────────────────────────────
    console.print()

    if not issues:
        console.print("[bold green]  ✓ All checks passed! Open Agents is ready to use.[/bold green]")
        console.print()
        console.print("[bold]  Quick start:[/bold]")
        console.print()
        console.print("    [cyan]oa start[/cyan]")
        console.print("    [dim]  → Start the tmux session (required before running agents)[/dim]")
        console.print()
        console.print("    [cyan]oa run \"write a hello world script\"[/cyan]")
        console.print("    [dim]  → Spawn an agent with a task[/dim]")
        console.print()
        console.print("    [cyan]oa status[/cyan]")
        console.print("    [dim]  → Check what all agents are doing[/dim]")
        console.print()
        console.print("    [cyan]oa dashboard[/cyan]")
        console.print("    [dim]  → Open the interactive TUI monitor[/dim]")
        console.print()
        console.print("    [cyan]oa collect <agent-name>[/cyan]")
        console.print("    [dim]  → Read an agent's output after it finishes[/dim]")
        console.print()
        console.print(f"  [dim]Version: open-agents-cli v{__version__}[/dim]")
    else:
        console.print(
            f"[bold red]  ✗ {len(issues)} issue(s) found: {', '.join(issues)}[/bold red]"
        )
        console.print("  [dim]Fix the issues above and run 'oa setup' again.[/dim]")
        raise typer.Exit(1)
```

---

## 6. SAMENVATTING VAN ALLE VOORGESTELDE WIJZIGINGEN

| Bestand | Wijziging | Prioriteit |
|---|---|---|
| `cli.py` | Voeg `setup()` command toe | **HOOG** |
| `orchestrator.py` | `_require_tmux()` guard vóór alle tmux-calls | **HOOG** |
| `orchestrator.py` | `_require_claude()` guard vóór claude spawn | **HOOG** |
| `orchestrator.py` | `try/except CalledProcessError` in `start_session()` en `spawn_agent()` | **HOOG** |
| `state.py` | `try/except JSONDecodeError` in `load_agents()` | **HOOG** |
| `state.py` | `try/except PermissionError` in `load_agents()` en `save_agents()` | **MIDDEL** |
| `state.py` | `try/except TypeError` per agent-record in `load_agents()` | **MIDDEL** |
| `cli.py` | Verbeterde foutmeldingen in `collect()` command | **MIDDEL** |
| `bridge.py` | Port-conflict foutmelding in `run_bridge()` | **MIDDEL** |
| `bridge.py` | Check of `web/dist` bestaat bij startup | **LAAG** |
| `workspace.py` | `try/except OSError` in `create_workspace()` | **LAAG** |

---

## 7. GEVONDEN WSL-SPECIFIEKE ISSUES

In `orchestrator.py` regel 25:
```python
OLLAMA_CMD = "ollama.exe"  # WSL → Windows interop
```

Dit is hard-coded voor WSL. Op een native Linux of macOS systeem is het commando gewoon `ollama`. Aanbeveling:

```python
import platform
import shutil

def _get_ollama_cmd() -> str:
    """Return the correct ollama command for the current platform."""
    # Check for WSL
    try:
        with open("/proc/version") as f:
            if "microsoft" in f.read().lower():
                return "ollama.exe"  # WSL → Windows binary
    except OSError:
        pass
    return "ollama"

OLLAMA_CMD = _get_ollama_cmd()
```

---

*Gegenereerd op: 2026-03-02*
*Analyse door: oa-agent (Claude Sonnet 4.6)*
