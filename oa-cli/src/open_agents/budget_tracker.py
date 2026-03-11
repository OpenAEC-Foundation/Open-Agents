"""Token Budget Allocator (#45) — simple budget state per run."""

from __future__ import annotations

import json
from pathlib import Path

_OA_DIR = Path.home() / ".oa" / "runs"


def _budget_path(run_id: str) -> Path:
    return _OA_DIR / run_id / "budget.json"


def start_budget(run_id: str, budget_tokens: int) -> None:
    """Initialize a token budget for *run_id* and persist to disk.

    Creates ~/.oa/runs/<run_id>/budget.json with initial and remaining tokens.
    """
    path = _budget_path(run_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    state = {"run_id": run_id, "budget_tokens": budget_tokens, "remaining": budget_tokens}
    path.write_text(json.dumps(state, indent=2))


def get_remaining(run_id: str) -> int:
    """Return remaining tokens for *run_id*.

    Returns the original budget if no usage has been recorded yet.
    Returns -1 if no budget file exists (no limit set).
    """
    path = _budget_path(run_id)
    if not path.exists():
        return -1
    state = json.loads(path.read_text())
    return int(state.get("remaining", state.get("budget_tokens", -1)))


def consume(run_id: str, tokens: int) -> int:
    """Deduct *tokens* from the remaining budget and return the new remaining value.

    No-ops (returns -1) when no budget file exists.
    """
    path = _budget_path(run_id)
    if not path.exists():
        return -1
    state = json.loads(path.read_text())
    state["remaining"] = max(0, int(state.get("remaining", 0)) - tokens)
    path.write_text(json.dumps(state, indent=2))
    return state["remaining"]
