"""Iteration Control (#41) — detect diminishing returns and auto-stop pipelines.

Tracks quality deltas between consecutive pipeline iterations and signals
convergence when improvement plateaus for N consecutive iterations.

Config key in ~/.oa/config.json: iteration_control.convergence_threshold
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from .config import load_config

TrendType = Literal["converging", "diverging", "stable"]

DEFAULT_THRESHOLD = 0.05
DEFAULT_WINDOW = 3


@dataclass
class DeltaResult:
    """Result of a quality delta analysis."""

    delta_pct: float
    trend: TrendType
    scores: list[float]


def _get_threshold() -> float:
    """Read convergence threshold from config, fallback to default."""
    cfg = load_config()
    ic = cfg.get("iteration_control", {})
    return float(ic.get("convergence_threshold", DEFAULT_THRESHOLD))


def _get_window() -> int:
    """Read convergence window from config, fallback to default."""
    cfg = load_config()
    ic = cfg.get("iteration_control", {})
    return int(ic.get("convergence_window", DEFAULT_WINDOW))


def quality_delta_tracker(scores: list[float]) -> DeltaResult:
    """Calculate quality delta between consecutive pipeline iterations.

    Args:
        scores: List of quality scores per iteration (oldest first).

    Returns:
        DeltaResult with delta percentage, trend, and the input scores.
    """
    if len(scores) < 2:
        return DeltaResult(delta_pct=0.0, trend="stable", scores=scores)

    deltas = [scores[i] - scores[i - 1] for i in range(1, len(scores))]
    last_delta = deltas[-1]

    # Determine trend from recent deltas
    if len(deltas) >= 2:
        if all(d > 0 and d < deltas[0] for d in deltas[1:]):
            trend: TrendType = "converging"
        elif all(d >= deltas[0] for d in deltas[1:]) and deltas[-1] > 0:
            trend = "diverging"
        else:
            trend = "stable"
    else:
        trend = "stable"

    return DeltaResult(delta_pct=round(last_delta * 100, 2), trend=trend, scores=scores)


def convergence_detector(scores: list[float], threshold: float | None = None, window: int | None = None) -> bool:
    """Return True if delta < threshold for N consecutive iterations.

    Args:
        scores: List of quality scores per iteration (oldest first).
        threshold: Minimum improvement to continue (default from config or 0.05).
        window: Number of consecutive low-delta iterations required (default 3).

    Returns:
        True if the pipeline has converged and should stop.
    """
    if threshold is None:
        threshold = _get_threshold()
    if window is None:
        window = _get_window()

    if len(scores) < window + 1:
        return False

    deltas = [scores[i] - scores[i - 1] for i in range(1, len(scores))]
    recent = deltas[-window:]
    return all(abs(d) < threshold for d in recent)
