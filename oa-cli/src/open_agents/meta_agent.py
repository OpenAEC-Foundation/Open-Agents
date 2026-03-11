"""Meta-Agent — monitors and steers agent batches (Issue #25)."""

from __future__ import annotations

import subprocess
from pathlib import Path

from .compliance_checker import check_compliance
from .context_decay_monitor import get_decay_status
from .skill_evolver import get_skill_stats


class MetaAgent:
    """Monitors a batch of agents and suggests or applies corrections."""

    def analyze_batch(self, agent_names: list[str]) -> dict:
        """Analyze quality signals for a batch of agents.

        Returns per-agent health and batch-level summary.
        """
        results: dict[str, dict] = {}
        issues: list[str] = []

        for name in agent_names:
            decay = get_decay_status(name)
            agent_result: dict = {
                "context": decay,
                "done": self._is_done(name),
                "has_error": self._has_error(name),
            }
            if decay["health"] == "red":
                issues.append(f"{name}: context critical ({decay['pct']}%)")
            if agent_result["has_error"]:
                issues.append(f"{name}: error file detected")
            results[name] = agent_result

        done_count = sum(1 for r in results.values() if r["done"])
        error_count = sum(1 for r in results.values() if r["has_error"])

        return {
            "agents": results,
            "total": len(agent_names),
            "done": done_count,
            "errors": error_count,
            "issues": issues,
        }

    def suggest_corrections(self, analysis: dict) -> list[str]:
        """Return concrete correction suggestions based on batch analysis."""
        suggestions: list[str] = []
        agents = analysis.get("agents", {})

        for name, info in agents.items():
            ctx = info.get("context", {})
            if ctx.get("recommendation") == "compact_now":
                suggestions.append(f"Run /compact on agent '{name}' immediately (context {ctx['pct']}% full).")
            elif ctx.get("recommendation") == "consider_compact":
                suggestions.append(f"Consider /compact on '{name}' soon (context {ctx['pct']}%).")
            if info.get("has_error"):
                suggestions.append(f"Spawn fix-agent for '{name}' — error file found.")

        if analysis.get("errors", 0) == analysis.get("total", 0) and analysis["total"] > 0:
            suggestions.append("All agents failed — check the task prompt for common issues.")

        if not suggestions:
            suggestions.append("Batch looks healthy. No corrections needed.")

        return suggestions

    def spawn_fix_agent(self, agent_name: str, issue: str) -> None:
        """Spawn a fix-agent via oa run to address a specific issue with agent_name."""
        from .spawner import spawn_agent  # lazy import to avoid circular deps

        workspace = Path.home() / ".oa" / "workspaces" / agent_name
        task = (
            f"Fix the following issue in the output of agent '{agent_name}':\n\n"
            f"Issue: {issue}\n\n"
            f"Read the output from: {workspace}/output/\n"
            f"Apply fixes and write corrected result to: {workspace}/output/result.md\n"
            f"Create {workspace}/.done when finished."
        )
        spawn_agent(
            task=task,
            name=f"fix-{agent_name}",
            model="claude/sonnet",
            parent=None,
            direct=True,
        )

    # --- Internal helpers ---

    def _is_done(self, agent_name: str) -> bool:
        workspace = Path.home() / ".oa" / "workspaces" / agent_name
        return (workspace / ".done").exists()

    def _has_error(self, agent_name: str) -> bool:
        workspace = Path.home() / ".oa" / "workspaces" / agent_name
        return (workspace / "output" / "error.md").exists()
