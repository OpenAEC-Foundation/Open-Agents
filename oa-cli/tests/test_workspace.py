"""Unit tests for open_agents.workspace."""

from __future__ import annotations

from pathlib import Path

import pytest

from open_agents.workspace import (
    cleanup_workspace,
    create_workspace,
    list_proposals,
    read_output,
    workspace_is_done,
)


# ---------------------------------------------------------------------------
# create_workspace
# ---------------------------------------------------------------------------

class TestCreateWorkspace:
    def test_returns_existing_directory(self):
        ws = create_workspace("agent1", "Build a widget")
        try:
            assert ws.exists()
            assert ws.is_dir()
        finally:
            cleanup_workspace(ws)

    def test_workspace_prefix(self):
        ws = create_workspace("myagent", "task")
        try:
            assert ws.name.startswith("oa-agent-")
        finally:
            cleanup_workspace(ws)

    def test_output_directory_created(self):
        ws = create_workspace("agent2", "Do stuff")
        try:
            assert (ws / "output").is_dir()
        finally:
            cleanup_workspace(ws)

    def test_claude_md_exists(self):
        ws = create_workspace("agent3", "Analyse data")
        try:
            assert (ws / "CLAUDE.md").exists()
        finally:
            cleanup_workspace(ws)

    def test_claude_md_contains_task(self):
        task = "Build a REST API with authentication"
        ws = create_workspace("agent4", task)
        try:
            content = (ws / "CLAUDE.md").read_text()
            assert task in content
        finally:
            cleanup_workspace(ws)

    def test_claude_md_has_task_heading(self):
        task = "My special task"
        ws = create_workspace("heading-test", task)
        try:
            content = (ws / "CLAUDE.md").read_text()
            assert f"# Taak: {task}" in content
        finally:
            cleanup_workspace(ws)

    def test_claude_md_has_instructions_section(self):
        ws = create_workspace("instr-test", "any task")
        try:
            content = (ws / "CLAUDE.md").read_text()
            assert "## Instructies" in content
        finally:
            cleanup_workspace(ws)

    def test_claude_md_has_output_section(self):
        ws = create_workspace("out-test", "any task")
        try:
            content = (ws / "CLAUDE.md").read_text()
            assert "## Output" in content
            assert "./output/" in content
            assert "./output/result.md" in content
            assert ".done" in content
        finally:
            cleanup_workspace(ws)

    def test_claude_md_has_proposal_mode_section(self):
        ws = create_workspace("prop-test", "any task")
        try:
            content = (ws / "CLAUDE.md").read_text()
            assert "## PROPOSAL MODE" in content
        finally:
            cleanup_workspace(ws)

    def test_claude_md_proposal_mode_no_external_files(self):
        ws = create_workspace("prop-constraint-test", "any task")
        try:
            content = (ws / "CLAUDE.md").read_text()
            assert "Wijzig NOOIT bestanden buiten" in content
        finally:
            cleanup_workspace(ws)

    def test_claude_md_proposal_dir_instructions(self):
        ws = create_workspace("prop-dir-test", "any task")
        try:
            content = (ws / "CLAUDE.md").read_text()
            assert "./output/proposals/" in content
            assert ".proposal.md" in content
            assert "SUMMARY.md" in content
        finally:
            cleanup_workspace(ws)

    def test_claude_md_has_constraints_section(self):
        ws = create_workspace("constraints-test", "any task")
        try:
            content = (ws / "CLAUDE.md").read_text()
            assert "## Constraints" in content
        finally:
            cleanup_workspace(ws)

    def test_different_agents_get_different_workspaces(self):
        ws1 = create_workspace("agent-a", "task")
        ws2 = create_workspace("agent-b", "task")
        try:
            assert ws1 != ws2
        finally:
            cleanup_workspace(ws1)
            cleanup_workspace(ws2)


# ---------------------------------------------------------------------------
# cleanup_workspace
# ---------------------------------------------------------------------------

class TestCleanupWorkspace:
    def test_cleanup_existing_workspace(self):
        ws = create_workspace("cleanup1", "task")
        assert ws.exists()
        result = cleanup_workspace(ws)
        assert result is True
        assert not ws.exists()

    def test_cleanup_accepts_string_path(self):
        ws = create_workspace("cleanup2", "task")
        result = cleanup_workspace(str(ws))
        assert result is True

    def test_cleanup_nonexistent_returns_false(self, tmp_path):
        nonexistent = tmp_path / "does_not_exist"
        assert cleanup_workspace(nonexistent) is False

    def test_cleanup_removes_all_contents(self):
        ws = create_workspace("cleanup3", "task")
        # Add extra files
        (ws / "extra.txt").write_text("extra")
        (ws / "output" / "result.md").write_text("result")
        cleanup_workspace(ws)
        assert not ws.exists()


