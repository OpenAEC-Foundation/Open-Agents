"""Guardians — event-triggered reflex agents that run automatically on system events."""

from __future__ import annotations

import json
import subprocess
import time
from datetime import datetime
from pathlib import Path

from .config import OA_DIR

SESSION_LOG_PATH = OA_DIR / "session-log.json"

# Guardian registry: name -> config dict
GUARDIANS: dict[str, dict] = {
    "lessons-guardian": {
        "trigger": "session_end",
        "task": (
            "Je bent een lessen-schrijver. "
            "Lees ~/.oa/session-log.json en voeg nieuwe inzichten en lessen toe aan "
            "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/LESSONS.md. "
            "Schrijf alleen lessen die nog niet bestaan. Geen duplicaten. "
            "Schrijf ./output/result.md met samenvatting en maak .done aan."
        ),
        "output": "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/LESSONS.md",
        "model": "claude/sonnet",
    },
    "roadmap-guardian": {
        "trigger": "batch_complete",
        "task": (
            "Je bent een roadmap-updater. "
            "Scan recente agent outputs in ~/.oa/ en update checkboxes in "
            "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/ROADMAP.md. "
            "Markeer voltooide items als [x]. "
            "Schrijf ./output/result.md met samenvatting en maak .done aan."
        ),
        "output": "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/ROADMAP.md",
        "model": "claude/haiku",
    },
    "handoff-guardian": {
        "trigger": "session_end",
        "task": (
            "Je bent een handoff-schrijver. "
            f"Schrijf een handoff document naar "
            f"/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/HANDOFF-{datetime.now().strftime('%Y-%m-%d')}.md "
            "op basis van ~/.oa/session-log.json. "
            "Beschrijf wat er gedaan is, wat de status is, en wat de volgende stappen zijn. "
            "Schrijf ./output/result.md met samenvatting en maak .done aan."
        ),
        "output": "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/",
        "model": "claude/sonnet",
    },
}


def log_event(event_type: str, metadata: dict | None = None) -> None:
    """Append an event to ~/.oa/session-log.json."""
    OA_DIR.mkdir(parents=True, exist_ok=True)

    entry = {
        "timestamp": time.time(),
        "datetime": datetime.now().isoformat(),
        "event": event_type,
        **(metadata or {}),
    }

    # Load existing log or start fresh
    log: list[dict] = []
    if SESSION_LOG_PATH.exists():
        try:
            log = json.loads(SESSION_LOG_PATH.read_text())
            if not isinstance(log, list):
                log = []
        except Exception:
            log = []

    log.append(entry)
    SESSION_LOG_PATH.write_text(json.dumps(log, indent=2))


def trigger_guardian(event_type: str) -> list[str]:
    """Spawn all guardians registered for the given event_type via oa run.

    Returns list of guardian names that were triggered.
    """
    triggered = []

    for name, config in GUARDIANS.items():
        if config.get("trigger") != event_type:
            continue

        model = config.get("model", "claude/sonnet")
        task = config.get("task", "")

        if not task:
            continue

        # Sanitize name: must match [a-z0-9-], start with alphanumeric, max 62 chars
        safe_name = name[:62]

        try:
            subprocess.Popen(
                ["oa", "run", task, "--name", safe_name, "--model", model, "--direct"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            triggered.append(name)
            log_event("guardian_triggered", {"guardian": name, "event": event_type})
        except Exception as e:
            log_event(
                "guardian_error",
                {"guardian": name, "event": event_type, "error": str(e)},
            )

    return triggered


def register_guardian(name: str, config: dict) -> None:
    """Register a new guardian or update an existing one.

    Config must include: trigger, task, model.
    Optional: output.
    """
    required = {"trigger", "task", "model"}
    missing = required - set(config.keys())
    if missing:
        raise ValueError(f"Guardian config missing required keys: {missing}")

    GUARDIANS[name] = config


def list_guardians() -> list[dict]:
    """Return all registered guardians with their names and triggers."""
    return [
        {
            "name": name,
            "trigger": cfg.get("trigger", ""),
            "model": cfg.get("model", ""),
            "output": cfg.get("output", ""),
            "task_preview": cfg.get("task", "")[:80] + "..."
            if len(cfg.get("task", "")) > 80
            else cfg.get("task", ""),
        }
        for name, cfg in GUARDIANS.items()
    ]
