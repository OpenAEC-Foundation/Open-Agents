# Sprint 26 — CLI Infrastructure Research Report

## Summary (4 Recommendations)

| # | Category | Recommendation |
|---|----------|----------------|
| 1 | **tmux bindings** | Keep current subprocess approach; conditionally adopt `libtmux` only if API coverage gaps appear |
| 2 | **File watching** | Keep polling; optionally add `inotifywait` subprocess for `oa watch` latency improvement |
| 3 | **Process monitoring** | Add `psutil` as optional supplement for richer diagnostics, not as replacement |
| 4 | **Async model** | Keep synchronous; tmux handles real parallelism — asyncio brings complexity without CLI benefit |

---

## 1. tmux Bindings

**Current approach:** All tmux interaction goes through `subprocess.run(["tmux"] + shlex.split(args))` via two helpers in `tmux.py` lines 14–24.

```python
# tmux.py:14-18
def _run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=check)

# tmux.py:21-24
def _tmux(args: str, check: bool = True) -> subprocess.CompletedProcess:
    return _run(["tmux"] + shlex.split(args), check=check)
```

Used for: session management, window creation, send-keys, list-windows, capture-pane, hooks.

| Aspect | Current subprocess | libtmux |
|--------|-------------------|---------|
| **Error handling** | CalledProcessError on non-zero exit; `check=False` used where needed | Raises custom exceptions; slightly more descriptive but needs mapping |
| **API richness** | Full tmux CLI coverage; anything tmux supports works | Wraps common operations; some advanced commands (hooks, send-keys with quoting) still use subprocess internally |
| **Maintenance burden** | Low — one `_tmux()` helper is the only entry point | Medium — libtmux versions may lag behind tmux CLI; API changes require updates |
| **Dependency weight** | Zero extra deps | ~15 KB pure Python package; no binary deps |
| **WSL2 compatibility** | Proven — runs same tmux binary | Same binary, but WSL2 socket path quirks could surface |
| **Breaking changes** | None — baseline | Would require rewriting all `_tmux()` call sites |

**Recommendation:** Keep current subprocess approach. The single `_tmux()` wrapper is already clean and safe (uses argument lists, not `shell=True`). libtmux adds a dependency without providing meaningful new capabilities for oa-cli's usage pattern. If tmux API coverage gaps emerge (e.g., complex pane layouts), evaluate libtmux at that point.

---

## 2. File Watching

**Current approach:** Polling via `workspace_is_done()` which checks for existence of a `.done` file.

```python
# workspace.py:323-325
def workspace_is_done(workspace: str | Path) -> bool:
    return (Path(workspace) / ".done").exists()
```

This is called from `check_agent()` in `lifecycle.py:45`, which is triggered on-demand from `monitor.py:110-113` (during `print_status()`) and from `session_guardian.py`. There is no background polling loop in the main process — status refreshes are demand-driven.

| Aspect | Current polling | watchdog (inotify) | inotifywait subprocess |
|--------|----------------|-------------------|----------------------|
| **Latency** | Refresh interval (~3s via `watch` in dashboard, or on-demand) | Near-instant (kernel event) | Near-instant (kernel event) |
| **CPU usage** | Near-zero (stat call on demand only) | Near-zero (event-driven) | Near-zero, but one subprocess per watch target |
| **WSL2 support** | Full — stat works anywhere | Partial — inotify works in WSL2 for local files, but cross-fs (Windows paths via /mnt/c) unreliable | Same limitation as watchdog |
| **Implementation complexity** | Already in place | Requires callback threading, cleanup, error handling | Simple: one `inotifywait -e close_write` call per agent |
| **Cross-platform** | Universal | Linux/macOS only | Linux only (`inotify-tools` package) |

**Recommendation:** Keep polling. The current model is demand-driven (not a hot-loop), so CPU overhead is negligible. The 3-second dashboard refresh via `watch` is acceptable for interactive use. For `oa watch <name>` live tail, optionally add `inotifywait` subprocess for faster `.done` detection on Linux — but as an enhancement, not a replacement. Do not use `watchdog` library: WSL2 cross-fs paths (/mnt/c/) have unreliable inotify support.

