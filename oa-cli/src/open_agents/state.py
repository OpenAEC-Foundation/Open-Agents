"""Agent state persistence — JSON CRUD in ~/.oa/agents.json."""

from __future__ import annotations

import fcntl
import hashlib
import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

OA_DIR = Path.home() / ".oa"
STATE_FILE = OA_DIR / "agents.json"


# --- Team/Task/Message schemas (Sprint 17) ---

@dataclass
class TaskRecord:
    """Shared task record for agent teams."""
    id: str
    team: str
    description: str
    status: str = "todo"  # todo | claimed | done | blocked
    claimed_by: Optional[str] = None
    depends_on: list = field(default_factory=list)
    created_at: str = ""
    completed_at: Optional[str] = None


@dataclass
class TeamConfig:
    """Team configuration record."""
    name: str
    members: list = field(default_factory=list)
    created_at: str = ""


@dataclass
class Message:
    """Inter-agent message record."""
    id: str
    from_agent: str
    to_agent: str  # or "broadcast"
    content: str
    sent_at: str = ""
    read: bool = False

# PERF: In-memory agent cache; re-reads disk only when file mtime changes.
# Eliminates duplicate JSON loads within a single request cycle (N+1 reads).
_cache: dict[str, "AgentRecord"] | None = None
_cache_mtime: float = 0.0


def _get_file_mtime() -> float:
    try:
        return STATE_FILE.stat().st_mtime if STATE_FILE.exists() else 0.0
    except OSError:
        return 0.0


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

    # --- Workspace origin ---
    project_root: Optional[str] = None  # project root (bij --direct mode)

    # --- Remote execution ---
    remote_host: Optional[str] = None       # SSH host voor remote agents (bijv. user@host)
    remote_workspace: Optional[str] = None  # Pad naar workspace op remote host

    def __post_init__(self) -> None:
        """Bereken task_hash als nog niet ingesteld."""
        if not self.task_hash and self.task:
            self.task_hash = _task_hash(self.task)


def _ensure_dir() -> None:
    OA_DIR.mkdir(parents=True, exist_ok=True)


def load_agents() -> dict[str, AgentRecord]:
    """Load all agents from state file (with shared lock).

    PERF: Returns cached in-memory copy when file mtime is unchanged,
    avoiding redundant JSON parses within a single request cycle.
    """
    global _cache, _cache_mtime
    current_mtime = _get_file_mtime()
    if _cache is not None and current_mtime == _cache_mtime:
        # PERF: Cache hit — file unchanged since last read
        return dict(_cache)
    if not STATE_FILE.exists():
        _cache = {}
        _cache_mtime = 0.0
        return {}
    with open(STATE_FILE, "r") as f:
        fcntl.flock(f, fcntl.LOCK_SH)
        try:
            raw = json.load(f)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
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
        data.setdefault("project_root", None)
        data.setdefault("remote_host", None)
        data.setdefault("remote_workspace", None)
        result[name] = AgentRecord(**data)
    # PERF: Store in cache keyed by current mtime
    _cache = result
    _cache_mtime = current_mtime
    return dict(result)


def save_agents(agents: dict[str, AgentRecord]) -> None:
    """Write agents dict to state file (with exclusive lock).

    PERF: Updates in-memory cache after write-through so subsequent
    load_agents() calls within the same process skip disk I/O.
    """
    global _cache, _cache_mtime
    _ensure_dir()
    raw = {name: asdict(rec) for name, rec in agents.items()}
    # FIX: Atomic write via temp file + rename to eliminate race condition.
    # Previous pattern opened with mode 'w' (truncating immediately) BEFORE
    # acquiring the exclusive lock — two concurrent callers could both truncate
    # the file before either obtained the lock, corrupting agents.json permanently.
    import os
    import tempfile
    tmp_fd, tmp_path = tempfile.mkstemp(dir=OA_DIR, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w") as f:
            json.dump(raw, f, indent=2)
            f.write("\n")
        Path(tmp_path).replace(STATE_FILE)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise
    # PERF: Write-through cache update — avoids immediate re-read after save
    _cache = dict(agents)
    try:
        _cache_mtime = STATE_FILE.stat().st_mtime
    except OSError:
        _cache = None  # fallback: let next load_agents() re-read from disk


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
