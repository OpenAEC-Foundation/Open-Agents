"""Inter-agent messaging — file-based message passing between agents.

Messages are stored as JSON files in ~/.oa/messages/<agent>/inbox/.
Broadcast messages go to ~/.oa/messages/_broadcast/.
Uses file locking for safe concurrent access.
"""

from __future__ import annotations

import fcntl
import json
import time
from pathlib import Path
from typing import Optional

from .config import OA_DIR

MESSAGES_DIR = OA_DIR / "messages"
BROADCAST_DIR = MESSAGES_DIR / "_broadcast"


def _ensure_inbox(agent_name: str) -> Path:
    """Ensure the inbox directory exists for an agent."""
    inbox = MESSAGES_DIR / agent_name / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    return inbox


def _ensure_broadcast() -> Path:
    """Ensure the broadcast directory exists."""
    BROADCAST_DIR.mkdir(parents=True, exist_ok=True)
    return BROADCAST_DIR


def _msg_filename(sender: str) -> str:
    """Generate a unique message filename: <timestamp_ms>-<sender>.json."""
    ts = int(time.time() * 1000)
    return f"{ts}-{sender}.json"


def send_message(
    sender: str,
    recipient: str,
    content: str,
    metadata: Optional[dict] = None,
) -> Path:
    """Send a direct message from one agent to another.

    Returns the path of the written message file.
    """
    inbox = _ensure_inbox(recipient)
    msg = {
        "from": sender,
        "to": recipient,
        "content": content,
        "timestamp": time.time(),
        "read": False,
    }
    if metadata:
        msg["metadata"] = metadata

    msg_path = inbox / _msg_filename(sender)
    with open(msg_path, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            json.dump(msg, f, indent=2)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
    return msg_path


def broadcast_message(
    sender: str,
    content: str,
    exclude: Optional[list[str]] = None,
) -> list[Path]:
    """Send a message to all agents (via broadcast dir + individual inboxes).

    Also writes to each running agent's inbox for immediate visibility.
    Returns list of message paths written.
    """
    from .state import list_agents

    exclude = exclude or []
    paths = []

    # Write to broadcast dir (permanent record)
    bcast_dir = _ensure_broadcast()
    msg = {
        "from": sender,
        "to": "_broadcast",
        "content": content,
        "timestamp": time.time(),
        "read": False,
    }
    bcast_path = bcast_dir / _msg_filename(sender)
    with open(bcast_path, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            json.dump(msg, f, indent=2)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
    paths.append(bcast_path)

    # Deliver to each running agent's inbox
    agents = list_agents(status="running")
    for agent in agents:
        if agent.name != sender and agent.name not in exclude:
            p = send_message(sender, agent.name, content, metadata={"broadcast": True})
            paths.append(p)

    return paths


def read_inbox(
    agent_name: str,
    unread_only: bool = False,
    limit: int = 50,
    include_broadcast: bool = True,
) -> list[dict]:
    """Read messages from an agent's inbox.

    Returns messages sorted by timestamp (newest first).
    """
    messages = []

    # Read direct messages
    inbox = MESSAGES_DIR / agent_name / "inbox"
    if inbox.exists():
        for msg_file in inbox.glob("*.json"):
            try:
                with open(msg_file, "r") as f:
                    fcntl.flock(f, fcntl.LOCK_SH)
                    try:
                        msg = json.load(f)
                    finally:
                        fcntl.flock(f, fcntl.LOCK_UN)
                msg["_file"] = str(msg_file)
                if not unread_only or not msg.get("read", False):
                    messages.append(msg)
            except (json.JSONDecodeError, OSError):
                continue

    # Include broadcast messages (if not already delivered to inbox)
    if include_broadcast and BROADCAST_DIR.exists():
        seen_timestamps = {m.get("timestamp") for m in messages}
        for msg_file in BROADCAST_DIR.glob("*.json"):
            try:
                with open(msg_file, "r") as f:
                    fcntl.flock(f, fcntl.LOCK_SH)
                    try:
                        msg = json.load(f)
                    finally:
                        fcntl.flock(f, fcntl.LOCK_UN)
                # Skip if sender is the agent itself
                if msg.get("from") == agent_name:
                    continue
                # Skip if already in inbox (delivered by broadcast_message)
                if msg.get("timestamp") in seen_timestamps:
                    continue
                msg["_file"] = str(msg_file)
                msg["_broadcast"] = True
                if not unread_only or not msg.get("read", False):
                    messages.append(msg)
            except (json.JSONDecodeError, OSError):
                continue

    # Sort newest first, limit
    messages.sort(key=lambda m: m.get("timestamp", 0), reverse=True)
    return messages[:limit]


def mark_read(agent_name: str, msg_file: Optional[str] = None) -> int:
    """Mark messages as read. If msg_file given, mark just that one.

    Returns number of messages marked.
    """
    count = 0
    inbox = MESSAGES_DIR / agent_name / "inbox"
    if not inbox.exists():
        return 0

    files = [Path(msg_file)] if msg_file else list(inbox.glob("*.json"))

    for f_path in files:
        if not f_path.exists():
            continue
        try:
            with open(f_path, "r") as f:
                fcntl.flock(f, fcntl.LOCK_SH)
                try:
                    msg = json.load(f)
                finally:
                    fcntl.flock(f, fcntl.LOCK_UN)
            if not msg.get("read", False):
                msg["read"] = True
                with open(f_path, "w") as f:
                    fcntl.flock(f, fcntl.LOCK_EX)
                    try:
                        json.dump(msg, f, indent=2)
                    finally:
                        fcntl.flock(f, fcntl.LOCK_UN)
                count += 1
        except (json.JSONDecodeError, OSError):
            continue
    return count


def unread_count(agent_name: str) -> int:
    """Count unread messages for an agent."""
    return len(read_inbox(agent_name, unread_only=True))


def cleanup_messages(agent_name: str) -> int:
    """Remove all messages for an agent. Returns count of removed files."""
    import shutil
    agent_dir = MESSAGES_DIR / agent_name
    if not agent_dir.exists():
        return 0
    count = sum(1 for _ in agent_dir.rglob("*.json"))
    shutil.rmtree(agent_dir)
    return count


def list_conversations(agent_name: str) -> dict[str, int]:
    """List unique senders and message counts for an agent's inbox."""
    messages = read_inbox(agent_name, include_broadcast=False)
    convos: dict[str, int] = {}
    for msg in messages:
        sender = msg.get("from", "unknown")
        convos[sender] = convos.get(sender, 0) + 1
    return convos
