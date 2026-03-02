"""Unit tests for open_agents.chat — interactive chat session."""

from __future__ import annotations

from io import StringIO
from unittest.mock import MagicMock, patch

import pytest

from open_agents.chat import (
    ChatSession,
    SLASH_COMMANDS,
    generate_name,
    parse_slash_command,
)


# ---------------------------------------------------------------------------
# Slash command parsing
# ---------------------------------------------------------------------------

class TestSlashCommandParsing:
    def test_status_command_recognized(self):
        result = parse_slash_command("/status")
        assert result == "/status"

    def test_help_command_recognized(self):
        result = parse_slash_command("/help")
        assert result == "/help"

    def test_quit_command_recognized(self):
        result = parse_slash_command("/quit")
        assert result == "/quit"

    def test_unknown_command_returns_none(self):
        result = parse_slash_command("/unknown")
        assert result is None

    def test_non_slash_input_returns_none(self):
        result = parse_slash_command("hello world")
        assert result is None

    def test_empty_string_returns_none(self):
        result = parse_slash_command("")
        assert result is None

    def test_slash_commands_constant_contains_status(self):
        assert "/status" in SLASH_COMMANDS

    def test_slash_commands_constant_contains_help(self):
        assert "/help" in SLASH_COMMANDS

    def test_slash_commands_constant_contains_quit(self):
        assert "/quit" in SLASH_COMMANDS

    def test_command_with_trailing_whitespace(self):
        result = parse_slash_command("/status  ")
        assert result == "/status"


# ---------------------------------------------------------------------------
# generate_name
# ---------------------------------------------------------------------------

class TestGenerateName:
    def test_generate_name_returns_string(self):
        result = generate_name("Build a REST API")
        assert isinstance(result, str)

    def test_generate_name_non_empty(self):
        result = generate_name("Build a REST API")
        assert len(result) > 0

    def test_generate_name_short(self):
        result = generate_name("Build a REST API with authentication and OAuth2")
        # Name should be reasonably short (not the full task)
        assert len(result) <= 32

    def test_generate_name_uses_first_word(self):
        result = generate_name("build something great")
        assert result.startswith("build")

    def test_generate_name_is_lowercase(self):
        result = generate_name("Build Something")
        assert result == result.lower()

    def test_generate_name_no_spaces(self):
        result = generate_name("build something")
        assert " " not in result

    def test_generate_name_empty_task_fallback(self):
        result = generate_name("")
        assert isinstance(result, str)
        assert len(result) > 0


# ---------------------------------------------------------------------------
# ChatSession._show_welcome
# ---------------------------------------------------------------------------

class TestChatSessionWelcome:
    def test_show_welcome_no_exception(self):
        """ChatSession._show_welcome() must not raise any exception."""
        with patch("open_agents.chat.Console") as mock_console_cls:
            mock_console = MagicMock()
            mock_console_cls.return_value = mock_console

            session = ChatSession()
            # Must not raise
            session._show_welcome()

    def test_show_welcome_prints_something(self):
        """_show_welcome() must output at least one line."""
        with patch("open_agents.chat.Console") as mock_console_cls:
            mock_console = MagicMock()
            mock_console_cls.return_value = mock_console

            session = ChatSession()
            session._show_welcome()

            assert mock_console.print.called

    def test_chat_session_instantiation(self):
        """ChatSession can be instantiated without arguments."""
        with patch("open_agents.chat.Console"):
            session = ChatSession()
            assert session is not None
