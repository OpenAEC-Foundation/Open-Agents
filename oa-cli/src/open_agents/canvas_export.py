"""Canvas export — convert oa agent runs to Canvas-compatible JSON."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

OA_DIR = Path.home() / ".oa"


def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _duration(created_at: float, finished_at: Optional[float]) -> Optional[float]:
    if finished_at and created_at:
        return round(finished_at - created_at, 2)
    return None


def export_run_to_canvas(run_id: str | None = None) -> dict:
    """Read agents.json and build a Canvas-compatible JSON dict.

    If run_id is provided, only agents whose run_id matches are included.
    Otherwise all agents are exported.

    Returns:
        {"version": "1.0", "name": "oa-export-{timestamp}", "nodes": [...], "edges": [...]}
    """
    from .state import load_agents

    agents = load_agents()
    records = list(agents.values())

    if run_id is not None:
        records = [r for r in records if getattr(r, "run_id", None) == run_id]

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    nodes: list[dict] = []
    edges: list[dict] = []
    seen_edges: set[tuple[str, str]] = set()

    for i, rec in enumerate(records):
        node: dict = {
            "id": rec.name,
            "type": "agent",
            "position": {"x": 200 * (getattr(rec, "depth", 0)), "y": 150 * i},
            "config": {
                "name": rec.name,
                "task": rec.task[:80] if rec.task else "",
                "model": rec.model,
                "status": rec.status,
                "duration": _duration(rec.created_at, rec.finished_at),
            },
        }
        nodes.append(node)

        # Edge from parent → this agent
        parent = getattr(rec, "parent", None)
        if parent and parent in agents:
            key = (parent, rec.name)
            if key not in seen_edges:
                seen_edges.add(key)
                edges.append({
                    "id": f"e-{parent}-{rec.name}",
                    "source": parent,
                    "target": rec.name,
                })

        # Additional edges from lineage (grandparent chains)
        lineage: list[str] = getattr(rec, "lineage", []) or []
        for j in range(len(lineage) - 1):
            src, tgt = lineage[j], lineage[j + 1]
            key = (src, tgt)
            if key not in seen_edges and src in agents and tgt in agents:
                seen_edges.add(key)
                edges.append({
                    "id": f"e-{src}-{tgt}",
                    "source": src,
                    "target": tgt,
                })

    return {
        "version": "1.0",
        "name": f"oa-export-{timestamp}",
        "description": f"Exported {len(nodes)} agent(s) from oa run state.",
        "created_at": _iso_now(),
        "nodes": nodes,
        "edges": edges,
    }


def save_canvas_export(data: dict, output_path: str | None = None) -> str:
    """Write canvas export JSON to disk and return the path.

    Args:
        data: Canvas-compatible dict (from export_run_to_canvas).
        output_path: Target file path. Defaults to ~/.oa/canvas-export-{timestamp}.json.

    Returns:
        Absolute path to the written file.
    """
    if output_path is None:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        OA_DIR.mkdir(parents=True, exist_ok=True)
        output_path = str(OA_DIR / f"canvas-export-{timestamp}.json")

    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return str(path.resolve())
