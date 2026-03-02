"""Agent state persistence — JSON CRUD in ~/.oa/agents.json."""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

OA_DIR = Path.home() / ".oa"
STATE_FILE = OA_DIR / "agents.json"


@dataclass
class AgentRecord:
    name: str
    task: str
    workspace: str
    tmux_window: str
    model: str = "claude"  # claude | ollama/<model-name>
    status: str = "running"  # running | done | failed | killed
    pid: Optional[int] = None
    created_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None
    output_file: Optional[str] = None


def _ensure_dir() -> None:
    OA_DIR.mkdir(parents=True, exist_ok=True)


def load_agents() -> dict[str, AgentRecord]:
    """Load all agents from state file."""
    if not STATE_FILE.exists():
        return {}
    raw = json.loads(STATE_FILE.read_text())
    return {name: AgentRecord(**data) for name, data in raw.items()}


def save_agents(agents: dict[str, AgentRecord]) -> None:
    """Write agents dict to state file."""
    _ensure_dir()
    raw = {name: asdict(rec) for name, rec in agents.items()}
    STATE_FILE.write_text(json.dumps(raw, indent=2) + "\n")


def add_agent(rec: AgentRecord) -> None:
    """Add or update a single agent record."""
    agents = load_agents()
    agents[rec.name] = rec
    save_agents(agents)


def get_agent(name: str) -> Optional[AgentRecord]:
    """Get a single agent by name."""
    return load_agents().get(name)


def update_agent(name: str, **kwargs) -> Optional[AgentRecord]:
    """Update fields on an existing agent. Returns updated record or None."""
    agents = load_agents()
    rec = agents.get(name)
    if rec is None:
        return None
    for k, v in kwargs.items():
        if hasattr(rec, k):
            setattr(rec, k, v)
    save_agents(agents)
    return rec


def remove_agent(name: str) -> bool:
    """Remove an agent from state. Returns True if it existed."""
    agents = load_agents()
    if name not in agents:
        return False
    del agents[name]
    save_agents(agents)
    return True


def list_agents(status: Optional[str] = None) -> list[AgentRecord]:
    """List all agents, optionally filtered by status."""
    agents = load_agents()
    records = list(agents.values())
    if status:
        records = [r for r in records if r.status == status]
    return records
