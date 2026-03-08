# Fixes Applied — 3 Critical Bugs

**Datum:** 2026-03-08
**Agent:** fix-critical

---

## Fix 1: tmux.py — shell=True command injection (CRITICAL → FIXED)

**Bestand:** `oa-cli/src/open_agents/tmux.py`

**Voor:**
```python
def _run(cmd: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, check=check
    )

def _tmux(args: str, check: bool = True) -> subprocess.CompletedProcess:
    return _run(f"tmux {args}", check=check)
```

**Na:**
```python
# FIX: Use argument list instead of shell=True to prevent command injection
def _run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd, capture_output=True, text=True, check=check
    )

def _tmux(args: str, check: bool = True) -> subprocess.CompletedProcess:
    # FIX: Split args with shlex and prepend 'tmux' to build safe argument list
    return _run(["tmux"] + shlex.split(args), check=check)
```

---

## Fix 2: state.py — race condition in save_agents (HIGH → FIXED)

**Bestand:** `oa-cli/src/open_agents/state.py`

**Voor:**
```python
def save_agents(agents: dict[str, AgentRecord]) -> None:
    _ensure_dir()
    raw = {name: asdict(rec) for name, rec in agents.items()}
    with open(STATE_FILE, "w") as f:       # ← truncate VOOR lock
        fcntl.flock(f, fcntl.LOCK_EX)      # ← te laat
        try:
            json.dump(raw, f, indent=2)
            f.write("\n")
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
```

**Na:**
```python
def save_agents(agents: dict[str, AgentRecord]) -> None:
    _ensure_dir()
    raw = {name: asdict(rec) for name, rec in agents.items()}
    # FIX: Atomic write via temp file + rename to eliminate race condition
    import os
    import tempfile
    tmp_fd, tmp_path = tempfile.mkstemp(dir=OA_DIR, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w") as f:
            json.dump(raw, f, indent=2)
            f.write("\n")
        Path(tmp_path).replace(STATE_FILE)  # ← atomisch op POSIX
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise
```

---

## Fix 3: guardians.py — hardcoded absolute paden (HIGH → FIXED)

**Bestand:** `oa-cli/src/open_agents/guardians.py`

**Voor:** 6 hardgecodeerde paden zoals:
```python
"output": "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/LESSONS.md",
```

**Na:** Dynamische `_REPO_ROOT` variabele:
```python
# FIX: Replace hardcoded absolute paths with dynamic path resolution
_REPO_ROOT = Path(
    os.environ.get("OA_REPO_ROOT", str(Path(__file__).parents[3]))
)
# ...
"output": str(_REPO_ROOT / "LESSONS.md"),
```

Alle 6 paden zijn vervangen. Overschrijfbaar via `OA_REPO_ROOT` environment variable.

---

## Status

| Fix | Severity | Status |
|-----|----------|--------|
| tmux.py shell=True | CRITICAL | ✅ FIXED |
| state.py race condition | HIGH | ✅ FIXED |
| guardians.py hardcoded paths | HIGH | ✅ FIXED |
