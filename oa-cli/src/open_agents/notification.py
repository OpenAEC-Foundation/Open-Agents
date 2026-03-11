"""Notification — tmux-based popup for incoming agent messages."""

from __future__ import annotations

import subprocess
import threading
import time
from typing import Optional

from .messaging import read_inbox, mark_read


def notify_tmux(message: str, sender: str, session: str = "oa") -> bool:
    """Send a tmux display-message popup to the active pane.

    Returns True if the tmux command succeeded, False otherwise.
    """
    # Truncate long messages for display
    display_msg = message[:120] + "..." if len(message) > 120 else message
    tmux_msg = f"\U0001f4ec {sender}: {display_msg}"
    try:
        subprocess.run(
            ["tmux", "display-message", "-t", session, "-d", "4000", tmux_msg],
            capture_output=True,
            timeout=5,
        )
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def _poll_and_notify(
    inbox_name: str,
    session: str,
    poll_interval: float,
    stop_event: threading.Event,
    seen_timestamps: set[float],
) -> None:
    """Background polling loop that checks for new messages and sends tmux notifications."""
    while not stop_event.is_set():
        try:
            messages = read_inbox(inbox_name, unread_only=True)
            for msg in messages:
                ts = msg.get("timestamp", 0)
                if ts not in seen_timestamps:
                    seen_timestamps.add(ts)
                    sender = msg.get("from", "unknown")
                    content = msg.get("content", "")
                    notify_tmux(content, sender, session=session)
        except Exception:
            pass  # Don't crash the background thread
        stop_event.wait(poll_interval)


def start_notification_watcher(
    inbox_name: str = "meta",
    session: str = "oa",
    poll_interval: float = 2.0,
) -> tuple[threading.Thread, threading.Event]:
    """Start a background thread that polls inbox and sends tmux notifications.

    Returns (thread, stop_event) so the caller can stop it via stop_event.set().
    """
    stop_event = threading.Event()
    seen: set[float] = set()

    # Pre-populate seen set with existing messages to avoid notifying on old ones
    try:
        existing = read_inbox(inbox_name, unread_only=False)
        for msg in existing:
            seen.add(msg.get("timestamp", 0))
    except Exception:
        pass

    thread = threading.Thread(
        target=_poll_and_notify,
        args=(inbox_name, session, poll_interval, stop_event, seen),
        daemon=True,
        name=f"oa-notifier-{inbox_name}",
    )
    thread.start()
    return thread, stop_event
