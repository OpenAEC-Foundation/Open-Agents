# Platform Research — Session Persistence

> **Status**: Complete
> **Date**: 2026-03-11
> **Questions covered**: Q1 (tmux client-detached hook on Windows), Q4 (desktop notifications from WSL), Q6 (fcntl file locking on Windows)
> **Source**: Web research + direct code inspection of `oa-cli/src/open_agents/state.py`

---

## Q1: tmux `client-detached` Hook on Windows

### Context

The session persistence plan (section 3.2) relies on `tmux set-hook client-detached` to trigger an automatic state snapshot when the user closes their terminal window. Before investing engineering effort here, we need to know whether this hook actually fires under the Windows execution environments oa-cli users are likely to run.

---

### Q1.1 — Does it work in WSL2?

**Answer**: Yes, with a critical caveat. The hook fires on a clean detach (Ctrl+b d, or closing the WSL2 window gracefully). It does NOT fire when the process is killed by a signal (SIGHUP/SIGTERM), which is what happens when Windows Terminal closes abruptly.

**Evidence**:
- tmux issue #1174: "When a tmux process dies via signal, close/detach hooks don't run." This is documented upstream behavior, not a WSL2-specific bug.
- tmux in WSL2 runs inside the Linux kernel layer. The hook system is a tmux-internal mechanism and is agnostic to the host OS — it works the same as on native Linux.
- WSL2 background task support (since Windows Insiders Build 17046) allows tmux sessions to continue running after the last console window is closed, which means the tmux server survives even if the hook does not fire.

**Test commands (run inside WSL2)**:
```bash
# Step 1: Register the hook
tmux set-hook -g client-detached 'run-shell "echo $(date) >> /tmp/hook-test.log"'

# Step 2: List hooks to verify registration
tmux show-hooks -g | grep client-detached

# Step 3: Detach cleanly (should trigger hook)
# Press Ctrl+b d, then check:
cat /tmp/hook-test.log

# Step 4: Close Windows Terminal window (kills via signal)
# Reattach: tmux attach
# Check: if /tmp/hook-test.log has NO new entry, the hook did NOT fire
cat /tmp/hook-test.log
```

**Key distinction**: Closing the Windows Terminal tab sends a HUP signal to the WSL2 process. This terminates the tmux client without a clean detach event. The tmux server continues running (background task support), but `client-detached` did not fire.

**Recommendation**: Do not rely on `client-detached` alone for crash/close safety. Use it as a supplement to periodic checkpoints. The hook is reliable for intentional detaches but unreliable for window-close events on Windows.

**Risk**: The primary "onbewust sluiten" use case (user clicks the X) may silently bypass the hook entirely on Windows Terminal + WSL2. The session persistence plan's section 3.2 assumes the hook fires; this assumption is incorrect for window-close events.

---

### Q1.2 — Does it work in Git Bash (MSYS2)?

**Answer**: Functional but not recommended. tmux is not included in Git for Windows by default and must be manually installed from MSYS2. Even after installation, support is experimental and rendering issues are common.

**Evidence**:
- tmux must be manually installed in Git Bash by copying binaries from MSYS2 (docs at dev.to/timothydjones). There is no official package.
- Known issues with `tmux` in Git Bash: terminal jamming, rendering artifacts, and inconsistent behavior with MinTTY (the default terminal in Git Bash).
- MSYS2 issue #2045: Reports of tmux installation and session management problems on Windows Server 2016.
- The `client-detached` hook behavior in this environment is not documented. Given the instability of tmux in MSYS2/Git Bash, it should be considered untested and unsupported.

**Test commands (MSYS2 only, not Git Bash)**:
```bash
# Only if tmux is installed via: pacman -S tmux
tmux new-session -d -s test
tmux set-hook -t test client-detached 'run-shell "echo fired >> /tmp/hook.log"'
tmux show-hooks -t test
```

**Recommendation**: Do not design for Git Bash tmux support. WSL2 is the supported and tested path. Document this explicitly in the oa-cli README.

**Risk**: Low impact — users who run oa-cli in Git Bash are edge cases. WSL2 is the primary supported environment per the project setup.

---

### Q1.3 — What happens when Windows Terminal closes?

**Answer**: Windows Terminal sends SIGHUP to all child processes in the terminal. This causes the tmux client to exit without a clean detach. The tmux server (with all sessions) survives due to WSL2 background task support — but the `client-detached` hook does not fire.

