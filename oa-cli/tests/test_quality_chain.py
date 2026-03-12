"""Unit tests voor de quality-chain command (A2 pattern: writer → tester → fixer)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest
from typer.testing import CliRunner

import open_agents.state as state_module
from open_agents.cli import app
from open_agents.state import AgentRecord


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def isolated_state(tmp_path, monkeypatch):
    """Redirect state naar tmp directory en reset de in-memory cache."""
    oa_dir = tmp_path / ".oa"
    state_file = oa_dir / "agents.json"
    monkeypatch.setattr(state_module, "OA_DIR", oa_dir)
    monkeypatch.setattr(state_module, "STATE_FILE", state_file)
    state_module._cache = None
    state_module._cache_mtime = 0.0
    return oa_dir


@pytest.fixture()
def writer_workspace(tmp_path):
    """Maak een nep writer workspace met output."""
    ws = tmp_path / "writer-ws"
    ws.mkdir()
    out = ws / "output"
    out.mkdir()
    (out / "result.md").write_text("# Writer output\n\nDit is de gegenereerde tekst.")
    return ws


@pytest.fixture()
def tester_workspace(tmp_path):
    """Maak een nep tester workspace."""
    ws = tmp_path / "tester-ws"
    ws.mkdir()
    (ws / "output").mkdir()
    return ws


@pytest.fixture()
def fixer_workspace(tmp_path):
    """Maak een nep fixer workspace met output."""
    ws = tmp_path / "fixer-ws"
    ws.mkdir()
    out = ws / "output"
    out.mkdir()
    (out / "result.md").write_text("# Verbeterde output\n\nDit is de verbeterde tekst.")
    return ws


def _make_agent_record(name: str, workspace: str) -> AgentRecord:
    """Bouw een minimale AgentRecord voor tests."""
    return AgentRecord(
        name=name,
        task="test taak",
        workspace=workspace,
        tmux_window=f"oa:{name}",
        model="claude/sonnet",
        status="running",
        created_at=0.0,
    )


# ---------------------------------------------------------------------------
# Test 1: Geen issues → alleen writer + tester, geen fixer
# ---------------------------------------------------------------------------


class TestQualityChainNoIssues:
    """Als de tester 'GEEN ISSUES' rapporteert, moet er geen fixer gespawnd worden."""

    def test_no_fixer_when_tester_passes(self, writer_workspace, tester_workspace):
        """quality-chain stopt na writer+tester als er geen issues zijn."""
        runner = CliRunner()

        writer_rec = _make_agent_record("test-writer", str(writer_workspace))
        tester_rec = _make_agent_record("test-tester", str(tester_workspace))

        # Tester output: geen issues
        (tester_workspace / "output" / "result.md").write_text("GEEN ISSUES gevonden in de output.")

        spawn_calls = []

        def fake_spawn(name, task, model="claude/sonnet", project_root=None, **kwargs):
            spawn_calls.append(name)
            if name.endswith("-writer"):
                return writer_rec
            elif name.endswith("-tester"):
                return tester_rec
            pytest.fail(f"Onverwachte spawn: {name}")

        with (
            patch("open_agents.commands.quality_chain.session_exists", return_value=True),
            patch("open_agents.commands.quality_chain.spawn_agent", side_effect=fake_spawn),
            patch("open_agents.commands.quality_chain.check_agent", return_value="done"),
            patch("open_agents.commands.quality_chain.get_agent", return_value=None),
            patch("open_agents.commands.quality_chain.cleanup_workspace"),
            patch("open_agents.commands.quality_chain.generate_agent_name", return_value="test"),
        ):
            result = runner.invoke(app, ["quality-chain", "Schrijf een samenvatting", "--name", "test"])

        assert result.exit_code == 0, f"Onverwachte exit: {result.output}"
        assert "test-writer" in spawn_calls
        assert "test-tester" in spawn_calls
        # Fixer moet NIET gespawnd zijn
        assert "test-fixer" not in spawn_calls
        assert "Geen issues" in result.output or "GEEN ISSUES" in result.output.upper()


# ---------------------------------------------------------------------------
# Test 2: Issues gevonden → fixer wordt gespawnd
# ---------------------------------------------------------------------------


class TestQualityChainWithFixer:
    """Als de tester bevindingen rapporteert, wordt de fixer gespawnd."""

    def test_fixer_spawned_when_tester_finds_issues(
        self, writer_workspace, tester_workspace, fixer_workspace
    ):
        """quality-chain spawnt de fixer als de tester bevindingen rapporteert."""
        runner = CliRunner()

        writer_rec = _make_agent_record("fix-writer", str(writer_workspace))
        tester_rec = _make_agent_record("fix-tester", str(tester_workspace))
        fixer_rec = _make_agent_record("fix-fixer", str(fixer_workspace))

        # Tester output: bevindingen gevonden
        (tester_workspace / "output" / "result.md").write_text(
            "BEVINDINGEN:\n1. De samenvatting mist de conclusie.\n2. Spelling fouten in alinea 2."
        )

        spawn_calls = []

        def fake_spawn(name, task, model="claude/sonnet", project_root=None, **kwargs):
            spawn_calls.append(name)
            if name.endswith("-writer"):
                return writer_rec
            elif name.endswith("-tester"):
                return tester_rec
            elif name.endswith("-fixer"):
                return fixer_rec
            pytest.fail(f"Onverwachte spawn: {name}")

        with (
            patch("open_agents.commands.quality_chain.session_exists", return_value=True),
            patch("open_agents.commands.quality_chain.spawn_agent", side_effect=fake_spawn),
            patch("open_agents.commands.quality_chain.check_agent", return_value="done"),
            patch("open_agents.commands.quality_chain.get_agent", return_value=None),
            patch("open_agents.commands.quality_chain.cleanup_workspace"),
            patch("open_agents.commands.quality_chain.generate_agent_name", return_value="fix"),
        ):
            result = runner.invoke(app, ["quality-chain", "Schrijf een samenvatting", "--name", "fix"])

        assert result.exit_code == 0, f"Onverwachte exit: {result.output}"
        # Alle drie agents moeten gespawnd zijn
        assert "fix-writer" in spawn_calls
        assert "fix-tester" in spawn_calls
        assert "fix-fixer" in spawn_calls
        # Finale output bevat de verbeterde tekst
        assert "Fixer klaar" in result.output or "fixer" in result.output.lower()


# ---------------------------------------------------------------------------
# Test 3: --skip-fix vlag → geen fixer, zelfs met bevindingen
# ---------------------------------------------------------------------------


class TestQualityChainSkipFix:
    """Met --skip-fix wordt de fixer overgeslagen, ook al zijn er bevindingen."""

    def test_skip_fix_prevents_fixer(self, writer_workspace, tester_workspace):
        """--skip-fix: geen fixer ondanks bevindingen van de tester."""
        runner = CliRunner()

        writer_rec = _make_agent_record("skip-writer", str(writer_workspace))
        tester_rec = _make_agent_record("skip-tester", str(tester_workspace))

        # Tester vindt issues
        (tester_workspace / "output" / "result.md").write_text(
            "BEVINDINGEN:\n1. Conclusie ontbreekt."
        )

        spawn_calls = []

        def fake_spawn(name, task, model="claude/sonnet", project_root=None, **kwargs):
            spawn_calls.append(name)
            if name.endswith("-writer"):
                return writer_rec
            elif name.endswith("-tester"):
                return tester_rec
            pytest.fail(f"Fixer werd onterecht gespawnd: {name}")

        with (
            patch("open_agents.commands.quality_chain.session_exists", return_value=True),
            patch("open_agents.commands.quality_chain.spawn_agent", side_effect=fake_spawn),
            patch("open_agents.commands.quality_chain.check_agent", return_value="done"),
            patch("open_agents.commands.quality_chain.get_agent", return_value=None),
            patch("open_agents.commands.quality_chain.cleanup_workspace"),
            patch("open_agents.commands.quality_chain.generate_agent_name", return_value="skip"),
        ):
            result = runner.invoke(app, [
                "quality-chain", "Schrijf een samenvatting",
                "--name", "skip",
                "--skip-fix",
            ])

        assert result.exit_code == 0, f"Onverwachte exit: {result.output}"
        assert "skip-writer" in spawn_calls
        assert "skip-tester" in spawn_calls
        assert "skip-fixer" not in spawn_calls
        # Melding dat fixer overgeslagen is
        assert "skip-fix" in result.output.lower() or "overgeslagen" in result.output.lower()