# ---------------------------------------------------------------------------
# workspace_is_done
# ---------------------------------------------------------------------------

class TestWorkspaceIsDone:
    def test_not_done_initially(self, tmp_path):
        assert workspace_is_done(tmp_path) is False

    def test_done_after_dot_done_file(self, tmp_path):
        (tmp_path / ".done").touch()
        assert workspace_is_done(tmp_path) is True

    def test_accepts_string_path(self, tmp_path):
        (tmp_path / ".done").touch()
        assert workspace_is_done(str(tmp_path)) is True

    def test_other_files_do_not_trigger_done(self, tmp_path):
        (tmp_path / "done").touch()   # no dot
        (tmp_path / ".done.txt").touch()
        assert workspace_is_done(tmp_path) is False


# ---------------------------------------------------------------------------
# read_output
# ---------------------------------------------------------------------------

class TestReadOutput:
    def test_returns_none_when_no_output_dir(self, tmp_path):
        assert read_output(tmp_path) is None

    def test_returns_none_when_output_dir_empty(self, tmp_path):
        (tmp_path / "output").mkdir()
        assert read_output(tmp_path) is None

    def test_reads_result_md(self, tmp_path):
        output = tmp_path / "output"
        output.mkdir()
        (output / "result.md").write_text("# Result\nAll done!")
        assert read_output(tmp_path) == "# Result\nAll done!"

    def test_accepts_string_path(self, tmp_path):
        output = tmp_path / "output"
        output.mkdir()
        (output / "result.md").write_text("content")
        assert read_output(str(tmp_path)) == "content"

    def test_fallback_to_first_md_file(self, tmp_path):
        output = tmp_path / "output"
        output.mkdir()
        (output / "notes.md").write_text("fallback content")
        result = read_output(tmp_path)
        assert result == "fallback content"

    def test_result_md_preferred_over_other_md(self, tmp_path):
        output = tmp_path / "output"
        output.mkdir()
        (output / "result.md").write_text("result content")
        (output / "aaa_first.md").write_text("other content")
        assert read_output(tmp_path) == "result content"

    def test_returns_none_when_no_md_files(self, tmp_path):
        output = tmp_path / "output"
        output.mkdir()
        (output / "data.txt").write_text("not markdown")
        assert read_output(tmp_path) is None


# ---------------------------------------------------------------------------
# list_proposals
# ---------------------------------------------------------------------------

class TestListProposals:
    def test_returns_empty_when_no_proposals_dir(self, tmp_path):
        assert list_proposals(tmp_path) == []

    def test_returns_empty_when_proposals_dir_empty(self, tmp_path):
        (tmp_path / "output" / "proposals").mkdir(parents=True)
        assert list_proposals(tmp_path) == []

    def test_lists_proposal_files(self, tmp_path):
        proposals_dir = tmp_path / "output" / "proposals"
        proposals_dir.mkdir(parents=True)
        (proposals_dir / "file1.proposal.md").write_text("p1")
        (proposals_dir / "file2.proposal.md").write_text("p2")

        result = list_proposals(tmp_path)
        assert len(result) == 2
        assert all(p.suffix == ".md" for p in result)

    def test_returns_paths_sorted(self, tmp_path):
        proposals_dir = tmp_path / "output" / "proposals"
        proposals_dir.mkdir(parents=True)
        (proposals_dir / "z_last.proposal.md").write_text("z")
        (proposals_dir / "a_first.proposal.md").write_text("a")

        result = list_proposals(tmp_path)
        names = [p.name for p in result]
        assert names == sorted(names)

    def test_ignores_non_proposal_files(self, tmp_path):
        proposals_dir = tmp_path / "output" / "proposals"
        proposals_dir.mkdir(parents=True)
        (proposals_dir / "file.proposal.md").write_text("proposal")
        (proposals_dir / "SUMMARY.md").write_text("summary")
        (proposals_dir / "notes.txt").write_text("notes")

        result = list_proposals(tmp_path)
        assert len(result) == 1
        assert result[0].name == "file.proposal.md"

    def test_accepts_string_path(self, tmp_path):
        proposals_dir = tmp_path / "output" / "proposals"
        proposals_dir.mkdir(parents=True)
        (proposals_dir / "x.proposal.md").write_text("x")
        result = list_proposals(str(tmp_path))
        assert len(result) == 1