**Distinction from ConPTY vs classic console**:
- **Classic console (conhost.exe)**: Used by cmd.exe, older Windows. Closing sends SIGTERM directly.
- **ConPTY**: The modern pseudoconsole used by Windows Terminal, VS Code terminal, and newer tooling. It wraps the VT100-style terminal with a Windows API translation layer. ConPTY uses SIGHUP semantics when the connection is dropped.
- The practical difference for our use case: both result in a signal-based kill, not a clean tmux detach. The `client-detached` hook does not fire in either case.
- ConPTY introduces additional rendering issues (reported in microsoft/terminal#6987 and alacritty#7792) but these are irrelevant to hook behavior.

**Recommendation**: Treat the "window closed" event as a hard disconnect. Rely on periodic checkpoints (section 3.3 of the masterplan) as the primary safety net for this scenario. The `client-detached` hook should only be counted on for explicit `Ctrl+b d` detaches.

---

## Q4: Desktop Notifications from tmux/WSL on Windows

### Context

Section 6, item E1–E2 of the masterplan proposes desktop notifications to alert the user when all agents are done, triggered from inside the tmux session. This requires sending a Windows notification from a WSL2 bash script.

---

### Q4.1 — Can WSL2 trigger Windows toast notifications?

**Answer**: Yes. WSL2 can call `powershell.exe` directly because Windows executables are accessible from WSL2 via the interop layer. This allows calling PowerShell cmdlets that create Windows toast notifications.

**Evidence**:
- `powershell.exe` is in the PATH of WSL2 by default (located at `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`).
- Multiple production tools exploit this: `cctoast-wsl` (github.com/claudes-world/cctoast-wsl), `wsl-notify-send` (github.com/stuartleeks/wsl-notify-send), and manual BurntToast implementations.

**Test command**:
```bash
# From inside WSL2 bash:
powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Test from WSL')"
```

---

### Q4.2 — PowerShell `New-BurntToastNotification` from WSL

**Answer**: Works reliably. The pattern is: install BurntToast module in Windows PowerShell once, then call it from WSL bash via `powershell.exe`.

**Evidence**:
- BurntToast v1.1.0 is available on PowerShell Gallery (powershellgallery.com/packages/BurntToast/1.1.0).
- `cctoast-wsl` (github.com/claudes-world/cctoast-wsl) is a production tool that does exactly this for Claude Code hooks. It requires no admin privileges and installs in under 30 seconds.
- Requires one-time execution policy change: `powershell.exe -Command "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned"`

**Concrete implementation**:
```bash
# One-time setup (Windows PowerShell):
powershell.exe -Command "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned"
powershell.exe -Command "Install-Module BurntToast -Scope CurrentUser -Force"

# Notification script (save as ~/.oa/notify.sh):
#!/usr/bin/env bash
TITLE="${1:-oa-cli}"
MESSAGE="${2:-All agents done}"
powershell.exe -Command "New-BurntToastNotification -Text '$TITLE', '$MESSAGE'"

# Usage from tmux hook or background monitor:
bash ~/.oa/notify.sh "oa-cli" "All agents finished"
```

**Risk**:
- Requires BurntToast module installation (user must consent once).
- Single quotes in the message text can break the PowerShell command — escape or use double-quoted heredoc.
- Will not work if WSL interop is disabled (`/etc/wsl.conf` with `[interop] enabled=false`).

---

### Q4.3 — `wsl-notify-send` and alternatives

**Answer**: `wsl-notify-send` (github.com/stuartleeks/wsl-notify-send) is a compiled Go binary that acts as a drop-in replacement for `notify-send` on WSL. It calls the Windows notification API directly. It is reliable but requires distributing an additional binary.

**Alternatives summary**:

| Tool | Mechanism | Requires | Reliability |
|------|-----------|----------|-------------|
| `wsl-notify-send` | Go binary, Windows API | Pre-installed binary | High |
| `powershell.exe + BurntToast` | PowerShell module | Module install | High |
| `WSLNotify` (github.com/tfpf/WSLNotify) | C binary, Windows API | Pre-installed binary | High |
| `notify-send` (native Linux) | D-Bus notifications | systemd + display server | Not applicable on headless WSL |

**Recommendation**: Use `powershell.exe + BurntToast` as the primary approach. It requires no additional binary distribution, and `powershell.exe` is always available on Windows with WSL2. Implement as an optional feature (configurable in `~/.oa/config.json` via `notify_desktop: true`). Fall back silently if PowerShell is unavailable.

**Cross-platform strategy**:
```python
import shutil, subprocess, sys

def send_notification(title: str, message: str) -> None:
    """Send desktop notification, cross-platform best-effort."""
    if sys.platform == "linux":
        # WSL2: call Windows PowerShell
        ps = shutil.which("powershell.exe")
        if ps:
            subprocess.Popen([
                ps, "-Command",
                f"New-BurntToastNotification -Text '{title}', '{message}'"
            ])
            return
        # Native Linux: try notify-send
        ns = shutil.which("notify-send")
        if ns:
            subprocess.Popen([ns, title, message])
    elif sys.platform == "win32":
        # Native Windows (if oa-cli ever runs there directly)
        subprocess.Popen([
            "powershell.exe", "-Command",
            f"New-BurntToastNotification -Text '{title}', '{message}'"
        ])
    # else: silently skip (no notification support)
```

**Risk**: `notify-send` on native Linux requires a running display server (X11 or Wayland) and D-Bus. This is unavailable in headless WSL2 (without WSLg). WSLg (WSL GUI) is available on Windows 11 and enables a display server, but should not be assumed.

---

## Q6: `fcntl` File Locking on Windows

### Context

`state.py` (line 5) imports `fcntl` at module level. Line 127 uses `fcntl.flock(f, fcntl.LOCK_SH)` for shared read locks, and line 131 releases with `fcntl.LOCK_UN`. The `save_agents()` function uses atomic rename (temp file + `Path.replace()`) for writes — this is already correct for concurrency but still imports `fcntl` unconditionally.

---

### Q6.1 — fcntl in WSL2

**Answer**: Works correctly. WSL2 runs a real Linux kernel, so `fcntl` is fully supported including `flock()`. No issues.

---

### Q6.2 — fcntl on native Windows Python

**Answer**: Hard failure. `import fcntl` raises `ModuleNotFoundError: No module named 'fcntl'` immediately on native Windows Python. This is not a version or configuration issue — `fcntl` is a POSIX-only module deliberately excluded from CPython's Windows build.

**Evidence**:
- OpenHands-CLI issue #86: "Windows 10 (native) CLI launch fails with ModuleNotFoundError: No module named 'fcntl'" — confirmed hard blocker.
- Netflix Metaflow issue #10: Same error, confirmed as a hard incompatibility.
- Python docs explicitly state `fcntl` is Unix-only.
- The current `state.py` has `import fcntl` at line 5 (top-level, unconditional). This means the entire `state` module fails to import on native Windows — crashing `oa` at startup before any command runs.

---

### Q6.3 — msvcrt.locking() as Windows alternative

**Answer**: Available but limited. `msvcrt.locking()` provides byte-range locking (not whole-file locking). The API differs significantly from `fcntl.flock()`.

**Key differences**:
```python
# fcntl (Linux/WSL2)
import fcntl
with open(path, 'r') as f:
    fcntl.flock(f, fcntl.LOCK_SH)   # whole-file shared lock
    data = json.load(f)
    fcntl.flock(f, fcntl.LOCK_UN)

# msvcrt (Windows native)
import msvcrt
with open(path, 'r') as f:
    size = os.path.getsize(path)
    msvcrt.locking(f.fileno(), msvcrt.LK_LOCK, size)  # byte-range, requires size
    data = json.load(f)
    msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, size)
```

The `msvcrt` approach requires knowing the file size in advance and uses a different locking model. It is more complex and error-prone to use directly.

---

### Q6.4 — portalocker as cross-platform solution

**Answer**: This is the correct fix. `portalocker` is a mature, widely-used library that wraps `fcntl.flock()` on POSIX and `win32file` / `msvcrt` on Windows behind a single, identical API.

**Installation**: `pip install portalocker`

**Migration from current state.py**:
```python
# BEFORE (fcntl, Unix only):
import fcntl
with open(STATE_FILE, "r") as f:
    fcntl.flock(f, fcntl.LOCK_SH)
    try:
        raw = json.load(f)
    finally:
        fcntl.flock(f, fcntl.LOCK_UN)

# AFTER (portalocker, cross-platform):
import portalocker
with portalocker.Lock(STATE_FILE, mode="r", flags=portalocker.LOCK_SH) as f:
    raw = json.load(f)
```

The migration is a direct drop-in: remove the `import fcntl` line, replace with `import portalocker`, and update the `with` block. The `save_agents()` function already uses atomic rename (no explicit fcntl call there) so it requires no changes.

**portalocker features relevant to oa-cli**:
- Supports `LOCK_SH` (shared/read) and `LOCK_EX` (exclusive/write), matching current fcntl usage.
- Supports timeout parameter — useful for detecting deadlocks.
- Context manager API — cleaner than explicit lock/unlock.
- Active maintenance, 3.2.x current version.

---

### Q6.5 — Is this a blocker or nice-to-have?

**Answer**: Blocker for native Windows Python support; nice-to-have for WSL2-only users.

**Current impact matrix**:

| Environment | Impact |
|-------------|--------|
| WSL2 (primary oa-cli target) | None — fcntl works, no user impact today |
| Native Windows Python (e.g., `pip install oa-cli` on Windows) | Hard crash at `oa` startup — entire CLI unusable |
| Git Bash with Python | Hard crash — Git Bash uses Windows Python by default |
| macOS | None — fcntl works |
| Native Linux | None — fcntl works |

**Recommendation**: Fix now, not later. The migration is 3 lines of code change (remove `import fcntl`, add `import portalocker`, update the `with` block in `load_agents()`). The risk of not fixing is that any user who tries `pip install oa-cli` on Windows and runs `oa status` gets an immediate crash with a cryptic error message. Adding `portalocker` to `pyproject.toml` dependencies is the correct path.

**Risk of fixing**: Near zero. portalocker is a well-maintained library with no breaking changes in its core locking API. The atomic rename pattern in `save_agents()` (already present) is the correct write strategy regardless of platform.

---

## Summary Table

| Question | Verdict | Action |
|----------|---------|--------|
| Q1: tmux `client-detached` in WSL2 | Works for clean detach; does NOT fire on window-close (SIGHUP) | Use periodic checkpoints as primary, hook as supplement |
| Q1: tmux `client-detached` in Git Bash | Untested, unstable | Do not support; document WSL2 as required |
| Q1: Windows Terminal close behavior | SIGHUP-based kill, hook does not fire | Rely on checkpoint daemon, not the hook |
| Q4: WSL2 → Windows toast via PowerShell | Works reliably via `powershell.exe + BurntToast` | Implement as optional, configurable feature |
| Q4: `wsl-notify-send` | Works, but requires binary distribution | Use BurntToast approach instead |
| Q4: `notify-send` on native Linux | Requires display server, not applicable to headless WSL2 | Not suitable for default implementation |
| Q6: fcntl in WSL2 | Works, no issue | No change needed for WSL2 users |
| Q6: fcntl on native Windows | Hard crash, blocker | Replace with `portalocker` — 3-line change |

---

## Sources

- [tmux man page — hooks section](https://man7.org/linux/man-pages/man1/tmux.1.html)
- [tmux issue #1174 — hooks don't run when process dies via signal](https://github.com/tmux/tmux/issues/1174)
- [tmux issue #4403 — server shutdown hook](https://github.com/tmux/tmux/issues/4403)
- [Microsoft — Background Task Support in WSL](https://devblogs.microsoft.com/commandline/background-task-support-in-wsl/)
- [microsoft/terminal issue #6987 — ConPTY rendering in tmux](https://github.com/microsoft/terminal/issues/6987)
- [cctoast-wsl — Windows toast notifications from WSL for Claude Code](https://github.com/claudes-world/cctoast-wsl)
- [BurntToast — PowerShell Gallery](https://www.powershellgallery.com/packages/BurntToast/1.1.0)
- [BurntToast — GitHub](https://github.com/Windos/BurntToast)
- [wsl-notify-send — WSL replacement for notify-send](https://github.com/stuartleeks/wsl-notify-send)
- [WSLNotify — Native Windows notifications from WSL](https://github.com/tfpf/WSLNotify)
- [portalocker — PyPI](https://pypi.org/project/portalocker/)
- [portalocker — GitHub (wolph/portalocker)](https://github.com/wolph/portalocker)
- [OpenHands-CLI issue #86 — fcntl ModuleNotFoundError on Windows](https://github.com/OpenHands/OpenHands-CLI/issues/86)
- [Netflix Metaflow issue #10 — fcntl on Windows](https://github.com/Netflix/metaflow/issues/10)
- [tmux on MSYS2/Git Bash — dev.to guide](https://dev.to/timothydjones/install-tmux-on-git-for-windows-1cf2)
- [MSYS2 tmux issue #2045](https://github.com/msys2/MSYS2-packages/issues/2045)
