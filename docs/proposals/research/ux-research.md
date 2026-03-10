# UX Research: Session Persistence for oa-cli

> **Status**: Final
> **Date**: 2026-03-11
> **Scope**: Q11 (interactive vs automatic resume), Q12 (config surface), competitive analysis, notification UX
> **Input**: SESSION-PERSISTENCE-MASTERPLAN-RAW.md

---

## Q11: Interactive vs Automatic Resume

### Recommendation: Option B — Automatic resume, `--fresh` to opt out

**Do not use Option A (interactive menu).** For a CLI-first developer tool, blocking the startup flow with a menu is wrong. Developers opening a terminal want to get to work immediately. Interrupting them with a prompt — especially first thing in the morning — adds friction at exactly the wrong moment.

**Option B is the right default**, with an informational banner added (borrowing from Option C). The banner must be non-blocking: it prints and scrolls away. The user does not have to do anything.

### What this looks like

```
$ oa start

  Session resumed: 2026-03-11 14:32 → 16:47 (2h 15m)
  Agents: 3 done · 1 still running · 1 failed
  Git:    2 uncommitted files  (run `oa stash-show` to review)
  Run `oa session` for full summary  ·  `oa start --fresh` to discard

  Starting tmux session...
```

The banner is printed, then `oa start` continues. No keypress required. The user can ignore it or act on it with a follow-up command.

### Why Option A fails for this tool

tmuxinator, screen, mosh, and VS Code all converge on the same principle: **resumption is the default, opting out is the action**.

| Tool | Default behavior | Opt-out |
|------|-----------------|---------|
| tmux | Re-attaches to running session | `tmux new-session` |
| tmuxinator | Starts configured session (creates if missing) | Kill and recreate |
| tmux-continuum | Restores last environment silently on `tmux` start | Disable plugin |
| Zellij | Attaches to existing session if name matches | `zellij --new-session` |
| VS Code | Reopens last workspace + files automatically | File → New Window |
| Gemini CLI | `gemini` resumes last session by default | `--new-session` flag |
| Claude Code | `claude --continue` resumes; plain `claude` starts fresh | (defaults to fresh) |

Claude Code is the only outlier, and it is worth noting: its user research likely shows that most users want a fresh context by default for their AI assistant. For `oa-cli`, the situation is different — the session is a workspace with agents that may still be running. Resume-first is the correct default.

### When to show the resume banner

Show the banner **only if a previous session record exists** and it was not cleanly closed (shutdown_mode is `detach` or `crash`). If the previous session had shutdown_mode `stop` (explicit `oa stop`), show a shorter one-line summary at most:

```
  Last session: 2026-03-10 — 5 agents completed  ·  `oa session` for details
```

---

## Q12: Configuration Surface

### Recommendation: 4 options exposed, 3 hidden with sensible defaults

The proposed 7-option config is one option too many for the default UX. Split it into two tiers:

**Tier 1 — Visible in `oa config` and docs (the 4 that matter):**

| Key | Default | What it does |
|-----|---------|-------------|
| `state_snapshot` | `true` | Save agent state on disconnect. Always on — not negotiable for crash recovery. |
| `notify_desktop` | `true` | Desktop notification when all agents finish. The "coffee break" notification. |
| `git_stash` | `false` | Auto-stash uncommitted work on disconnect. Off by default — too risky as default. |
| `retention_days` | `30` | How long session files are kept. |

**Tier 2 — In config file only, not surfaced in `oa config` output by default:**

| Key | Default | Reason hidden |
|-----|---------|--------------|
| `session_summary` | `false` | Requires AI call — opt-in only |
| `auto_doc_update` | `false` | Dangerous as default; documented but hidden |
| `cleanup_timeout_seconds` | `300` | Power user setting; 5 min is right for most |

**Periodic checkpoint** (`periodic_checkpoint_minutes: 5`) and `session_log_max_mb` (50) are top-level config, not under `on_disconnect`. Keep that separation.

### Defaults philosophy: "Useful out of the box, conservative with irreversible actions"

- `state_snapshot: true` — always safe, always useful
- `notify_desktop: true` — the primary value prop for background agents
- `git_stash: false` — stashing is irreversible without knowing what was there; must be opt-in
- `session_summary: false` — costs an AI call; opt-in only
- `auto_doc_update: false` — writing to ROADMAP/LESSONS automatically is a high-trust action; must be explicitly enabled

The principle: **actions that modify the repo or cost money are off by default**.

### Config interface: `oa config` CLI, no wizard

Do not build a `--wizard`. Wizards are appropriate for one-time setup flows (first run). Session persistence config is ongoing and will be adjusted repeatedly. A wizard creates more friction than it removes for a returning user.

The right interface:

```bash
oa config                           # show current config as table
oa config get on_disconnect.git_stash  # read single value
oa config set on_disconnect.git_stash true  # set single value
oa config reset                     # restore all defaults
```

This matches the interface pattern of git config, npm config, and cargo. Every experienced developer already knows this pattern. No documentation required.

