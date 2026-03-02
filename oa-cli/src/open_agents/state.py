"""Agent state persistence — JSON CRUD in ~/.oa/agents.json."""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

OA_DIR = Path.home() / ".oa"
STATE_FILE = OA_DIR / "agents.json"


def _task_hash(task: str) -> str:
    """Compute a short deterministic hash of a task description."""
    normalized = task.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


@dataclass
class AgentRecord:
    name: str
    task: str
    workspace: str
    tmux_window: str
    model: str = "claude"           # claude | ollama/<model-name>
    status: str = "running"         # running | done | failed | killed | timeout | error
    pid: Optional[int] = None
    created_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None
    output_file: Optional[str] = None
    parent: Optional[str] = None    # name of parent/orchestrator agent

    # --- Hiërarchie uitbreidingen ---
    depth: int = 0                  # 0 = root, 1 = direct child, etc.
    lineage: list = field(default_factory=list)  # [root_name, ..., parent_name]
    task_hash: str = ""             # hash van taakomschrijving (deduplicatie)
    max_children: int = 10          # max directe kinderen die dit agent mag spawnen
    shared_results_dir: Optional[str] = None  # gedeeld pad voor output-aggregatie

    # --- Auto-cleanup uitbreidingen ---
    last_activity: float = 0.0      # timestamp van laatste activiteit
    auto_cleanup_minutes: int = 20  # na hoeveel minuten inactiviteit opruimen

    def __post_init__(self) -> None:
        """Bereken task_hash als nog niet ingesteld."""
        if not self.task_hash and self.task:
            self.task_hash = _task_hash(self.task)


def _ensure_dir() -> None:
    OA_DIR.mkdir(parents=True, exist_ok=True)


def load_agents() -> dict[str, AgentRecord]:
    """Load all agents from state file."""
    if not STATE_FILE.exists():
        return {}
    raw = json.loads(STATE_FILE.read_text())
    result = {}
    for name, data in raw.items():
        # Backwards compatibility: vul ontbrekende velden aan
        data.setdefault("model", "claude")
        data.setdefault("pid", None)
        data.setdefault("output_file", None)
        data.setdefault("parent", None)
        data.setdefault("depth", 0)
        data.setdefault("lineage", [])
        data.setdefault("task_hash", _task_hash(data.get("task", "")))
        data.setdefault("max_children", 10)
        data.setdefault("shared_results_dir", None)
        data.setdefault("last_activity", 0.0)
        data.setdefault("auto_cleanup_minutes", 20)
        result[name] = AgentRecord(**data)
    return result


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


# --- Boom-navigatie helpers ---

def get_children(parent_name: str) -> list[AgentRecord]:
    """Return all direct children of the given agent."""
    return [a for a in list_agents() if a.parent == parent_name]


def count_children(parent_name: str) -> int:
    """Return the number of direct children (all statuses)."""
    return len(get_children(parent_name))


def get_lineage(name: str) -> list[str]:
    """Return the full ancestor chain for the given agent (oldest first).

    Traverses the parent pointers in the state file.
    Returns [] if the agent doesn't exist.
    """
    agents = load_agents()
    rec = agents.get(name)
    if rec is None:
        return []
    # Use stored lineage if available (faster, no traversal needed)
    if rec.lineage:
        return rec.lineage
    # Fallback: traverse parent pointers
    chain = []
    current = rec
    while current.parent is not None:
        chain.append(current.parent)
        current = agents.get(current.parent)
        if current is None:
            break
    chain.reverse()
    return chain


def validate_spawn(
    parent_name: str,
    child_task: str,
    max_depth: int = 5,
) -> tuple[bool, str]:
    """Check if a parent agent is allowed to spawn a child with the given task.

    Returns (allowed: bool, reason: str).
    """
    parent = get_agent(parent_name)
    if parent is None:
        return False, f"Parent agent '{parent_name}' not found"

    # Check dieptelimiet
    child_depth = parent.depth + 1
    if child_depth > max_depth:
        return False, (
            f"Max depth {max_depth} bereikt. "
            f"Parent '{parent_name}' zit op depth {parent.depth}."
        )

    # Check max_children
    current_children = count_children(parent_name)
    if current_children >= parent.max_children:
        return False, (
            f"Parent '{parent_name}' heeft al {current_children} kinderen "
            f"(max={parent.max_children})."
        )

    # Check circulaire lineage
    lineage = get_lineage(parent_name) + [parent_name]
    # (Circulair spawnen is onmogelijk via naam — namen zijn uniek)

    # Check task-hash deduplicatie: kind mag niet dezelfde taak als voorouder hebben
    child_hash = _task_hash(child_task)
    for ancestor_name in lineage:
        ancestor = get_agent(ancestor_name)
        if ancestor and ancestor.task_hash == child_hash:
            return False, (
                f"Taak-hash conflict: kind-taak is identiek aan taak van "
                f"voorouder '{ancestor_name}'. Mogelijke infinite loop."
            )

    return True, "OK"
