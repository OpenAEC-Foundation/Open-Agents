"""Tests for Agent Teams functionality — teams, tasks, and messaging (Sprint 17).

Coverage:
  - teams.py:     create_team, list_teams, delete_team
  - task_list.py: create_task, claim (in_progress), complete, list_tasks
  - messaging.py: send_message, read_inbox (unread), broadcast, shutdown request
  - CLI:          team create/list, task create+claim, task done
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

import open_agents.messaging as messaging_module
import open_agents.state as state_module
import open_agents.task_list as task_list_module
import open_agents.teams as teams_module
from open_agents.messaging import broadcast_message, read_inbox, send_message
from open_agents.state import AgentRecord, add_agent
from open_agents.task_list import create_task, delete_task, get_task, list_tasks, update_task
from open_agents.teams import (
    add_member,
    create_team,
    delete_team,
    get_team,
    list_teams,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def isolated_dirs(tmp_path, monkeypatch):
    """Redirect all ~/.oa sub-paths to tmp_path so each test is fully isolated."""
    oa_dir = tmp_path / ".oa"
    oa_dir.mkdir(parents=True, exist_ok=True)

    # teams.py
    monkeypatch.setattr(teams_module, "OA_DIR", oa_dir)
    monkeypatch.setattr(teams_module, "TEAMS_DIR", oa_dir / "teams")

    # task_list.py
    monkeypatch.setattr(task_list_module, "OA_DIR", oa_dir)
    monkeypatch.setattr(task_list_module, "TASKS_DIR", oa_dir / "tasks")

    # messaging.py
    monkeypatch.setattr(messaging_module, "MESSAGES_DIR", oa_dir / "messages")
    monkeypatch.setattr(messaging_module, "BROADCAST_DIR", oa_dir / "messages" / "_broadcast")

    # state.py (used by broadcast_message → list_agents)
    monkeypatch.setattr(state_module, "OA_DIR", oa_dir)
    monkeypatch.setattr(state_module, "STATE_FILE", oa_dir / "agents.json")
    state_module._cache = None
    state_module._cache_mtime = 0.0

    return oa_dir


# ---------------------------------------------------------------------------
# TeamManager tests — teams.py
# ---------------------------------------------------------------------------


class TestCreateTeam:
    def test_create_team_returns_config(self):
        cfg = create_team("alpha")
        assert cfg["name"] == "alpha"
        assert cfg["members"] == []

    def test_create_team_with_members(self):
        cfg = create_team("beta", members=["agent-1", "agent-2"])
        assert "agent-1" in cfg["members"]
        assert "agent-2" in cfg["members"]

    def test_create_team_writes_config_json(self, isolated_dirs):
        create_team("gamma")
        config_path = isolated_dirs / "teams" / "gamma" / "config.json"
        assert config_path.exists()
        raw = json.loads(config_path.read_text())
        assert raw["name"] == "gamma"

    def test_create_team_config_has_timestamps(self):
        cfg = create_team("delta")
        assert "created_at" in cfg
        assert "updated_at" in cfg
        assert cfg["created_at"] > 0


class TestListTeams:
    def test_list_teams_empty_when_none_exist(self):
        assert list_teams() == []

    def test_list_teams_returns_all(self):
        create_team("team-a")
        create_team("team-b")
        teams = list_teams()
        names = [t["name"] for t in teams]
        assert "team-a" in names
        assert "team-b" in names

    def test_list_teams_sorted_by_name(self):
        create_team("zebra")
        create_team("apple")
        create_team("mango")
        teams = list_teams()
        names = [t["name"] for t in teams]
        assert names == sorted(names)

    def test_list_teams_returns_dicts(self):
        create_team("x")
        teams = list_teams()
        assert all(isinstance(t, dict) for t in teams)


class TestDeleteTeam:
    def test_delete_existing_team_returns_true(self):
        create_team("to-delete")
        result = delete_team("to-delete")
        assert result is True

    def test_delete_removes_team_from_list(self):
        create_team("gone")
        delete_team("gone")
        names = [t["name"] for t in list_teams()]
        assert "gone" not in names

    def test_delete_nonexistent_team_returns_false(self):
        result = delete_team("phantom")
        assert result is False

    def test_delete_removes_config_file(self, isolated_dirs):
        create_team("cleanup")
        delete_team("cleanup")
        assert not (isolated_dirs / "teams" / "cleanup").exists()


# ---------------------------------------------------------------------------
# TeamManager tests — task_list.py
# ---------------------------------------------------------------------------


class TestCreateTask:
    def test_create_task_returns_dict(self):
        task = create_task("squad", "Write tests")
        assert isinstance(task, dict)
        assert task["title"] == "Write tests"
        assert task["team"] == "squad"

    def test_create_task_default_status_pending(self):
        task = create_task("squad", "Review PR")
        assert task["status"] == "pending"

    def test_create_task_generates_unique_id(self):
        t1 = create_task("squad", "Task A")
        t2 = create_task("squad", "Task B")
        assert t1["id"] != t2["id"]

    def test_create_task_writes_json_file(self, isolated_dirs):
        task = create_task("squad", "Deploy")
        task_file = isolated_dirs / "tasks" / "squad" / f"{task['id']}.json"
        assert task_file.exists()
        raw = json.loads(task_file.read_text())
        assert raw["title"] == "Deploy"

    def test_create_task_with_description(self):
        task = create_task("squad", "Fix bug", description="Null pointer in login")
        assert task["description"] == "Null pointer in login"

    def test_create_task_with_blocked_by(self):
        blocker = create_task("squad", "Setup env")
        task = create_task("squad", "Run tests", blocked_by=[blocker["id"]])
        assert blocker["id"] in task["blocked_by"]

    def test_create_task_with_assigned_to(self):
        task = create_task("squad", "Document API", assigned_to="agent-docs")
        assert task["assigned_to"] == "agent-docs"


class TestClaimTask:
    def test_claim_task_sets_status_in_progress(self):
        task = create_task("team1", "Build feature")
        claimed = update_task("team1", task["id"], "in_progress")
        assert claimed["status"] == "in_progress"

    def test_claim_task_persists_to_disk(self, isolated_dirs):
        task = create_task("team1", "Write docs")
        update_task("team1", task["id"], "in_progress")
        raw = json.loads(
            (isolated_dirs / "tasks" / "team1" / f"{task['id']}.json").read_text()
        )
        assert raw["status"] == "in_progress"

    def test_claim_nonexistent_task_raises(self):
        with pytest.raises(FileNotFoundError):
            update_task("team1", "nonexistent-id", "in_progress")


class TestClaimTaskAlreadyClaimed:
    @pytest.mark.xfail(
        reason="Conflict detection not yet implemented — architect to add claim_task()",
        strict=False,
    )
    def test_claim_task_already_claimed_raises_conflict(self):
        """Claiming an in_progress task should raise a ConflictError (TDD).

        The architect should implement a claim_task() function in task_list.py
        that raises when assigned_to is already set and task is in_progress.
        """
        from open_agents.task_list import claim_task  # type: ignore[attr-defined]

        task = create_task("cteam", "Exclusive work")
        claim_task("cteam", task["id"], agent="agent-alpha")
        # Second claim by a different agent should raise
        with pytest.raises(Exception, match="already claimed"):
            claim_task("cteam", task["id"], agent="agent-beta")


class TestCompleteTaskUnblocksDependent:
    @pytest.mark.xfail(
        reason="Auto-unblocking not yet implemented — architect to add to update_task()",
        strict=False,
    )
    def test_complete_task_unblocks_dependent(self):
        """Completing task A should set blocked task B back to 'pending' (TDD).

        The architect should update update_task() to scan for tasks blocked_by
        the completed task and change their status to 'pending'.
        """
        t1 = create_task("blkteam", "Prerequisite")
        t2 = create_task("blkteam", "Dependent", blocked_by=[t1["id"]])

        # Initially dependent is pending (or blocked)
        update_task("blkteam", t2["id"], "blocked")

        # Complete the blocker
        update_task("blkteam", t1["id"], "completed")

        # t2 should now be unblocked
        t2_now = get_task("blkteam", t2["id"])
        assert t2_now["status"] == "pending"


class TestListTasksFilteredByTeam:
    def test_list_tasks_returns_only_team_tasks(self):
        create_task("team-a", "Task for A")
        create_task("team-b", "Task for B")
        tasks_a = list_tasks("team-a")
        assert len(tasks_a) == 1
        assert tasks_a[0]["title"] == "Task for A"

    def test_list_tasks_empty_when_none_exist(self):
        assert list_tasks("empty-team") == []

    def test_list_tasks_sorted_by_creation_time(self):
        create_task("ordered", "First")
        create_task("ordered", "Second")
        create_task("ordered", "Third")
        tasks = list_tasks("ordered")
        times = [t["created_at"] for t in tasks]
        assert times == sorted(times)

    def test_list_tasks_returns_all_statuses(self):
        t = create_task("mixed", "A task")
        update_task("mixed", t["id"], "in_progress")
        create_task("mixed", "Another task")  # pending
        tasks = list_tasks("mixed")
        statuses = {t["status"] for t in tasks}
        assert "in_progress" in statuses
        assert "pending" in statuses


# ---------------------------------------------------------------------------
# TeamManager tests — messaging.py
# ---------------------------------------------------------------------------


class TestSendMessage:
    def test_send_message_returns_path(self):
        path = send_message("alice", "bob", "Hello Bob")
        assert isinstance(path, Path)
        assert path.exists()

    def test_send_message_creates_inbox_file(self, isolated_dirs):
        send_message("sender", "recipient", "Hi there")
        inbox = isolated_dirs / "messages" / "recipient" / "inbox"
        files = list(inbox.glob("*.json"))
        assert len(files) == 1

    def test_send_message_content_correct(self, isolated_dirs):
        send_message("alice", "bob", "Test content")
        inbox = isolated_dirs / "messages" / "bob" / "inbox"
        msg = json.loads(next(inbox.glob("*.json")).read_text())
        assert msg["content"] == "Test content"
        assert msg["from"] == "alice"
        assert msg["to"] == "bob"

    def test_send_message_default_unread(self, isolated_dirs):
        send_message("x", "y", "unread msg")
        inbox = isolated_dirs / "messages" / "y" / "inbox"
        msg = json.loads(next(inbox.glob("*.json")).read_text())
        assert msg["read"] is False

    def test_send_message_with_metadata(self, isolated_dirs):
        send_message("ctrl", "worker", "shutdown", metadata={"type": "shutdown"})
        inbox = isolated_dirs / "messages" / "worker" / "inbox"
        msg = json.loads(next(inbox.glob("*.json")).read_text())
        assert msg["metadata"]["type"] == "shutdown"

    def test_send_multiple_messages(self, isolated_dirs):
        import time
        send_message("a", "b", "msg 1")
        time.sleep(0.01)  # ensure distinct filenames (ms-based naming)
        send_message("a", "b", "msg 2")
        inbox = isolated_dirs / "messages" / "b" / "inbox"
        assert len(list(inbox.glob("*.json"))) == 2


class TestGetMessagesUnreadOnly:
    def test_read_inbox_returns_unread_messages(self, isolated_dirs):
        import time
        send_message("alpha", "beta", "Message 1")
        time.sleep(0.01)  # ensure distinct filenames (timestamp-based)
        send_message("alpha", "beta", "Message 2")
        msgs = read_inbox("beta", unread_only=True, include_broadcast=False)
        assert len(msgs) == 2

    def test_read_inbox_unread_only_excludes_read(self, isolated_dirs):
        send_message("alpha", "beta", "Read me")
        inbox = isolated_dirs / "messages" / "beta" / "inbox"
        # Manually mark the message as read
        f = next(inbox.glob("*.json"))
        data = json.loads(f.read_text())
        data["read"] = True
        f.write_text(json.dumps(data))

        msgs = read_inbox("beta", unread_only=True, include_broadcast=False)
        assert len(msgs) == 0

    def test_read_inbox_all_returns_read_and_unread(self, isolated_dirs):
        send_message("x", "y", "Unread")
        inbox = isolated_dirs / "messages" / "y" / "inbox"
        f = next(inbox.glob("*.json"))
        data = json.loads(f.read_text())
        data["read"] = True
        f.write_text(json.dumps(data))

        send_message("x", "y", "Also unread")
        msgs = read_inbox("y", unread_only=False, include_broadcast=False)
        assert len(msgs) == 2

    def test_read_inbox_empty_for_unknown_agent(self):
        msgs = read_inbox("nobody", unread_only=True)
        assert msgs == []

    def test_read_inbox_sorted_newest_first(self, isolated_dirs):
        import time
        send_message("a", "b", "older")
        time.sleep(0.01)
        send_message("a", "b", "newer")
        msgs = read_inbox("b", unread_only=True, include_broadcast=False)
        assert msgs[0]["content"] == "newer"


class TestBroadcast:
    def test_broadcast_writes_to_broadcast_dir(self, isolated_dirs):
        broadcast_message("orchestrator", "All hands on deck")
        bcast_dir = isolated_dirs / "messages" / "_broadcast"
        files = list(bcast_dir.glob("*.json"))
        assert len(files) == 1

    def test_broadcast_content_correct(self, isolated_dirs):
        broadcast_message("ctl", "Deploy now")
        bcast_dir = isolated_dirs / "messages" / "_broadcast"
        msg = json.loads(next(bcast_dir.glob("*.json")).read_text())
        assert msg["content"] == "Deploy now"
        assert msg["from"] == "ctl"
        assert msg["to"] == "_broadcast"

    def test_broadcast_delivers_to_running_agents(self, isolated_dirs):
        # Register running agents in state
        add_agent(
            AgentRecord(
                name="worker-1",
                task="work",
                workspace=str(isolated_dirs / "ws1"),
                tmux_window="w1",
                status="running",
            )
        )
        add_agent(
            AgentRecord(
                name="worker-2",
                task="work",
                workspace=str(isolated_dirs / "ws2"),
                tmux_window="w2",
                status="running",
            )
        )
        broadcast_message("boss", "Meeting now")
        # Each worker should have received a copy
        inbox1 = isolated_dirs / "messages" / "worker-1" / "inbox"
        inbox2 = isolated_dirs / "messages" / "worker-2" / "inbox"
        assert len(list(inbox1.glob("*.json"))) == 1
        assert len(list(inbox2.glob("*.json"))) == 1

    def test_broadcast_does_not_deliver_to_sender(self, isolated_dirs):
        add_agent(
            AgentRecord(
                name="self-sender",
                task="t",
                workspace=str(isolated_dirs / "ws"),
                tmux_window="w",
                status="running",
            )
        )
        broadcast_message("self-sender", "I am talking to myself")
        inbox = isolated_dirs / "messages" / "self-sender" / "inbox"
        assert not inbox.exists() or len(list(inbox.glob("*.json"))) == 0

    def test_broadcast_exclude_list_respected(self, isolated_dirs):
        add_agent(
            AgentRecord(
                name="excluded-agent",
                task="t",
                workspace=str(isolated_dirs / "ws"),
                tmux_window="w",
                status="running",
            )
        )
        broadcast_message("boss", "Not for you", exclude=["excluded-agent"])
        inbox = isolated_dirs / "messages" / "excluded-agent" / "inbox"
        assert not inbox.exists() or len(list(inbox.glob("*.json"))) == 0

    def test_broadcast_returns_list_of_paths(self, isolated_dirs):
        paths = broadcast_message("ctl", "Hello")
        assert isinstance(paths, list)
        assert all(isinstance(p, Path) for p in paths)


class TestShutdownRequest:
    def test_shutdown_request_delivered_as_message(self, isolated_dirs):
        """Shutdown requests are sent as messages with metadata type='shutdown'."""
        send_message(
            sender="orchestrator",
            recipient="worker",
            content="shutdown",
            metadata={"type": "shutdown"},
        )
        msgs = read_inbox("worker", unread_only=True, include_broadcast=False)
        assert len(msgs) == 1
        assert msgs[0]["metadata"]["type"] == "shutdown"

    def test_shutdown_request_readable_by_target_agent(self, isolated_dirs):
        send_message("ctrl", "agent-x", "Please shut down", metadata={"type": "shutdown"})
        msgs = read_inbox("agent-x", include_broadcast=False)
        shutdown_msgs = [m for m in msgs if m.get("metadata", {}).get("type") == "shutdown"]
        assert len(shutdown_msgs) == 1

    def test_shutdown_request_not_received_by_other_agent(self, isolated_dirs):
        send_message("ctrl", "agent-target", "shutdown", metadata={"type": "shutdown"})
        msgs = read_inbox("agent-bystander", include_broadcast=False)
        assert len(msgs) == 0


# ---------------------------------------------------------------------------
# CLI integration tests
# ---------------------------------------------------------------------------


@pytest.fixture()
def cli_runner(isolated_dirs, monkeypatch):
    """Return a Typer CliRunner with the app, with all paths isolated."""
    from typer.testing import CliRunner
    from open_agents.cli import app

    monkeypatch.setenv("OA_DIR", str(isolated_dirs))
    runner = CliRunner()
    return runner, app, isolated_dirs


class TestCliTeamCreate:
    def test_cli_team_create_exits_zero(self, cli_runner):
        runner, app, _ = cli_runner
        result = runner.invoke(app, ["team", "create", "my-team"])
        assert result.exit_code == 0

    def test_cli_team_create_output_contains_name(self, cli_runner):
        runner, app, _ = cli_runner
        result = runner.invoke(app, ["team", "create", "squad-alpha"])
        assert "squad-alpha" in result.output

    def test_cli_team_create_writes_config(self, cli_runner):
        runner, app, oa_dir = cli_runner
        runner.invoke(app, ["team", "create", "new-squad"])
        cfg = get_team("new-squad")
        assert cfg is not None
        assert cfg["name"] == "new-squad"

    def test_cli_team_create_with_members(self, cli_runner):
        runner, app, _ = cli_runner
        result = runner.invoke(
            app,
            ["team", "create", "elite", "--member", "agent-a", "--member", "agent-b"],
        )
        assert result.exit_code == 0
        cfg = get_team("elite")
        assert "agent-a" in cfg["members"]
        assert "agent-b" in cfg["members"]


class TestCliTeamList:
    def test_cli_team_list_empty(self, cli_runner):
        runner, app, _ = cli_runner
        result = runner.invoke(app, ["team", "list"])
        assert result.exit_code == 0
        assert "No teams found" in result.output

    def test_cli_team_list_shows_teams(self, cli_runner):
        runner, app, _ = cli_runner
        runner.invoke(app, ["team", "create", "visible-team"])
        result = runner.invoke(app, ["team", "list"])
        assert result.exit_code == 0
        assert "visible-team" in result.output

    def test_cli_team_list_multiple_teams(self, cli_runner):
        runner, app, _ = cli_runner
        runner.invoke(app, ["team", "create", "team-one"])
        runner.invoke(app, ["team", "create", "team-two"])
        result = runner.invoke(app, ["team", "list"])
        assert "team-one" in result.output
        assert "team-two" in result.output


class TestCliTaskCreateAndClaim:
    def test_cli_task_create_exits_zero(self, cli_runner):
        runner, app, _ = cli_runner
        result = runner.invoke(app, ["task", "create", "my-team", "Build the thing"])
        assert result.exit_code == 0

    def test_cli_task_create_output_contains_title(self, cli_runner):
        runner, app, _ = cli_runner
        result = runner.invoke(app, ["task", "create", "alpha", "Write unit tests"])
        assert "Write unit tests" in result.output

    def test_cli_task_create_writes_task_file(self, cli_runner):
        runner, app, _ = cli_runner
        runner.invoke(app, ["task", "create", "my-team", "Deploy to prod"])
        tasks = list_tasks("my-team")
        assert len(tasks) == 1
        assert tasks[0]["title"] == "Deploy to prod"

    def test_cli_task_claim_via_update(self, cli_runner):
        """Claim a task by setting status to in_progress via 'task update'."""
        runner, app, _ = cli_runner
        runner.invoke(app, ["task", "create", "squad", "Fix the login bug"])
        task_id = list_tasks("squad")[0]["id"]
        result = runner.invoke(app, ["task", "update", "squad", task_id, "in_progress"])
        assert result.exit_code == 0
        updated = get_task("squad", task_id)
        assert updated["status"] == "in_progress"


class TestCliTaskComplete:
    def test_cli_task_done_exits_zero(self, cli_runner):
        runner, app, _ = cli_runner
        runner.invoke(app, ["task", "create", "finish-team", "A task"])
        task_id = list_tasks("finish-team")[0]["id"]
        result = runner.invoke(app, ["task", "done", "finish-team", task_id])
        assert result.exit_code == 0

    def test_cli_task_done_marks_completed(self, cli_runner):
        runner, app, _ = cli_runner
        runner.invoke(app, ["task", "create", "finish-team", "Deployable"])
        task_id = list_tasks("finish-team")[0]["id"]
        runner.invoke(app, ["task", "done", "finish-team", task_id])
        task = get_task("finish-team", task_id)
        assert task["status"] == "completed"

    def test_cli_task_done_nonexistent_exits_nonzero(self, cli_runner):
        runner, app, _ = cli_runner
        result = runner.invoke(app, ["task", "done", "ghost-team", "no-such-id"])
        assert result.exit_code != 0

    def test_cli_task_done_output_confirms_completion(self, cli_runner):
        runner, app, _ = cli_runner
        runner.invoke(app, ["task", "create", "my-team", "Final task"])
        task_id = list_tasks("my-team")[0]["id"]
        result = runner.invoke(app, ["task", "done", "my-team", task_id])
        assert "completed" in result.output.lower()
