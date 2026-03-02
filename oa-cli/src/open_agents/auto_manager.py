"""AgentManager — background polling for agent status changes."""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from typing import Callable, Optional

from .orchestrator import check_agent
from .state import AgentRecord, list_agents

logger = logging.getLogger(__name__)

ERROR_STATUSES = {"error", "timeout", "killed", "failed"}


class AgentManager:
    """Background daemon that monitors running agents and fires callbacks.

    Usage::

        def on_done(rec: AgentRecord) -> None:
            print(f"Agent {rec.name} finished!")

        def on_error(rec: AgentRecord, status: str) -> None:
            print(f"Agent {rec.name} failed with status {status}")

        manager = AgentManager(on_agent_done=on_done, on_agent_error=on_error)
        manager.start()
        # ... do work ...
        manager.stop()
    """

    def __init__(
        self,
        on_agent_done: Callable[[AgentRecord], None],
        on_agent_error: Callable[[AgentRecord, str], None],
        poll_interval: float = 3.0,
    ) -> None:
        self._on_done = on_agent_done
        self._on_error = on_agent_error
        self._poll_interval = poll_interval

        # Thread-safe set of agent names that have already been notified
        self._notified: set[str] = set()
        self._lock = threading.Lock()

        # Recent completions ring-buffer (last 5 done agents)
        self._recent_completions: deque[AgentRecord] = deque(maxlen=5)

        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Start the background polling daemon thread."""
        if self._thread is not None and self._thread.is_alive():
            logger.warning("AgentManager is already running.")
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._poll_loop,
            name="AgentManager-poll",
            daemon=True,
        )
        self._thread.start()
        logger.debug("AgentManager started (poll_interval=%.1fs)", self._poll_interval)

    def stop(self) -> None:
        """Signal the polling loop to stop and wait for thread to exit."""
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=self._poll_interval * 2)
            self._thread = None
        logger.debug("AgentManager stopped.")

    def get_running_count(self) -> int:
        """Return the number of currently running agents (from state)."""
        return len(list_agents(status="running"))

    def get_recent_completions(self) -> list[AgentRecord]:
        """Return the last 5 agents that completed (done status)."""
        with self._lock:
            return list(self._recent_completions)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _poll_loop(self) -> None:
        """Main polling loop — runs in daemon thread."""
        while not self._stop_event.is_set():
            try:
                self._poll_once()
            except Exception:
                logger.exception("Unexpected error in AgentManager poll loop")
            # Wait for poll_interval, but wake up early if stop is requested
            self._stop_event.wait(timeout=self._poll_interval)

    def _poll_once(self) -> None:
        """Poll all running agents once and fire callbacks for state changes."""
        running = list_agents(status="running")
        for rec in running:
            self._check_agent(rec)

    def _check_agent(self, rec: AgentRecord) -> None:
        """Check a single agent and fire the appropriate callback if finished."""
        name = rec.name

        # Skip if already notified
        with self._lock:
            if name in self._notified:
                return

        try:
            new_status = check_agent(name)
        except Exception:
            logger.exception("Error checking agent '%s'", name)
            return

        if new_status == "done":
            with self._lock:
                if name in self._notified:
                    return  # Double-check under lock
                self._notified.add(name)
                self._recent_completions.append(rec)
            try:
                self._on_done(rec)
            except Exception:
                logger.exception("Error in on_agent_done callback for '%s'", name)

        elif new_status in ERROR_STATUSES:
            with self._lock:
                if name in self._notified:
                    return
                self._notified.add(name)
            try:
                self._on_error(rec, new_status)
            except Exception:
                logger.exception(
                    "Error in on_agent_error callback for '%s' (status=%s)",
                    name,
                    new_status,
                )