One addition worth building: `oa config --all` to show the Tier 2 hidden options for power users who want to tune everything.

---

## Competitive Analysis: Session Persistence Patterns

### tmux-resurrect

**Pattern**: Manual save/restore via keybindings (`prefix + Ctrl-s` to save, `prefix + Ctrl-r` to restore).
**What works**: The save is explicit and the restore is explicit. Zero surprise. Zero data loss risk.
**What fails**: Requires user discipline. Most users forget to save before shutdown.
**Lesson for oa-cli**: Manual save is not viable as the primary mechanism. Use it as a fallback keybinding only (`oa session save`). Automatic is the primary path.

### tmux-continuum

**Pattern**: Automatic save every 15 minutes (configurable). Automatic restore on `tmux` start with one config line. Zero user interaction in normal operation.
**What works**: Truly invisible. The user never thinks about it. It just works.
**What fails**: No indication to the user that a restore happened. No diff between "fresh start" and "restored start". Can cause confusion.
**Lesson for oa-cli**: The automation model is right. The missing piece is the informational banner on restore — which oa-cli should add. Users need to know a restore happened without being forced to act.

### Zellij

**Pattern**: Sessions are always named and always persist as long as the server runs. Attaching to an existing session is the natural action; starting fresh requires explicitly naming a new session. Exited sessions keep their layout metadata for resurrection.
**What works**: Sessions as first-class citizens. The concept of "session" is visible and named, not hidden.
**What fails**: Can accumulate ghost sessions. Users need to actively manage session list.
**Lesson for oa-cli**: `oa session list` and `oa session clean` are valuable commands to build. Show session names and ages. Let users prune manually. Do not auto-delete recent sessions.

### VS Code

**Pattern**: Workspaces restore open files, editor layout, and terminal history automatically. Chat Checkpoints (added 2025) enable snapshot-based restore of AI chat state. Users can disable workspace restore with `--new-window`.
**What works**: The separation between workspace state (files, layout) and session state (AI chat) is clean. Each has its own persistence mechanism.
**What fails**: State accumulates invisibly. Users do not know what is being persisted until something unexpected happens.
**Lesson for oa-cli**: Consider a similar layered approach — agent state (fast, always-on) separate from session summary (slower, optional). The `chat.restoreLastPanelSession` setting pattern (simple boolean) is exactly the right granularity for user-facing config.

### Docker Desktop

**Pattern**: Containers survive daemon restart if `--restart` policy is set. Docker Desktop "Pause" freezes container memory state. Volumes persist across all container lifecycle events including removal.
**What works**: The separation between ephemeral (container layer) and persistent (volume) is explicit and documented. Users understand what survives what.
**What fails**: Default behavior (no restart policy) loses running state on daemon restart. Users get surprised.
**Lesson for oa-cli**: Make the persistence contract explicit in docs and on first run. "Agents survive terminal close. Agents do NOT survive `oa stop` unless you resume." One sentence. Print it once on first use.

### Gemini CLI

**Pattern**: Sessions save automatically in the background. `gemini` with no flags resumes the last session. `--new-session` starts fresh. Session list is browsable interactively.
**What works**: The default (resume) matches user intent most of the time. The escape hatch (`--new-session`) is explicit.
**What fails**: No indication of how many sessions are stored or their size.
**Lesson for oa-cli**: The `--fresh` flag name is better than `--new-session` for oa-cli's domain. It communicates the intent (wipe the slate) without implying that the previous session is gone.

### Screen (GNU)

**Pattern**: Sessions persist as long as the screen server runs. `screen -r` reattaches. No automatic save of session content — terminal scrollback is lost.
**What works**: Detach/reattach is the core mental model and it works perfectly.
**What fails**: No state capture. If the server restarts, everything is gone.
**Lesson for oa-cli**: tmux already solved this vs screen. The lesson is negative: do not rely only on "the process keeps running." Capture state explicitly.

---

## Notification UX

### When notifications are useful vs irritating

**Useful**: A notification is useful when the user is away and the task is complete. The canonical use case: you start 5 agents, close the laptop lid, make coffee. The notification fires when all agents are done. This is unambiguously valuable — it lets you return at the right moment without polling.

**Irritating**: A notification is irritating when it fires while the user is actively working, when it fires for events the user already knows about, or when it fires repeatedly for the same condition.

### Rules for oa-cli notifications

**Rule 1: Only notify on completion, never on progress.**
Do not notify when an agent starts, when an agent hits 50%, or when an agent errors mid-run. Notify only when all agents in the batch are done, or when a single long-running agent finishes. One event per session.

**Rule 2: Require user absence.**
Do not fire a desktop notification if the user is actively typing in the tmux session. Check for recent keystrokes or tmux client activity before firing. If the user is attached, print to the tmux status bar instead. Silent in foreground, loud in background.

**Rule 3: One notification per session.**
Even if multiple agents complete at different times, batch notifications. Fire one "session complete" notification rather than one per agent. The background monitor in the masterplan already supports this — implement it correctly: wait for all agents to finish, then notify once.