---

## 3. Process Monitoring

**Current approach:** Agent liveness is determined by checking if the tmux window name still exists.

```python
# lifecycle.py:74-102
result = _tmux(f"list-windows -t {SESSION_NAME} -F '#{{window_name}}'", check=False)
windows = result.stdout.strip().split("\n")
if rec.tmux_window not in windows:
    update_agent(name, status="error", ...)
```

Guardian liveness also uses tmux window check (`tmux.py:67-75`).

| Aspect | Current tmux window check | psutil | /proc filesystem |
|--------|--------------------------|--------|-----------------|
| **Reliability** | High for tmux-launched agents; misses external kills where window survives | High — checks actual process, not container | High on Linux only |
| **Resource info** | None (no CPU/mem stats) | Full: CPU %, memory, open files, threads | Raw: must parse manually |
| **Cross-platform** | Tied to tmux | Python 3, all platforms | Linux only |
| **Dependency weight** | Zero | ~200 KB compiled extension | Zero |
| **Implementation effort** | Already in place | Would require PID tracking from spawn | Medium — parse /proc/PID/status |
| **WSL2 compatibility** | Proven | Proven in WSL2 | Proven |

**Recommendation:** Keep tmux-based check as primary. Optionally add `psutil` as an opt-in diagnostic layer (e.g., for `oa status --verbose` to show CPU/memory per agent). This requires storing the agent PID at spawn time. Do not replace tmux checks — they correctly model the agent lifecycle (tmux window = agent scope). The `/proc` approach is too low-level for the value it provides.

---

## 4. Async Model

**Current approach:** oa-cli is fully synchronous Python. Parallelism comes from tmux — each agent runs in its own tmux window as an independent process. The CLI itself issues commands, records state, and returns.

Key evidence:
- `spawner.py:195-218`: creates tmux window, writes script, sends keys — all synchronous
- `monitor.py:107-115`: iterates agents, calls `check_agent()` for each — sequential loop
- No `asyncio`, `threading`, or `concurrent.futures` anywhere in the codebase

| Aspect | Current (sync + tmux) | asyncio event loop | threading |
|--------|----------------------|-------------------|-----------|
| **Parallelism model** | tmux processes (OS-level) | Single-thread cooperative | OS threads |
| **Code complexity** | Low — straightforward sequential flow | High — async/await propagates everywhere | Medium — lock management, race conditions |
| **Debugging** | Trivial — no async stack traces | Hard — async tracebacks, task cancellation | Medium — thread-safety bugs |
| **tmux integration** | Native fit — subprocess calls are blocking I/O | subprocess in asyncio requires `asyncio.create_subprocess_exec` | subprocess calls work but need thread pools |
| **CLI startup overhead** | Minimal | Small asyncio event loop startup cost | Negligible |
| **Real benefit for CLI** | Baseline | Low — agents already parallel via tmux | Low |

**Recommendation:** Keep synchronous. For a CLI tool where the actual work happens in tmux subprocesses, asyncio brings complexity with no user-visible benefit. The O(n) `check_agent` loop in `monitor.py:110-113` is the only potential bottleneck — at scale (50+ agents) a brief sequential check is still faster than asyncio overhead. If true async I/O is ever needed (e.g., WebSocket-based dashboard), introduce asyncio only in that specific module via `asyncio.run()` isolation.

---

## Module Inventory

Full module count: 64 `.py` files in `open_agents/`. Notable modules beyond the 6 analyzed:

- `lifecycle.py` — agent status FSM, .done polling, tmux window checks
- `session_guardian.py` — heartbeat loop, crash recovery
- `context_tracker.py` — context window monitoring via tmux capture-pane
- `messaging.py` — inter-agent DM via JSON files
- `teams.py` — team grouping
- `telemetry.py` — run metrics
- `checkpoint.py` — crash recovery state
- `pipeline.py` — planner → workers → combiner workflow
- `docker_runtime.py` — Docker-based agent execution (alternative to tmux)
