"""Anti-Regression Guard (#44) — detect metric regressions for agents.

Stores reference metrics in ~/.oa/references/<agent>.yaml and compares
current metrics against saved baselines.

Severity levels:
  - minor:    any metric regressed < 10%
  - major:    any metric regressed 10–25%
  - critical: any metric regressed > 25%
"""

from __future__ import annotations

import difflib
import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import yaml

logger = logging.getLogger(__name__)

REFERENCES_DIR = Path.home() / ".oa" / "references"

SeverityType = Literal["minor", "major", "critical"]

METRIC_KEYS = ("success_rate", "avg_duration", "avg_quality_score")


@dataclass
class RegressionResult:
    """Result of a regression check."""

    regressed: bool
    delta: dict[str, float]
    severity: SeverityType | None


def save_reference_run(agent_name: str, metrics: dict[str, float]) -> Path:
    """Save reference metrics for an agent.

    Args:
        agent_name: Name of the agent.
        metrics: Dict with keys: success_rate, avg_duration, avg_quality_score, model.

    Returns:
        Path to the saved reference file.
    """
    REFERENCES_DIR.mkdir(parents=True, exist_ok=True)
    ref = {
        "agent_name": agent_name,
        "saved_at": datetime.now(tz=timezone.utc).isoformat(),
        "metrics": metrics,
    }
    path = REFERENCES_DIR / f"{agent_name}.yaml"
    path.write_text(yaml.dump(ref, default_flow_style=False))
    return path


def check_regression(agent_name: str, current_metrics: dict[str, float]) -> RegressionResult:
    """Compare current metrics against saved reference for an agent.

    Args:
        agent_name: Name of the agent.
        current_metrics: Current metrics dict with same keys as reference.

    Returns:
        RegressionResult with regressed flag, delta dict, and severity.
    """
    ref_path = REFERENCES_DIR / f"{agent_name}.yaml"
    if not ref_path.exists():
        return RegressionResult(regressed=False, delta={}, severity=None)

    ref = yaml.safe_load(ref_path.read_text())
    ref_metrics: dict = ref.get("metrics", {})

    delta: dict[str, float] = {}
    max_regression_pct = 0.0

    for key in METRIC_KEYS:
        ref_val = ref_metrics.get(key)
        cur_val = current_metrics.get(key)
        if ref_val is None or cur_val is None:
            continue

        if key == "avg_duration":
            # For duration, higher is worse (regression = current > reference)
            if ref_val > 0:
                change = (cur_val - ref_val) / ref_val
                delta[key] = round(change * 100, 2)
                if change > 0:
                    max_regression_pct = max(max_regression_pct, change * 100)
        else:
            # For success_rate and quality_score, lower is worse
            if ref_val > 0:
                change = (ref_val - cur_val) / ref_val
                delta[key] = round(-change * 100, 2)  # negative = regression
                if change > 0:
                    max_regression_pct = max(max_regression_pct, change * 100)

    if max_regression_pct == 0:
        return RegressionResult(regressed=False, delta=delta, severity=None)

    if max_regression_pct > 25:
        severity: SeverityType = "critical"
    elif max_regression_pct > 10:
        severity = "major"
    else:
        severity = "minor"

    return RegressionResult(regressed=True, delta=delta, severity=severity)


def get_agent_metrics_from_telemetry(agent_name: str) -> dict[str, float]:
    """Compute current metrics for an agent from telemetry run logs.

    Args:
        agent_name: Name of the agent to look up.

    Returns:
        Dict with success_rate, avg_duration, avg_quality_score.
    """
    from .telemetry import list_runs

    runs = list_runs(limit=50, agent_name=agent_name)
    if not runs:
        return {"success_rate": 0.0, "avg_duration": 0.0, "avg_quality_score": 0.0}

    total = len(runs)
    successes = sum(1 for r in runs if r.get("exit_status") == "success")
    durations = [r["duration_seconds"] for r in runs if r.get("duration_seconds") is not None]

    return {
        "success_rate": round(successes / total, 4) if total else 0.0,
        "avg_duration": round(sum(durations) / len(durations), 2) if durations else 0.0,
        "avg_quality_score": 0.0,  # placeholder — requires quality scoring integration
    }


def list_references() -> list[dict]:
    """Return all stored agent reference files, newest first."""
    if not REFERENCES_DIR.exists():
        return []
    refs: list[dict] = []
    for path in sorted(REFERENCES_DIR.glob("*.yaml"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            refs.append(yaml.safe_load(path.read_text()))
        except (yaml.YAMLError, OSError):
            continue
    return refs


# --- Legacy hash-based API (backward compat) ---

class RegressionGuard:
    """Compare current outputs against saved reference snapshots (legacy)."""

    def __init__(self) -> None:
        REFERENCES_DIR.mkdir(parents=True, exist_ok=True)

    def save_reference(self, run_id: str, output_hash: str, metadata: dict) -> None:
        REFERENCES_DIR.mkdir(parents=True, exist_ok=True)
        ref = {
            "run_id": run_id,
            "output_hash": output_hash,
            "saved_at": datetime.now(tz=timezone.utc).isoformat(),
            "metadata": metadata,
        }
        (REFERENCES_DIR / f"{run_id}.json").write_text(json.dumps(ref, indent=2))

    def check_regression(self, current_output: str, reference_run_id: str) -> dict:
        ref_path = REFERENCES_DIR / f"{reference_run_id}.json"
        if not ref_path.exists():
            return {"regression": False, "similarity": 1.0, "differences": []}
        ref = json.loads(ref_path.read_text())
        current_hash = hashlib.sha256(current_output.encode()).hexdigest()
        if current_hash == ref.get("output_hash", ""):
            return {"regression": False, "similarity": 1.0, "differences": []}
        ref_content: str = ref.get("metadata", {}).get("content", "")
        similarity = difflib.SequenceMatcher(None, ref_content, current_output).ratio()
        return {"regression": True, "similarity": round(similarity, 4), "differences": []}

    def list_references(self) -> list[dict]:
        refs: list[dict] = []
        if not REFERENCES_DIR.exists():
            return refs
        for path in sorted(REFERENCES_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                refs.append(json.loads(path.read_text()))
            except (json.JSONDecodeError, OSError):
                continue
        return refs
