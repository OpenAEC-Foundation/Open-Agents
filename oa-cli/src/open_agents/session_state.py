"""Session State Preserver — save and restore agent context across sessions. (#43)"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Optional

OA_DIR = Path.home() / ".oa"
SESSIONS_DIR = OA_DIR / "sessions"


class SessionState:
    """Persist and restore agent context items between sessions.

    Context items tracked:
      - last_task: description of the last task worked on
      - files_edited: list of absolute file paths modified
      - decisions: key decisions made during the session
      - next_step: recommended next action for resume
    """

    def save(self, agent_name: str, context_items: dict) -> Path:
        """Save session context for an agent.

        Writes to ~/.oa/sessions/<agent_name>/state.json.
        Merges with existing state so incremental saves accumulate.

        Args:
            agent_name: Unique agent identifier.
            context_items: Dict with keys like last_task, files_edited,
                           decisions, next_step (all optional).

        Returns:
            Path to the written state file.
        """
        session_dir = SESSIONS_DIR / agent_name
        session_dir.mkdir(parents=True, exist_ok=True)
        state_file = session_dir / "state.json"

        # Load existing state and merge
        existing: dict = {}
        if state_file.exists():
            try:
                existing = json.loads(state_file.read_text())
            except (json.JSONDecodeError, OSError):
                existing = {}

        # Merge: lists are extended, scalars are overwritten
        merged = {**existing}
        for key, value in context_items.items():
            if isinstance(value, list) and isinstance(merged.get(key), list):
                seen = set(merged[key])
                merged[key] = merged[key] + [v for v in value if v not in seen]
            else:
                merged[key] = value

        merged["saved_at"] = time.time()
        state_file.write_text(json.dumps(merged, indent=2) + "\n")
        return state_file

    def load(self, agent_name: str) -> dict:
        """Load session context for an agent.

        Returns:
            Dict with saved context items, or empty dict if no state exists.
        """
        state_file = SESSIONS_DIR / agent_name / "state.json"
        if not state_file.exists():
            return {}
        try:
            return json.loads(state_file.read_text())
        except (json.JSONDecodeError, OSError):
            return {}

    def resume_prompt(self, agent_name: str) -> str:
        """Generate a context-restore prompt string for resuming an agent.

        Returns a human-readable prompt that can be prepended to a new
        agent task to re-establish context from the previous session.

        Args:
            agent_name: Agent whose state to restore.

        Returns:
            Multi-line string with context summary, or empty string if no state.
        """
        state = self.load(agent_name)
        if not state:
            return ""

        lines: list[str] = [
            f"# Resuming session for agent: {agent_name}",
            "",
            "## Previous context",
        ]

        if last_task := state.get("last_task"):
            lines.append(f"- **Last task**: {last_task}")

        if files := state.get("files_edited"):
            lines.append("- **Files edited**:")
            for f in files:
                lines.append(f"  - {f}")

        if decisions := state.get("decisions"):
            lines.append("- **Decisions made**:")
            for d in (decisions if isinstance(decisions, list) else [decisions]):
                lines.append(f"  - {d}")

        if next_step := state.get("next_step"):
            lines.append(f"- **Next step**: {next_step}")

        lines += ["", "Continue from where the previous session left off.", ""]
        return "\n".join(lines)


def write_workspace_state(workspace: Path, agent_name: str, task: str) -> None:
    """Write an initial session-state.json into the agent workspace.

    Called during workspace creation to seed a recoverable state file.

    Args:
        workspace: Path to the agent workspace directory.
        agent_name: Name of the agent.
        task: Initial task description.
    """
    state_file = workspace / "session-state.json"
    initial_state = {
        "agent_name": agent_name,
        "task": task,
        "files_edited": [],
        "decisions": [],
        "next_step": "",
        "created_at": time.time(),
    }
    state_file.write_text(json.dumps(initial_state, indent=2) + "\n")
