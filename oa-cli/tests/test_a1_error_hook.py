"""Tests for A1 post-collect error hook — detect_error_in_output and write_error_lesson_to_workspace."""

from __future__ import annotations

from pathlib import Path

import pytest

from open_agents.lessons import (
    detect_error_in_output,
    write_error_lesson_to_workspace,
)


# ---------------------------------------------------------------------------
# detect_error_in_output
# ---------------------------------------------------------------------------

class TestDetectErrorInOutput:
    def test_detects_traceback(self):
        output = "Starting task...\nTraceback (most recent call last):\n  File 'x.py', line 3\nValueError: bad input"
        is_error, summary = detect_error_in_output(output)
        assert is_error is True
        assert "Traceback" in summary

    def test_detects_error_keyword(self):
        output = "Running...\nError: something went wrong\nDone."
        is_error, summary = detect_error_in_output(output)
        assert is_error is True
        assert "Error" in summary

    def test_detects_failed_keyword(self):
        output = "Step 1 OK\nFAILED: build step 3\nExit code 1"
        is_error, summary = detect_error_in_output(output)
        assert is_error is True
        assert "FAILED" in summary

    def test_detects_exception_keyword(self):
        output = "Running agent\nException: NullPointerException at line 42"
        is_error, summary = detect_error_in_output(output)
        assert is_error is True

    def test_detects_red_cross_emoji(self):
        output = "Task result:\n❌ Step failed — could not connect"
        is_error, summary = detect_error_in_output(output)
        assert is_error is True

    def test_no_error_in_clean_output(self):
        output = "Task completed successfully.\nAll steps passed.\nOutput written to output.md"
        is_error, summary = detect_error_in_output(output)
        assert is_error is False
        assert summary == ""

    def test_empty_output_no_error(self):
        is_error, summary = detect_error_in_output("")
        assert is_error is False

    def test_summary_limited_to_300_chars(self):
        long_line = "Error: " + "x" * 400
        output = f"Header\n{long_line}\nMore lines here"
        is_error, summary = detect_error_in_output(output)
        assert is_error is True
        assert len(summary) <= 300

    def test_summary_contains_up_to_5_lines(self):
        lines = ["Traceback (most recent call last):"] + [f"  line {i}" for i in range(10)]
        output = "\n".join(lines)
        is_error, summary = detect_error_in_output(output)
        assert is_error is True
        # Summary should start at the matching line
        assert summary.startswith("Traceback")


# ---------------------------------------------------------------------------
# write_error_lesson_to_workspace
# ---------------------------------------------------------------------------

class TestWriteErrorLessonToWorkspace:
    def test_creates_lessons_md_if_missing(self, tmp_path):
        lesson_path = write_error_lesson_to_workspace(
            agent_name="test-agent",
            model="claude/sonnet",
            task="Do something important",
            error_summary="Error: something broke",
            workspace_dir=tmp_path,
        )
        assert lesson_path.exists()
        assert lesson_path == tmp_path / "LESSONS.md"

    def test_lesson_contains_required_fields(self, tmp_path):
        lesson_path = write_error_lesson_to_workspace(
            agent_name="agent-42",
            model="claude/opus",
            task="Write a report",
            error_summary="FAILED: step 3 crashed",
            workspace_dir=tmp_path,
        )
        content = lesson_path.read_text()
        assert "agent-42" in content
        assert "claude/opus" in content
        assert "Write a report" in content
        assert "FAILED: step 3 crashed" in content
        assert "A1 leerloop" in content

    def test_lesson_uses_l_auto_prefix(self, tmp_path):
        lesson_path = write_error_lesson_to_workspace(
            agent_name="my-agent",
            model="claude/sonnet",
            task="task",
            error_summary="Error: oops",
            workspace_dir=tmp_path,
        )
        content = lesson_path.read_text()
        assert "## L-AUTO-" in content

    def test_appends_to_existing_lessons_md(self, tmp_path):
        lessons_file = tmp_path / "LESSONS.md"
        lessons_file.write_text("# Existing content\n\n## L-001 — Old lesson\n")

        write_error_lesson_to_workspace(
            agent_name="agent-a",
            model="claude/haiku",
            task="task A",
            error_summary="Error: first",
            workspace_dir=tmp_path,
        )
        write_error_lesson_to_workspace(
            agent_name="agent-b",
            model="claude/haiku",
            task="task B",
            error_summary="Error: second",
            workspace_dir=tmp_path,
        )
        content = lessons_file.read_text()
        assert "agent-a" in content
        assert "agent-b" in content
        assert "L-001" in content  # existing content preserved

    def test_falls_back_to_tmp_when_workspace_none(self):
        tmp_lessons = Path("/tmp/LESSONS.md")
        # Remove if it exists to test creation
        if tmp_lessons.exists():
            tmp_lessons.unlink()

        lesson_path = write_error_lesson_to_workspace(
            agent_name="fallback-agent",
            model="claude/sonnet",
            task="fallback task",
            error_summary="Error: no workspace",
            workspace_dir=None,
        )
        assert lesson_path == tmp_lessons
        assert lesson_path.exists()
        content = lesson_path.read_text()
        assert "fallback-agent" in content

    def test_task_truncated_to_100_chars(self, tmp_path):
        long_task = "T" * 200
        lesson_path = write_error_lesson_to_workspace(
            agent_name="agent",
            model="claude/sonnet",
            task=long_task,
            error_summary="Error: x",
            workspace_dir=tmp_path,
        )
        content = lesson_path.read_text()
        # Task preview in lesson should be max 100 chars
        assert "T" * 100 in content
        assert "T" * 101 not in content
