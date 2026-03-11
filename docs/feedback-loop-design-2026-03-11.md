# Feedback Loop System — Design Document

**Date:** 2026-03-11
**Author:** feedback-loop agent (claude/opus)
**Status:** Implemented

## Problem

Agents completed work without sending feedback to their spawner. The meta-orchestrator only knew an agent was done when manually running `oa collect`.

## Solution

A bidirectional communication system with 4 components:

### Component A: Parent Injection (workspace.py)

- Added `parent_name: str = "meta"` parameter to `create_workspace()`
- New `_feedback_loop_instructions()` function generates mandatory status update instructions
- Every agent's CLAUDE.md now includes a "Communicatie met je spawner" section with 5 lifecycle events:
  1. START — agent begins work
  2. MILESTONE — major step completed
  3. BLOKKADE — agent is blocked, needs input
  4. DONE — agent finished successfully
  5. FOUT — agent encountered an error
- Instructions use `oa send <parent>` for automatic message delivery

### Component B: Watch-Inbox Command (cli.py)

- New CLI command: `oa watch-inbox [name]` (default: "meta")
- Polls inbox every 2 seconds for new messages
- Color-coded output: green for success/start, red for errors/blocks
- Sends tmux display-message notifications for each new message
- `--no-follow` flag for one-shot check

### Component C: Notification System (notification.py)

- New module: `open_agents/notification.py`
- `notify_tmux(message, sender, session)` — sends tmux display-message popup (4 second duration)
- `start_notification_watcher(inbox_name)` — background daemon thread that polls and notifies
- Handles missing tmux gracefully (returns False)
- Pre-populates seen set to avoid notifying on old messages

### Component D: Parent Name Passthrough (spawner.py)

- `spawn_agent()` now derives `parent_name` from the `parent` parameter
- If `parent` is None → parent_name = "meta"
- If `parent` is set → parent_name = parent
- Passes `parent_name` to `create_workspace()`

### Bonus: Meta Inbox in Status

- `print_status()` in monitor.py now shows unread "meta" inbox messages at the top
- Displays up to 5 recent unread messages with sender and content

## Files Modified

| File | Change |
|------|--------|
| `workspace.py` | Added `_feedback_loop_instructions()`, `parent_name` param to `create_workspace()` |
| `spawner.py` | Derives `parent_name` from `parent`, passes to `create_workspace()` |
| `cli.py` | Added `watch-inbox` command |
| `monitor.py` | Added meta inbox unread display to `print_status()` |
| `notification.py` | **New file** — tmux notification system |
| `tests/test_feedback_loop.py` | **New file** — 9 tests covering all components |

## Tests

All 9 tests pass:
- `TestFeedbackLoopInstructions` (5 tests) — validates CLAUDE.md content
- `TestNotification` (4 tests) — validates tmux notification with mocks

## Usage

```bash
# Watch meta inbox for agent updates
oa watch-inbox

# Watch a specific agent's inbox
oa watch-inbox my-agent --no-follow

# Status now shows meta inbox unread messages
oa status
```

## Backward Compatibility

- `parent_name` defaults to "meta" — no breaking changes
- All existing `create_workspace()` calls work unchanged
- Existing CLAUDE.md sections (messaging, spawning, quality rules) preserved
