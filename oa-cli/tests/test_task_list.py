"""Tests for open_agents.task_list — Sprint 17."""

from __future__ import annotations

import threading
from typing import List

import pytest

from open_agents.task_list import (
    claim_task,
    complete_task,
    create_task,
    get_task,
    list_tasks,
    update_task,
)


@pytest.fixture(autouse=True)
def isolated(oa_path):
    """Ensure all task_list paths use the isolated tmp directory."""
    return oa_path


# ---------------------------------------------------------------------------
# test_create_task
# ---------------------------------------------------------------------------


def test_create_task():
    """create_task returns a dict with an id and status=pending."""
    task = create_task("team-a", "Build login page")
    assert isinstance(task, dict)
    assert "id" in task
    assert task["id"]
    assert task["title"] == "Build login page"
    assert task["team"] == "team-a"
    assert task["status"] == "pending"


# ---------------------------------------------------------------------------
# test_list_tasks
# ---------------------------------------------------------------------------


def test_list_tasks():
    """list_tasks returns only tasks belonging to the requested team."""
    create_task("alpha", "Task 1")
    create_task("alpha", "Task 2")
    create_task("beta", "Task X")

    alpha_tasks = list_tasks("alpha")
    assert len(alpha_tasks) == 2
    titles = {t["title"] for t in alpha_tasks}
    assert titles == {"Task 1", "Task 2"}

    beta_tasks = list_tasks("beta")
    assert len(beta_tasks) == 1

    assert list_tasks("empty-team") == []


# ---------------------------------------------------------------------------
# test_claim_task
# ---------------------------------------------------------------------------


def test_claim_task():
    """claim_task sets status to in_progress and records the agent name."""
    task = create_task("squad", "Fix the bug")
    claimed = claim_task("squad", task["id"], "agent-alpha")
    assert claimed["status"] == "in_progress"
    assert claimed["assigned_to"] == "agent-alpha"

    # Persisted to disk
    on_disk = get_task("squad", task["id"])
    assert on_disk["status"] == "in_progress"
    assert on_disk["assigned_to"] == "agent-alpha"


# ---------------------------------------------------------------------------
# test_claim_task_blocked
# ---------------------------------------------------------------------------


def test_claim_task_blocked():
    """Claiming a non-pending task raises ValueError."""
    task = create_task("squad", "Blocked task")
    # Set to blocked status so it cannot be claimed
    update_task("squad", task["id"], "blocked")

    with pytest.raises(ValueError, match=task["id"]):
        claim_task("squad", task["id"], "agent-x")


# ---------------------------------------------------------------------------
# test_complete_task_unblocks
# ---------------------------------------------------------------------------


def test_complete_task_unblocks():
    """Completing task A removes it from blocked_by and unblocks task B."""
    task_a = create_task("proj", "Prerequisite")
    task_b = create_task("proj", "Dependent task", blocked_by=[task_a["id"]])

    # Manually set task_b to blocked (simulate a workflow engine doing this)
    update_task("proj", task_b["id"], "blocked")
    assert get_task("proj", task_b["id"])["status"] == "blocked"

    # Complete the blocker
    complete_task("proj", task_a["id"])

    # task_b should now be unblocked (status → pending)
    refreshed = get_task("proj", task_b["id"])
    assert task_a["id"] not in refreshed["blocked_by"]
    assert refreshed["status"] == "pending"


# ---------------------------------------------------------------------------
# test_file_locking
# ---------------------------------------------------------------------------


def test_file_locking():
    """Concurrent claim_task calls yield exactly one winner and one loser."""
    task = create_task("lock-team", "Shared task")

    winners: List[str] = []
    errors: List[Exception] = []

    def try_claim(agent: str) -> None:
        try:
            claim_task("lock-team", task["id"], agent)
            winners.append(agent)
        except ValueError as e:
            errors.append(e)

    t1 = threading.Thread(target=try_claim, args=("agent-1",))
    t2 = threading.Thread(target=try_claim, args=("agent-2",))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Exactly one agent wins, one gets a ValueError
    assert len(winners) == 1
    assert len(errors) == 1
