"""Meta-Agent (#25) — self-regulating system that analyzes telemetry and recommends actions.

Analyzes local telemetry data (success rates, fail patterns, duration anomalies)
and generates recommended actions to ~/.oa/meta-actions.yaml.

No external API calls — works purely on local telemetry data.
"""

from __future__ import annotations

import logging
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import yaml

from .telemetry import get_runs_index

logger = logging.getLogger(__name__)

META_ACTIONS_PATH = Path.home() / ".oa" / "meta-actions.yaml"
TEMPLATES_DIR = Path.home() / ".oa" / "templates"

ActionType = Literal["improve_skill", "promote_template", "investigate_failure", "adjust_model", "retrain_agent"]


@dataclass
class MetaAction:
    """A recommended action from meta-agent analysis."""

    action_type: ActionType
    target: str
    reason: str
    priority: int  # 1 = highest

    def to_dict(self) -> dict:
        return {
            "action_type": self.action_type,
            "target": self.target,
            "reason": self.reason,
            "priority": self.priority,
        }


@dataclass
class AnalysisResult:
    """Result of meta-agent telemetry analysis."""

    total_runs: int = 0
    success_rate: float = 0.0
    fail_patterns: list[str] = field(default_factory=list)
    duration_anomalies: list[str] = field(default_factory=list)
    top_agents: list[dict] = field(default_factory=list)
    actions: list[MetaAction] = field(default_factory=list)


def analyze() -> AnalysisResult:
    """Analyze telemetry data and generate recommendations.

    Returns:
        AnalysisResult with statistics and recommended actions.
    """
    runs = get_runs_index()
    result = AnalysisResult(total_runs=len(runs))

    if not runs:
        return result

    # --- Success rate ---
    statuses = [r.get("exit_status", "unknown") for r in runs]
    successes = statuses.count("success")
    result.success_rate = round(successes / len(runs), 4) if runs else 0.0

    # --- Fail patterns ---
    failures = [r for r in runs if r.get("exit_status") not in ("success", "unknown")]
    fail_agents = Counter(r.get("agent_name", "?") for r in failures)
    for agent, count in fail_agents.most_common(5):
        result.fail_patterns.append(f"{agent}: {count} failures")

    # --- Duration anomalies ---
    durations_by_agent: dict[str, list[float]] = {}
    for r in runs:
        dur = r.get("duration_seconds")
        name = r.get("agent_name", "?")
        if dur is not None:
            durations_by_agent.setdefault(name, []).append(dur)

    for agent, durs in durations_by_agent.items():
        if len(durs) < 2:
            continue
        avg = sum(durs) / len(durs)
        latest = durs[0]  # runs are newest-first
        if avg > 0 and latest > avg * 2:
            result.duration_anomalies.append(
                f"{agent}: latest {latest:.0f}s vs avg {avg:.0f}s (2x+ slower)"
            )

    # --- Top agents by run count ---
    agent_counts = Counter(r.get("agent_name", "?") for r in runs)
    result.top_agents = [
        {"agent": name, "runs": count}
        for name, count in agent_counts.most_common(10)
    ]

    # --- Generate actions ---
    actions: list[MetaAction] = []
    priority = 1

    # Action: investigate frequent failures
    for agent, count in fail_agents.most_common(3):
        if count >= 2:
            actions.append(MetaAction(
                action_type="investigate_failure",
                target=agent,
                reason=f"{count} failures detected — investigate root cause",
                priority=priority,
            ))
            priority += 1

    # Action: duration anomalies suggest model adjustment
    for anomaly in result.duration_anomalies[:3]:
        agent = anomaly.split(":")[0]
        actions.append(MetaAction(
            action_type="adjust_model",
            target=agent,
            reason=f"Duration anomaly: {anomaly}",
            priority=priority,
        ))
        priority += 1

    # Action: low success rate
    if result.success_rate < 0.7 and result.total_runs >= 5:
        actions.append(MetaAction(
            action_type="improve_skill",
            target="global",
            reason=f"Overall success rate {result.success_rate:.0%} is below 70%",
            priority=priority,
        ))
        priority += 1

    # Action: promote high-success agents as templates
    for agent, count in agent_counts.most_common(5):
        agent_runs = [r for r in runs if r.get("agent_name") == agent]
        agent_successes = sum(1 for r in agent_runs if r.get("exit_status") == "success")
        if count >= 3 and agent_successes / count >= 0.9:
            actions.append(MetaAction(
                action_type="promote_template",
                target=agent,
                reason=f"{agent_successes}/{count} runs succeeded — candidate for template",
                priority=priority,
            ))
            priority += 1

    result.actions = actions
    return result


def save_actions(actions: list[MetaAction]) -> Path:
    """Save recommended actions to ~/.oa/meta-actions.yaml.

    Args:
        actions: List of MetaAction objects.

    Returns:
        Path to the saved file.
    """
    META_ACTIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        "actions": [a.to_dict() for a in actions],
    }
    META_ACTIONS_PATH.write_text(yaml.dump(data, default_flow_style=False))
    return META_ACTIONS_PATH


def load_actions() -> list[dict]:
    """Load previously saved actions from disk."""
    if not META_ACTIONS_PATH.exists():
        return []
    try:
        data = yaml.safe_load(META_ACTIONS_PATH.read_text())
        return data.get("actions", []) if data else []
    except (yaml.YAMLError, OSError):
        return []


def run_top_actions(limit: int = 3) -> list[str]:
    """Execute top-N recommended actions automatically.

    Currently supports:
      - investigate_failure: logs the investigation recommendation
      - promote_template: creates a template stub in ~/.oa/templates/
      - adjust_model / improve_skill: logs the recommendation

    Args:
        limit: Maximum number of actions to execute.

    Returns:
        List of status messages for each executed action.
    """
    actions = load_actions()
    if not actions:
        return ["No actions to execute."]

    sorted_actions = sorted(actions, key=lambda a: a.get("priority", 99))
    results: list[str] = []

    for action in sorted_actions[:limit]:
        atype = action.get("action_type", "unknown")
        target = action.get("target", "?")
        reason = action.get("reason", "")

        if atype == "promote_template":
            TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
            stub = TEMPLATES_DIR / f"{target}.yaml"
            if not stub.exists():
                stub.write_text(yaml.dump({
                    "name": target,
                    "promoted_at": datetime.now(tz=timezone.utc).isoformat(),
                    "reason": reason,
                    "model_hint": "sonnet",
                }, default_flow_style=False))
                results.append(f"Promoted '{target}' as template candidate → {stub}")
            else:
                results.append(f"Template '{target}' already exists, skipped.")

        elif atype == "investigate_failure":
            results.append(f"Investigation needed: {target} — {reason}")

        elif atype == "adjust_model":
            results.append(f"Model adjustment suggested: {target} — {reason}")

        elif atype == "improve_skill":
            results.append(f"Skill improvement needed: {target} — {reason}")

        else:
            results.append(f"Unknown action type '{atype}' for {target}")

    return results
