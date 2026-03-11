"""Diminishing Returns Detector (#41) — stop iterative pipelines when improvement plateaus.

Tracks per-pipeline iteration scores in ~/.oa/pipelines/<id>/iterations.json.
"""

from __future__ import annotations

import json
from pathlib import Path

PIPELINES_DIR = Path.home() / ".oa" / "pipelines"


def calculate_delta(run_scores: list[float]) -> float:
    """Return the difference between the last two scores.

    Args:
        run_scores: List of quality scores (ascending order, newest last).

    Returns:
        Delta between last two scores, or 0.0 if fewer than 2 scores.
    """
    if len(run_scores) < 2:
        return 0.0
    return run_scores[-1] - run_scores[-2]


def should_stop(run_scores: list[float], threshold: float = 0.05) -> bool:
    """Return True if the last improvement is below the threshold.

    Args:
        run_scores: List of quality scores.
        threshold: Minimum improvement required to continue (default 0.05).

    Returns:
        True when delta < threshold (stop iterating), False otherwise.
    """
    if len(run_scores) < 2:
        return False
    return calculate_delta(run_scores) < threshold


def track_pipeline_iteration(pipeline_id: str, iteration: int, score: float) -> None:
    """Record a single iteration score for a pipeline.

    Appends to ~/.oa/pipelines/<pipeline_id>/iterations.json.

    Args:
        pipeline_id: Unique pipeline identifier.
        iteration: Iteration number (0-based or 1-based, caller's choice).
        score: Quality score for this iteration.
    """
    pipeline_dir = PIPELINES_DIR / pipeline_id
    pipeline_dir.mkdir(parents=True, exist_ok=True)
    iterations_file = pipeline_dir / "iterations.json"

    iterations: list[dict] = []
    if iterations_file.exists():
        try:
            iterations = json.loads(iterations_file.read_text())
        except (json.JSONDecodeError, OSError):
            iterations = []

    iterations.append({"iteration": iteration, "score": score})
    iterations_file.write_text(json.dumps(iterations, indent=2))
