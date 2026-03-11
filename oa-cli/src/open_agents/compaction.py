"""Auto-Compaction — monitors agents and triggers /compact when context exceeds threshold (Issue #20).

This module provides a background daemon that periodically checks all running agents'
context window usage and sends /compact via tmux when the threshold is exceeded.
"""

from __future__ import annotations

import json
import subprocess
import threading
import time
from pathlib import Path

from .context_tracker import (
    CONTEXT_LOG_DIR,
    get_context_status,
    should_compact,
    trigger_compaction,
)
from .state import list_agents

# Default polling interval in seconds
DEFAULT_POLL_INTERVAL = 30

# Compaction event log
COMPACTION_LOG = Path.home() / ".oa" / "compaction-log.jsonl"


def _log_compaction_event(agent_name: str, pct: float, tokens: int, action: str) -> None:
    """Append a compaction event to the global compaction log."""
    COMPACTION_LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": time.time(),
        "agent": agent_name,
        "pct": round(pct, 1),
        "tokens": tokens,
        "action": action,
    }
    with open(COMPACTION_LOG, "a") as f:
        f.write(json.dumps(entry) + "\n")


def check_and_compact_all(dry_run: bool = False) -> list[dict]:
    """Check all running agents and compact those above threshold.

    Returns list of dicts with compaction results per agent.
    """
    results = []
    running = [r for r in list_agents() if r.status == "running"]

    for rec in running:
        ctx = get_context_status(rec.name, rec.tmux_window)
        pct = ctx["pct"]
        tokens = ctx["tokens"]

        if should_compact(rec.name, pct):
            if dry_run:
                results.append({
                    "agent": rec.name,
                    "pct": pct,
                    "tokens": tokens,
                    "action": "would_compact",
                })
            else:
                trigger_compaction(rec.name, rec.tmux_window)
                _log_compaction_event(rec.name, pct, tokens, "compacted")
                results.append({
                    "agent": rec.name,
                    "pct": pct,
                    "tokens": tokens,
                    "action": "compacted",
                })
        else:
            results.append({
                "agent": rec.name,
                "pct": pct,
                "tokens": tokens,
                "action": "ok",
            })

    return results


class CompactionDaemon:
    """Background thread that periodically checks agent context and triggers compaction."""

    def __init__(self, interval: int = DEFAULT_POLL_INTERVAL):
        self.interval = interval
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        """Start the compaction daemon in a background thread."""
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run_loop,
            name="compaction-daemon",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        """Signal the daemon to stop and wait for it."""
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
            self._thread = None

    @property
    def running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def _run_loop(self) -> None:
        """Main loop: poll running agents and compact if needed."""
        while not self._stop_event.is_set():
            try:
                results = check_and_compact_all()
                compacted = [r for r in results if r["action"] == "compacted"]
                if compacted:
                    _log_compaction_event(
                        "daemon",
                        0,
                        0,
                        f"cycle_compacted_{len(compacted)}_agents",
                    )
            except Exception:
                # Don't crash the daemon on transient errors
                pass
            self._stop_event.wait(self.interval)


# Module-level singleton
_daemon: CompactionDaemon | None = None


def start_daemon(interval: int = DEFAULT_POLL_INTERVAL) -> CompactionDaemon:
    """Start the global compaction daemon (singleton)."""
    global _daemon
    if _daemon is None or not _daemon.running:
        _daemon = CompactionDaemon(interval=interval)
        _daemon.start()
    return _daemon


def stop_daemon() -> None:
    """Stop the global compaction daemon if running."""
    global _daemon
    if _daemon is not None:
        _daemon.stop()
        _daemon = None


def get_compaction_history(limit: int = 50) -> list[dict]:
    """Read recent compaction events from the log file."""
    if not COMPACTION_LOG.exists():
        return []
    lines = COMPACTION_LOG.read_text().strip().split("\n")
    events = []
    for line in lines[-limit:]:
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return events
