"""Backlog — persistent YAML-backed backlog store for Open Agents."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

import yaml

OA_DIR = Path.home() / ".oa"
BACKLOG_PATH = OA_DIR / "backlog.yaml"

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def _load() -> list[dict]:
    """Load backlog items from YAML file."""
    if not BACKLOG_PATH.exists():
        return []
    try:
        data = yaml.safe_load(BACKLOG_PATH.read_text()) or []
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _save(items: list[dict]) -> None:
    """Save backlog items to YAML file."""
    OA_DIR.mkdir(parents=True, exist_ok=True)
    BACKLOG_PATH.write_text(yaml.dump(items, default_flow_style=False, allow_unicode=True))


class BacklogStore:
    """YAML-backed persistent backlog for tracking work items."""

    def add(self, title: str, description: str = "", priority: str = "medium") -> str:
        """Add a new backlog item. Returns the generated short ID."""
        if priority not in PRIORITY_ORDER:
            priority = "medium"
        items = _load()
        item_id = uuid.uuid4().hex[:8]
        items.append({
            "id": item_id,
            "title": title,
            "description": description,
            "priority": priority,
            "created_at": datetime.now(tz=timezone.utc).isoformat(),
            "status": "open",
        })
        _save(items)
        return item_id

    def list(self, priority: str | None = None) -> list[dict]:
        """List open backlog items, optionally filtered by priority, sorted by priority."""
        items = _load()
        open_items = [i for i in items if i.get("status") == "open"]
        if priority:
            open_items = [i for i in open_items if i.get("priority") == priority]
        return sorted(open_items, key=lambda i: PRIORITY_ORDER.get(i.get("priority", "medium"), 1))

    def done(self, item_id: str) -> None:
        """Mark a backlog item as done."""
        items = _load()
        for item in items:
            if item.get("id") == item_id:
                item["status"] = "done"
                _save(items)
                return
        raise KeyError(f"Item '{item_id}' not found in backlog.")

    def remove(self, item_id: str) -> None:
        """Remove a backlog item entirely."""
        items = _load()
        new_items = [i for i in items if i.get("id") != item_id]
        if len(new_items) == len(items):
            raise KeyError(f"Item '{item_id}' not found in backlog.")
        _save(new_items)
