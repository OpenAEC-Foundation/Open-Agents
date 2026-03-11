"""Context Window Tracking — heuristic token usage estimation per agent (Issue #16)."""

from __future__ import annotations

import json
import shlex
import subprocess
import time
from pathlib import Path

from .state import AgentRecord, list_agents

CONTEXT_LOG_DIR = Path.home() / ".oa" / "context-log"
CONTEXT_WINDOW_TOKENS = 200_000  # Claude's context window
THRESHOLDS = {"green": 0.50, "yellow": 0.75, "red": 0.90}

# Snapshot history kept in-memory per agent for trend detection
_snapshots: dict[str, list[int]] = {}


def _get_session_name() -> str:
    from .tmux import SESSION_NAME
    return SESSION_NAME


def estimate_tokens_from_tmux(agent_name: str, tmux_window: str | None = None) -> int:
    """Estimate tokens used via tmux scrollback buffer char count / 4.

    Captures the full scrollback pane content and divides character count by 4
    as a rough token estimate (standard heuristic: ~4 chars/token for English text).

    Returns 0 if the tmux window is not found or capture fails.
    """
    if tmux_window is None:
        agents = {r.name: r for r in list_agents()}
        rec = agents.get(agent_name)
        if rec is None:
            return 0
        tmux_window = rec.tmux_window

    session = _get_session_name()
    target = f"{session}:{shlex.quote(tmux_window)}"

    try:
        result = subprocess.run(
            ["tmux", "capture-pane", "-t", target, "-p", "-S", "-"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode != 0:
            return 0
        char_count = len(result.stdout)
        return char_count // 4
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return 0


def _health_label(pct: float) -> str:
    """Return health label (green/yellow/red) based on usage percentage."""
    if pct >= THRESHOLDS["red"]:
        return "red"
    if pct >= THRESHOLDS["yellow"]:
        return "yellow"
    return "green"


def _trend(agent_name: str, tokens: int) -> str:
    """Return trend symbol based on recent snapshots: ↑ up, → stable, ↓ down."""
    history = _snapshots.get(agent_name, [])
    history.append(tokens)
    # Keep last 5 snapshots for trend
    _snapshots[agent_name] = history[-5:]

    if len(history) < 2:
        return "→"
    delta = tokens - history[-2]
    if delta > 1000:
        return "↑"
    if delta < -1000:
        return "↓"
    return "→"


def get_context_status(agent_name: str, tmux_window: str | None = None) -> dict:
    """Return context status dict for one agent.

    Keys: agent, tokens, pct, health (green/yellow/red), trend, timestamp
    """
    tokens = estimate_tokens_from_tmux(agent_name, tmux_window)
    pct = min(tokens / CONTEXT_WINDOW_TOKENS, 1.0)
    health = _health_label(pct)
    trend = _trend(agent_name, tokens)
    snapshot = {
        "agent": agent_name,
        "tokens": tokens,
        "pct": round(pct * 100, 1),
        "health": health,
        "trend": trend,
        "timestamp": time.time(),
    }
    log_context_snapshot(agent_name, tokens)
    return snapshot


def log_context_snapshot(agent_name: str, tokens: int) -> None:
    """Append a snapshot entry to ~/.oa/context-log/{agent_name}.jsonl (append-only)."""
    CONTEXT_LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = CONTEXT_LOG_DIR / f"{agent_name}.jsonl"
    entry = {
        "timestamp": time.time(),
        "tokens": tokens,
        "pct": round(min(tokens / CONTEXT_WINDOW_TOKENS, 1.0) * 100, 1),
    }
    with open(log_file, "a") as f:
        f.write(json.dumps(entry) + "\n")


def get_all_contexts() -> list[dict]:
    """Return context status for all running agents."""
    running = [r for r in list_agents() if r.status == "running"]
    return [get_context_status(r.name, r.tmux_window) for r in running]


HEALTH_ICONS = {
    "green": "🟢",
    "yellow": "🟡",
    "red": "🔴",
}
