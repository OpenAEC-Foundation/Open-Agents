# Remote-First Implementation Report

**Date:** 2026-03-12
**Decision:** D-061 — Remote-first agent execution
**Agent:** remote-first

---

## Summary

`oa run` and `oa loop` now route to the default machine from `machines.json` by default instead of spawning locally. `--local` is the new opt-out flag.

---

## Changes Made

### 1. `config.py` — `get_default_machine()` helper

Added function that iterates over `load_machines_config()` and returns the first machine with `is_default: true`, or `None` if none found.

```
File: oa-cli/src/open_agents/config.py
```

**Behavior:**
- Returns `None` if `machines.json` doesn't exist → fallback to local (no error)
- Returns `None` if no machine has `is_default: true` → fallback to local
- Returns the machine dict (including `host`) if a default is found

---

### 2. `agents.py` — Remote-first routing in `oa run`

**Import added:** `from ..config import get_default_machine`

**New parameter:** `--local` (bool, default False)

**Routing logic:**
```python
if local:          # --local → force local
    target_host = None
elif remote:       # --remote <host> → use explicit host
    target_host = remote
else:              # default → read from machines.json
    _default_machine = get_default_machine()
    _default_host = _default_machine.get("host", "") if _default_machine else ""
    target_host = _default_host if _default_host else None
```

**Session check updated:** Only requires local tmux session when not routing remote.

**Display label updated:** Shows effective `target_host` instead of only `remote`.

---

### 3. `pipeline.py` — Remote-first routing in `oa loop`

**Import added:** `from ..config import get_default_machine`

**New parameter:** `--local` (bool, default False) on the `loop` command

**Routing logic:** Same pattern as `agents.py`, stored in `loop_target_host`.

**`--wait` logic updated:** Only waits for local agents (same as before, but now uses `loop_target_host` instead of `remote`).

Note: The `oa pipeline` command delegates entirely to `run_pipeline()` (internal module) and does not contain direct spawn calls — not modified.

---

### 4. `DECISIONS.md` — D-061 documented

Added to the Genomen Beslissingen table.

---

## Behavior Matrix

| Command | Flag | machines.json default | Result |
|---------|------|-----------------------|--------|
| `oa run "task"` | — | `hetzner` (host=hetzner) | → Hetzner |
| `oa run "task" --local` | `--local` | any | → Local |
| `oa run "task" --remote other` | `--remote other` | any | → `other` |
| `oa run "task"` | — | `local` (host="") | → Local (fallback) |
| `oa run "task"` | — | no machines.json | → Local (fallback) |
| `oa loop "task"` | — | `hetzner` | → Hetzner |
| `oa loop "task" --local` | `--local` | any | → Local |

---

## Backward Compatibility

- `--remote <host>` still works as an explicit override
- If `machines.json` doesn't exist or has no default with a host: falls back to local silently
- Default `machines.json` in `config.py` has `local` machine with `is_default: True` — so out-of-the-box behavior without a custom `machines.json` remains local
