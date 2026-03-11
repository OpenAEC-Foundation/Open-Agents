"""File ownership tracker — prevents pipeline agents from writing to the same files.

Usage:
    register_ownership(pipeline_id, agent_name, ["/path/a.py", "/path/b.py"])
    conflicts = check_conflicts(pipeline_id, agent_name, ["/path/a.py"])
    # conflicts == [] if no other agent owns these files
"""

from __future__ import annotations

from pathlib import Path
from typing import List

import yaml


def _ownership_path(pipeline_id: str) -> Path:
    """Return path to the file-ownership.yaml for a pipeline."""
    p = Path.home() / ".oa" / "pipelines" / pipeline_id / "file-ownership.yaml"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _load(pipeline_id: str) -> dict[str, str]:
    """Load current ownership map: {file_path: agent_name}."""
    path = _ownership_path(pipeline_id)
    if not path.exists():
        return {}
    with path.open() as f:
        data = yaml.safe_load(f) or {}
    return data


def _save(pipeline_id: str, data: dict[str, str]) -> None:
    """Persist ownership map."""
    path = _ownership_path(pipeline_id)
    with path.open("w") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True)


def register_ownership(pipeline_id: str, agent_name: str, files: List[str]) -> None:
    """Register that agent_name owns the given files within a pipeline.

    Overwrites any previous owner for each file. Call this BEFORE writing.

    Args:
        pipeline_id: Unique pipeline identifier (e.g. "pipeline-abc123").
        agent_name:  Name of the agent claiming ownership.
        files:       List of absolute file paths the agent will write.
    """
    data = _load(pipeline_id)
    for f in files:
        data[str(f)] = agent_name
    _save(pipeline_id, data)


def check_conflicts(pipeline_id: str, agent_name: str, files: List[str]) -> List[str]:
    """Check if any of the given files are already owned by another agent.

    Args:
        pipeline_id: Unique pipeline identifier.
        agent_name:  Name of the agent requesting ownership.
        files:       List of absolute file paths to check.

    Returns:
        List of file paths that conflict (owned by a different agent).
        Empty list means no conflicts — safe to proceed.
    """
    data = _load(pipeline_id)
    conflicts = []
    for f in files:
        owner = data.get(str(f))
        if owner is not None and owner != agent_name:
            conflicts.append(str(f))
    return conflicts


def release_ownership(pipeline_id: str, agent_name: str) -> int:
    """Remove all file claims registered by agent_name in this pipeline.

    Returns the number of files released.
    """
    data = _load(pipeline_id)
    to_remove = [f for f, owner in data.items() if owner == agent_name]
    for f in to_remove:
        del data[f]
    if to_remove:
        _save(pipeline_id, data)
    return len(to_remove)
