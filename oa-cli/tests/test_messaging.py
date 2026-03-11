"""Tests for open_agents.messaging — Sprint 17."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from open_agents.messaging import broadcast_message, read_inbox, send_message


@pytest.fixture(autouse=True)
def isolated(oa_path):
    """Ensure all messaging paths use the isolated tmp directory."""
    return oa_path


# ---------------------------------------------------------------------------
# test_send_message
# ---------------------------------------------------------------------------


def test_send_message():
    """send_message writes a JSON file to the recipient's inbox."""
    path = send_message("alice", "bob", "Hello Bob")

    assert isinstance(path, Path)
    assert path.exists()

    msg = json.loads(path.read_text())
    assert msg["from"] == "alice"
    assert msg["to"] == "bob"
    assert msg["content"] == "Hello Bob"
    assert msg["read"] is False


# ---------------------------------------------------------------------------
# test_read_inbox
# ---------------------------------------------------------------------------


def test_read_inbox(oa_path):
    """read_inbox returns all messages for an agent, newest first."""
    import time

    send_message("sender", "carol", "First message")
    time.sleep(0.01)
    send_message("sender", "carol", "Second message")

    msgs = read_inbox("carol", include_broadcast=False)

    assert len(msgs) == 2
    # Newest first
    assert msgs[0]["content"] == "Second message"
    assert msgs[1]["content"] == "First message"


# ---------------------------------------------------------------------------
# test_broadcast
# ---------------------------------------------------------------------------


def test_broadcast(oa_path):
    """broadcast_message writes to the _broadcast dir and delivers to running agents."""
    from open_agents.state import AgentRecord, add_agent

    # Register two running agents
    add_agent(
        AgentRecord(
            name="worker-a",
            task="work",
            workspace=str(oa_path / "ws-a"),
            tmux_window="w-a",
            status="running",
        )
    )
    add_agent(
        AgentRecord(
            name="worker-b",
            task="work",
            workspace=str(oa_path / "ws-b"),
            tmux_window="w-b",
            status="running",
        )
    )

    paths = broadcast_message("orchestrator", "All hands on deck")

    # Broadcast record written
    bcast_dir = oa_path / "messages" / "_broadcast"
    assert len(list(bcast_dir.glob("*.json"))) == 1

    # Each worker received a copy in their inbox
    inbox_a = oa_path / "messages" / "worker-a" / "inbox"
    inbox_b = oa_path / "messages" / "worker-b" / "inbox"
    assert len(list(inbox_a.glob("*.json"))) == 1
    assert len(list(inbox_b.glob("*.json"))) == 1

    assert isinstance(paths, list)
    assert len(paths) >= 1


# ---------------------------------------------------------------------------
# test_unread_filter
# ---------------------------------------------------------------------------


def test_unread_filter(oa_path):
    """read_inbox with unread_only=True excludes already-read messages."""
    import time

    send_message("x", "dave", "Unread message")
    time.sleep(0.01)
    send_message("x", "dave", "Already read")

    # Manually mark the second message as read
    inbox = oa_path / "messages" / "dave" / "inbox"
    files = sorted(inbox.glob("*.json"))
    data = json.loads(files[-1].read_text())
    data["read"] = True
    files[-1].write_text(json.dumps(data))

    unread = read_inbox("dave", unread_only=True, include_broadcast=False)
    assert len(unread) == 1
    assert unread[0]["content"] == "Unread message"

    all_msgs = read_inbox("dave", unread_only=False, include_broadcast=False)
    assert len(all_msgs) == 2
