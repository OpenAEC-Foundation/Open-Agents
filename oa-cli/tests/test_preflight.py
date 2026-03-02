"""Unit tests for open_agents.preflight — dependency pre-flight checks."""

from __future__ import annotations

import subprocess
from unittest.mock import MagicMock, patch

import pytest

from open_agents.preflight import (
    CheckResult,
    check_all,
    check_claude,
    check_python,
    check_tmux,
)


# ---------------------------------------------------------------------------
# check_python
# ---------------------------------------------------------------------------

class TestCheckPython:
    def test_check_python_ok(self):
        result = check_python()
        assert result.ok is True

    def test_check_python_returns_check_result(self):
        result = check_python()
        assert isinstance(result, CheckResult)

    def test_check_python_has_name(self):
        result = check_python()
        assert result.name == "python"


# ---------------------------------------------------------------------------
# check_tmux
# ---------------------------------------------------------------------------

class TestCheckTmux:
    def test_check_tmux_found(self):
        mock_proc = MagicMock()
        mock_proc.stdout = "tmux 3.3a\n"
        mock_proc.returncode = 0

        with patch("shutil.which", return_value="/usr/bin/tmux"), \
             patch("subprocess.run", return_value=mock_proc):
            result = check_tmux()

        assert result.ok is True

    def test_check_tmux_missing(self):
        with patch("shutil.which", return_value=None):
            result = check_tmux()

        assert result.ok is False
        assert "install" in result.fix_hint.lower()

    def test_check_tmux_returns_check_result(self):
        mock_proc = MagicMock()
        mock_proc.stdout = "tmux 3.3a\n"
        mock_proc.returncode = 0

        with patch("shutil.which", return_value="/usr/bin/tmux"), \
             patch("subprocess.run", return_value=mock_proc):
            result = check_tmux()

        assert isinstance(result, CheckResult)

    def test_check_tmux_has_name(self):
        with patch("shutil.which", return_value=None):
            result = check_tmux()

        assert result.name == "tmux"


# ---------------------------------------------------------------------------
# check_claude
# ---------------------------------------------------------------------------

class TestCheckClaude:
    def test_check_claude_found(self):
        with patch("shutil.which", return_value="/usr/local/bin/claude"):
            result = check_claude()

        assert result.ok is True

    def test_check_claude_missing(self):
        with patch("shutil.which", return_value=None):
            result = check_claude()

        assert result.ok is False

    def test_check_claude_returns_check_result(self):
        with patch("shutil.which", return_value="/usr/local/bin/claude"):
            result = check_claude()

        assert isinstance(result, CheckResult)

    def test_check_claude_has_name(self):
        with patch("shutil.which", return_value=None):
            result = check_claude()

        assert result.name == "claude"

    def test_check_claude_missing_has_fix_hint(self):
        with patch("shutil.which", return_value=None):
            result = check_claude()

        assert result.fix_hint  # non-empty string


# ---------------------------------------------------------------------------
# check_all
# ---------------------------------------------------------------------------

class TestCheckAll:
    def test_check_all_returns_list(self):
        mock_proc = MagicMock()
        mock_proc.stdout = "tmux 3.3a\n"
        mock_proc.returncode = 0

        with patch("shutil.which", return_value="/usr/bin/tmux"), \
             patch("subprocess.run", return_value=mock_proc):
            results = check_all()

        assert isinstance(results, list)
        assert len(results) >= 3

    def test_check_all_returns_check_result_instances(self):
        mock_proc = MagicMock()
        mock_proc.stdout = "tmux 3.3a\n"
        mock_proc.returncode = 0

        with patch("shutil.which", return_value="/usr/bin/tmux"), \
             patch("subprocess.run", return_value=mock_proc):
            results = check_all()

        assert all(isinstance(r, CheckResult) for r in results)
