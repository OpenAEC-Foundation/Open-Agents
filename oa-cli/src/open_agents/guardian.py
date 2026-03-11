"""GuardianAgent — post-batch agents that keep core docs up-to-date.

Guardian agents are specialised workers spawned after a batch completes.
Each guardian reads agent outputs and updates a specific core document:
  - lessons-guardian  → LESSONS.md
  - roadmap-guardian  → docs/ROADMAP.md
  - decisions-guardian → docs/DECISIONS.md
"""

from __future__ import annotations

import os
from pathlib import Path

from .spawner import spawn_agent
from .state import AgentRecord

# Resolve repo root: guardian.py → open_agents/ → src/ → oa-cli/ → Open-Agents/
_REPO_ROOT = Path(
    os.environ.get("OA_REPO_ROOT", str(Path(__file__).parents[3]))
)

_LESSONS_MD = _REPO_ROOT / "LESSONS.md"
_ROADMAP_MD = _REPO_ROOT / "docs" / "ROADMAP.md"
_DECISIONS_MD = _REPO_ROOT / "docs" / "DECISIONS.md"


class GuardianAgent:
    """Spawns guardian agents that auto-update core project documents.

    Args:
        batch_context: Human-readable description of the batch that just ran.
            Passed to each guardian so it knows what to look for.
        parent: Optional parent agent name for hierarchy tracking.
    """

    def __init__(self, batch_context: str = "", parent: str | None = None) -> None:
        self.batch_context = batch_context or "post-batch auto-update"
        self.parent = parent

    def spawn_lessons_guardian(self) -> AgentRecord:
        """Spawn a guardian that extracts new lessons and appends to LESSONS.md."""
        task = (
            f"You are a lessons-guardian. Context: {self.batch_context}. "
            f"Read ~/.oa/session-log.json and recent agent output files in ~/.oa/. "
            f"Extract NEW insights and lessons not already present in {_LESSONS_MD}. "
            f"Append only new, unique lessons to {_LESSONS_MD}. No duplicates. "
            f"Write ./output/result.md with a summary of lessons added, then create .done."
        )
        return spawn_agent(
            name="lessons-guardian",
            task=task,
            model="claude/sonnet",
            parent=self.parent,
            can_spawn=False,
        )

    def spawn_roadmap_guardian(self) -> AgentRecord:
        """Spawn a guardian that updates checkboxes in ROADMAP.md."""
        task = (
            f"You are a roadmap-guardian. Context: {self.batch_context}. "
            f"Scan recent agent outputs in ~/.oa/ to determine which features were implemented. "
            f"Update checkboxes in {_ROADMAP_MD}: mark completed items as [x]. "
            f"Do NOT uncheck already-checked items. "
            f"Write ./output/result.md with a summary of changes, then create .done."
        )
        return spawn_agent(
            name="roadmap-guardian",
            task=task,
            model="claude/haiku",
            parent=self.parent,
            can_spawn=False,
        )

    def spawn_decisions_guardian(self) -> AgentRecord:
        """Spawn a guardian that appends new architectural decisions to DECISIONS.md."""
        task = (
            f"You are a decisions-guardian. Context: {self.batch_context}. "
            f"Scan agent outputs in ~/.oa/ for new architectural decisions made during this batch. "
            f"Append only NEW decisions (ADR format) to {_DECISIONS_MD}. No duplicates. "
            f"Write ./output/result.md with a summary of decisions recorded, then create .done."
        )
        return spawn_agent(
            name="decisions-guardian",
            task=task,
            model="claude/sonnet",
            parent=self.parent,
            can_spawn=False,
        )

    def spawn_all_guardians(self) -> list[AgentRecord]:
        """Spawn all three guardians. Returns list of AgentRecords.

        Guardians run in parallel (each in its own tmux window).
        """
        records = []
        for spawner in (
            self.spawn_lessons_guardian,
            self.spawn_roadmap_guardian,
            self.spawn_decisions_guardian,
        ):
            try:
                rec = spawner()
                records.append(rec)
            except Exception as exc:
                # One failure must not prevent the others from running
                import logging
                logging.getLogger(__name__).error(
                    "Guardian spawn failed (%s): %s", spawner.__name__, exc
                )
        return records


def spawn_all_guardians(batch_context: str = "", parent: str | None = None) -> list[AgentRecord]:
    """Module-level convenience wrapper for GuardianAgent.spawn_all_guardians()."""
    agent = GuardianAgent(batch_context=batch_context, parent=parent)
    return agent.spawn_all_guardians()
