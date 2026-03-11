"""Context Decay Monitor — periodic context health checks per agent (Issue #35)."""

from __future__ import annotations

import threading
import time
from typing import Any

from .context_tracker import get_context_status, THRESHOLDS

# Active monitor threads keyed by agent name
_monitors: dict[str, threading.Thread] = {}
_stop_events: dict[str, threading.Event] = {}

# Latest status snapshots per agent
_latest: dict[str, dict[str, Any]] = {}

CHECK_INTERVAL_SECONDS = 30


def _recommendation(health: str) -> str:
    if health == "green":
        return "continue"
    if health == "yellow":
        return "consider_compact"
    return "compact_now"


def get_decay_status(agent_name: str) -> dict:
    """Return the latest context decay status for an agent.

    Returns: {tokens_used, pct, health, recommendation}
    If no snapshot exists yet, performs an immediate check.
    """
    if agent_name not in _latest:
        snapshot = get_context_status(agent_name)
        _latest[agent_name] = snapshot

    snapshot = _latest[agent_name]
    return {
        "tokens_used": snapshot.get("tokens", 0),
        "pct": snapshot.get("pct", 0.0),
        "health": snapshot.get("health", "green"),
        "recommendation": _recommendation(snapshot.get("health", "green")),
    }


def _monitor_loop(agent_name: str, stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        try:
            snapshot = get_context_status(agent_name)
            _latest[agent_name] = snapshot
        except Exception:
            pass
        stop_event.wait(CHECK_INTERVAL_SECONDS)


def monitor_agent(agent_name: str) -> None:
    """Start a background thread that periodically checks context for agent_name.

    Safe to call multiple times — idempotent for already-monitored agents.
    """
    if agent_name in _monitors and _monitors[agent_name].is_alive():
        return  # already monitoring

    stop = threading.Event()
    thread = threading.Thread(
        target=_monitor_loop,
        args=(agent_name, stop),
        daemon=True,
        name=f"ctx-decay-{agent_name}",
    )
    _stop_events[agent_name] = stop
    _monitors[agent_name] = thread
    thread.start()


def stop_monitor(agent_name: str) -> None:
    """Stop the background monitor for an agent."""
    if agent_name in _stop_events:
        _stop_events[agent_name].set()
        _monitors.pop(agent_name, None)
        _stop_events.pop(agent_name, None)
