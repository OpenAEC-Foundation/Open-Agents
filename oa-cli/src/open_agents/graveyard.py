"""Agent Graveyard & Resurrection (#24) — archive finished agents for later revival."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .state import AgentRecord

GRAVEYARD_DIR = Path.home() / ".oa" / "graveyard"

logger = logging.getLogger(__name__)

_TERMINAL_STATUSES = {"done", "error", "killed", "failed", "timeout"}


class AgentGraveyard:
    """Persist finished agent snapshots and allow resurrection."""

    def __init__(self, base_dir: Optional[Path] = None) -> None:
        self._base = base_dir or GRAVEYARD_DIR

    def _snapshot_path(self, run_id: str) -> Path:
        return self._base / run_id / "snapshot.json"

    def archive(self, rec: AgentRecord) -> str:
        """Save agent as snapshot in ~/.oa/graveyard/{run_id}/snapshot.json.

        Returns the path to the snapshot file.
        """
        run_id = rec.run_id or rec.name
        dest = self._snapshot_path(run_id)
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)

            duration: Optional[float] = None
            if rec.finished_at and rec.created_at:
                duration = rec.finished_at - rec.created_at

            output_summary: Optional[str] = None
            if rec.output_file:
                try:
                    text = Path(rec.output_file).read_text(errors="replace")
                    output_summary = text[:200]
                except OSError:
                    pass

            snapshot = {
                "run_id": run_id,
                "agent_name": rec.name,
                "task": rec.task,
                "model": rec.model,
                "exit_status": rec.status,
                "duration_seconds": round(duration, 2) if duration is not None else None,
                "workspace": rec.workspace,
                "skills_loaded": [],
                "output_summary": output_summary,
                "archived_at": datetime.now(tz=timezone.utc).isoformat(),
            }
            dest.write_text(json.dumps(snapshot, indent=2) + "\n")
            logger.debug("Archived agent %s → %s", rec.name, dest)
        except OSError as exc:
            logger.error("Failed to archive agent %s: %s", rec.name, exc)
        return str(dest)

    def list_archived(self, status_filter: Optional[str] = None) -> list[dict]:
        """Return all snapshots, optionally filtered by exit_status."""
        results: list[dict] = []
        if not self._base.exists():
            return results
        for snapshot_file in sorted(self._base.glob("*/snapshot.json")):
            try:
                data = json.loads(snapshot_file.read_text())
                if status_filter is None or data.get("exit_status") == status_filter:
                    results.append(data)
            except (json.JSONDecodeError, OSError) as exc:
                logger.warning("Skipping corrupt snapshot %s: %s", snapshot_file, exc)
        return results

    def resurrect(self, run_id: str, new_task: Optional[str] = None) -> dict:
        """Return snapshot as spawn-params dict (task, model, name prefix).

        Returns {} if the snapshot does not exist.
        """
        dest = self._snapshot_path(run_id)
        if not dest.exists():
            logger.warning("No snapshot found for run_id=%s", run_id)
            return {}
        try:
            snapshot = json.loads(dest.read_text())
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Failed to read snapshot %s: %s", run_id, exc)
            return {}

        task = new_task or snapshot.get("task", "")
        return {
            "task": task,
            "model": snapshot.get("model", "claude/sonnet"),
            "name": f"resurrected-{snapshot.get('agent_name', run_id)}",
            "source_run_id": run_id,
        }

    def delete(self, run_id: str) -> bool:
        """Delete a snapshot directory. Returns True if it existed."""
        target = self._base / run_id
        if not target.exists():
            return False
        try:
            import shutil
            shutil.rmtree(target)
            logger.debug("Deleted graveyard entry %s", run_id)
            return True
        except OSError as exc:
            logger.error("Failed to delete graveyard entry %s: %s", run_id, exc)
            return False


# --- Module-level CLI helpers ---

_default_graveyard = AgentGraveyard()


def auto_archive(rec: AgentRecord) -> None:
    """Archive agent if its status is terminal (done / error / killed / failed / timeout)."""
    if rec.status in _TERMINAL_STATUSES:
        _default_graveyard.archive(rec)
