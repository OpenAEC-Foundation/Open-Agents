"""Checkpoint — agent crash-recovery via persistent JSON checkpoints (L-044).

Storage: ~/.oa/checkpoints/<agent_name>.json
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from ._filelock import lock_ex, lock_sh, lock_un
from pathlib import Path

from .config import OA_DIR

CHECKPOINT_DIR = OA_DIR / "checkpoints"


def _path(agent_name: str) -> Path:
    return CHECKPOINT_DIR / f"{agent_name}.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_locked(path: Path) -> dict:
    with path.open("r") as f:
        lock_sh(f)
        try:
            return json.load(f)
        finally:
            lock_un(f)


def _write_locked(path: Path, data: dict) -> None:
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        lock_ex(f)
        try:
            json.dump(data, f, indent=2)
        finally:
            lock_un(f)


def save_checkpoint(agent_name: str, data: dict) -> None:
    """Create or overwrite a checkpoint for an agent."""
    now = _now()
    record = {
        "agent_name": agent_name,
        "task": data.get("task", ""),
        "model": data.get("model", ""),
        "created_at": data.get("created_at", now),
        "updated_at": now,
        "status": data.get("status", "running"),
        "progress_notes": data.get("progress_notes", []),
        "output_snapshot": data.get("output_snapshot", ""),
    }
    _write_locked(_path(agent_name), record)


def load_checkpoint(agent_name: str) -> dict | None:
    """Load a checkpoint. Returns None if not found."""
    p = _path(agent_name)
    if not p.exists():
        return None
    try:
        return _read_locked(p)
    except Exception:
        return None


def update_progress(agent_name: str, note: str) -> None:
    """Append a progress note to an existing checkpoint."""
    cp = load_checkpoint(agent_name)
    if cp is None:
        return
    cp["progress_notes"].append(note)
    cp["updated_at"] = _now()
    _write_locked(_path(agent_name), cp)


def update_snapshot(agent_name: str, snapshot: str) -> None:
    """Update the output_snapshot of an existing checkpoint."""
    cp = load_checkpoint(agent_name)
    if cp is None:
        return
    cp["output_snapshot"] = snapshot
    cp["updated_at"] = _now()
    _write_locked(_path(agent_name), cp)


def complete_checkpoint(agent_name: str, output: str) -> None:
    """Mark checkpoint as completed with final output."""
    cp = load_checkpoint(agent_name)
    if cp is None:
        return
    cp["status"] = "completed"
    cp["output_snapshot"] = output
    cp["updated_at"] = _now()
    _write_locked(_path(agent_name), cp)


def fail_checkpoint(agent_name: str, snapshot: str = "") -> None:
    """Mark checkpoint as failed, optionally saving last known output."""
    cp = load_checkpoint(agent_name)
    if cp is None:
        return
    cp["status"] = "failed"
    if snapshot:
        cp["output_snapshot"] = snapshot
    cp["updated_at"] = _now()
    _write_locked(_path(agent_name), cp)


def list_incomplete() -> list[dict]:
    """Return all checkpoints with status != 'completed'."""
    if not CHECKPOINT_DIR.exists():
        return []
    result = []
    for p in CHECKPOINT_DIR.glob("*.json"):
        try:
            cp = _read_locked(p)
            if cp.get("status") != "completed":
                result.append(cp)
        except Exception:
            continue
    return sorted(result, key=lambda x: x.get("updated_at", ""))


def list_all() -> list[dict]:
    """Return all checkpoints."""
    if not CHECKPOINT_DIR.exists():
        return []
    result = []
    for p in CHECKPOINT_DIR.glob("*.json"):
        try:
            result.append(_read_locked(p))
        except Exception:
            continue
    return sorted(result, key=lambda x: x.get("updated_at", ""), reverse=True)


def resume_from_checkpoint(agent_name: str) -> str:
    """Build a resume prompt from checkpoint data."""
    cp = load_checkpoint(agent_name)
    if cp is None:
        raise ValueError(f"No checkpoint found for agent '{agent_name}'")

    notes = "\n".join(f"  - {n}" for n in cp.get("progress_notes", [])) or "  (none)"
    snapshot = cp.get("output_snapshot", "") or "(geen snapshot beschikbaar)"

    return (
        f"Je was bezig met: {cp['task']}\n"
        f"Voortgang:\n{notes}\n"
        f"Hervat vanaf:\n{snapshot}\n\n"
        f"Ga verder waar je gebleven was. Schrijf output naar ./output/ "
        f"en maak .done als je klaar bent."
    )
