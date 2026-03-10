"""Guardian daemon — runs in oa-guardian tmux window.

Periodic checkpoint + heartbeat loop. Self-healing via bash wrapper.
Usage: python -m open_agents.session_guardian
"""

from __future__ import annotations

import signal
import time

from .checkpoint import save_checkpoint
from .config import load_config
from .lifecycle import check_agent
from .session import write_heartbeat
from .session_store import create_snapshot, save_session
from .state import load_agents

_running = True


def _handle_sigterm(signum: int, frame) -> None:  # noqa: ANN001
    global _running
    _running = False


def run_guardian() -> None:
    """Periodic checkpoint + heartbeat loop."""
    signal.signal(signal.SIGTERM, _handle_sigterm)
    signal.signal(signal.SIGINT, _handle_sigterm)

    config = load_config()
    interval = config.get("periodic_checkpoint_minutes", 5) * 60

    while _running:
        try:
            agents = load_agents()

            # Layer 1: Per-agent checkpoints
            for name, rec in agents.items():
                check_agent(name)
                if rec.status == "running":
                    save_checkpoint(name, {
                        "task": rec.task,
                        "model": rec.model,
                        "created_at": rec.created_at,
                        "status": "running",
                    })

            # Layer 2: Session-level snapshot
            record = create_snapshot(shutdown_mode="periodic")
            save_session(record)

            # Layer 3: Heartbeat for crash detection
            write_heartbeat()

        except Exception:
            pass  # Never crash the guardian

        # Sleep in small increments to stay responsive to SIGTERM
        for _ in range(int(interval)):
            if not _running:
                break
            time.sleep(1)


if __name__ == "__main__":
    run_guardian()
