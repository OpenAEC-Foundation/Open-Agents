"""Canvas import — lees canvas JSON export en spawn een oa pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def parse_canvas_export(file_path: str) -> dict:
    """Lees en valideer een canvas JSON export van schijf.

    Raises FileNotFoundError of ValueError bij fouten.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Canvas export niet gevonden: {file_path}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Ongeldig JSON in canvas export: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError("Canvas export moet een JSON-object zijn (dict).")
    missing = {"version", "nodes", "edges"} - set(data.keys())
    if missing:
        raise ValueError(f"Canvas export mist verplichte velden: {missing}")
    if not isinstance(data["nodes"], list):
        raise ValueError("'nodes' moet een lijst zijn.")
    if not isinstance(data["edges"], list):
        raise ValueError("'edges' moet een lijst zijn.")
    return data


def convert_to_pipeline(canvas_data: dict) -> list[dict]:
    """Converteer canvas-data naar een topologisch gesorteerde lijst van pipeline-stappen.

    Verwerkt alleen nodes van type 'agent'. Sorteert op basis van edges (Kahn's algorithm).
    """
    nodes: list[dict] = canvas_data.get("nodes", [])
    edges: list[dict] = canvas_data.get("edges", [])

    agent_ids = {n["id"] for n in nodes if n.get("type") == "agent"}

    # Bouw afhankelijkheidsmap: node_id -> [source_node_ids]
    deps: dict[str, list[str]] = {nid: [] for nid in agent_ids}
    for edge in edges:
        src, tgt = edge.get("source", ""), edge.get("target", "")
        if tgt in deps:
            deps[tgt].append(src)

    # Topologische sortering (Kahn's algorithm)
    in_degree = {nid: len(parents) for nid, parents in deps.items()}
    queue = [nid for nid, deg in in_degree.items() if deg == 0]
    ordered: list[str] = []
    while queue:
        nid = queue.pop(0)
        ordered.append(nid)
        for tgt, parents in deps.items():
            if nid in parents:
                in_degree[tgt] -= 1
                if in_degree[tgt] == 0:
                    queue.append(tgt)

    node_map: dict[str, dict] = {n["id"]: n for n in nodes if n.get("type") == "agent"}
    steps: list[dict] = []
    for nid in ordered:
        node = node_map.get(nid)
        if not node:
            continue
        cfg: dict[str, Any] = node.get("config", {})
        steps.append({
            "id": nid,
            "name": cfg.get("name", nid),
            "task": cfg.get("task", ""),
            "model": cfg.get("model", "claude/sonnet"),
            "depends_on": deps.get(nid, []),
            "agent_type": cfg.get("agent_type", ""),
        })
    return steps


def import_and_run(file_path: str) -> None:
    """Importeer een canvas export en spawn de resulterende pipeline via oa."""
    from .spawner import spawn_agent

    canvas_data = parse_canvas_export(file_path)
    steps = convert_to_pipeline(canvas_data)
    if not steps:
        raise ValueError("Geen agent-nodes gevonden in canvas export.")

    pipeline_name = canvas_data.get("name", Path(file_path).stem)
    print(f"Canvas import: '{pipeline_name}' — {len(steps)} stap(pen)")
    for step in steps:
        print(f"  Spawning: {step['name']} (model: {step['model']})")
        spawn_agent(name=step["name"], task=step["task"], model=step["model"])