**Rule 4: Notification content follows the < 10 word rule.**
Lead with the value:
```
✓ oa-cli: 4 agents done, 1 failed — review needed
```
Not:
```
Your Open-Agents session has completed processing all scheduled agent tasks
```

**Rule 5: Silent mode via environment variable.**
Respect `OA_SILENT=1` to suppress all notifications. This integrates with focus mode apps (macOS Focus, Windows Focus Assist) without requiring oa-cli to detect OS-level focus state (which is fragile across WSL/Windows/Linux).

**Rule 6: Do not ask for notification permission in the UI.**
Request OS notification permission on first `notify_desktop: true` use, handle denial gracefully, and fall back to printing to terminal. Never re-ask after denial.

### Notification frequency guidance

For oa-cli's target user (developer running batch agent jobs):
- 0-2 notifications per session: good
- 3+: irritating, indicates the implementation fires too eagerly
- Aim for exactly 1 per session as the happy path

---

## Recommended UX Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER OPENS TERMINAL                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ oa start      │
                    └───────┬───────┘
                            │
              ┌─────────────▼──────────────┐
              │  Previous session exists?   │
              └──────┬──────────────┬───────┘
                     │ YES          │ NO
                     ▼             ▼
          ┌──────────────┐   ┌───────────────────┐
          │ Print banner │   │ Start fresh tmux  │
          │ (non-block)  │   │ session (silent)  │
          └──────┬───────┘   └───────────────────┘
                 │
    ┌────────────▼────────────────────────────────────┐
    │  Session resumed: 2026-03-11 14:32 (2h 15m)     │
    │  Agents: 3 done · 1 running · 1 failed           │
    │  `oa session` for details · `oa start --fresh`   │
    └────────────┬────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Attach tmux   │  ← user is now in session, agents running
         └───────┬───────┘
                 │
    ┌────────────▼──────────────────────────────────┐
    │              DURING SESSION                    │
    │                                                │
    │  Periodic checkpoint every 5 min (silent)      │
    │  Background monitor checks agent status        │
    └────────────┬──────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │ User closes    │──────────────────────────┐
         │ terminal       │                          │
         └───────┬────────┘                          │
                 │ (tmux client-detached)             │
                 ▼                                   │
    ┌────────────────────────┐                       │
    │ Instant snapshot:      │                       │
    │  · Agent state         │                       │
    │  · Git status          │                       │
    │  · Disconnect time     │                       │
    └────────────┬───────────┘                       │
                 │                                   │
    ┌────────────▼───────────┐                       │
    │ Agents keep running    │                       │
    │ Background monitor on  │                       │
    └────────────┬───────────┘                       │
                 │ All agents done                   │
                 ▼                                   │
    ┌────────────────────────┐                       │
    │ Desktop notification:  │                       │
    │ "oa-cli: 4 done, 1 ✗" │                       │
    └────────────────────────┘                       │
                                                     │
                 ┌───────────────────────────────────┘
                 │ User runs `oa stop` explicitly
                 ▼
    ┌────────────────────────────────────────────────┐
    │ Phase 1: Snapshot (instant)                    │
    │ Phase 2: Finish agents (max 5 min)             │
    │ Phase 3: Archive logs                          │
    │ Phase 4: Notify (if notify_desktop: true)      │
    │ Phase 5: Close tmux session                    │
    └────────────────────────────────────────────────┘
```

---

## Summary of Recommendations

| Question | Recommendation |
|----------|---------------|
| Interactive vs automatic? | **Automatic resume (Option B)** with non-blocking banner. No keypress required. |
| Opt-out mechanism? | `oa start --fresh` discards previous session state |
| How many config options? | **4 visible** (state_snapshot, notify_desktop, git_stash, retention_days), 3 hidden in file |
| Default philosophy? | **Conservative**: all non-destructive features on, all repo-modifying features off |
| Config interface? | **`oa config get/set`** — no wizard |
| When to notify? | **Only on completion, only when user is absent, once per session** |
| Silent mode? | **`OA_SILENT=1` env var** — no UI toggle needed |
| Session list management? | Build `oa session list` and `oa session clean` from day one |

---

*Sources used in this research:*
- [tmux-resurrect (GitHub)](https://github.com/tmux-plugins/tmux-resurrect)
- [tmux-continuum (GitHub)](https://github.com/tmux-plugins/tmux-continuum)
- [Zellij session management](https://zellij.dev/tutorials/session-management/)
- [Gemini CLI session management](https://developers.googleblog.com/pick-up-exactly-where-you-left-off-with-session-management-in-gemini-cli/)
- [VS Code workspace docs](https://code.visualstudio.com/docs/editor/workspaces)
- [VS Code December 2025 release notes](https://code.visualstudio.com/updates/v1_108)
- [Smashing Magazine: Notification UX Guidelines](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/)
- [CLI guidelines (clig.dev)](https://clig.dev/)
- [Docker Desktop pause docs](https://docs.docker.com/desktop/use-desktop/pause/)
