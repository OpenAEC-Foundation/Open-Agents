"""CLI — typer commands for the Open Agents orchestrator.

This is the thin router. All command implementations live in commands/*.py.
"""

from __future__ import annotations

import typer

# Re-export state helpers that tests monkeypatch via cli module
from .state import get_agent, list_agents, update_agent  # noqa: F401

app = typer.Typer(
    name="oa",
    help="Open Agents — tmux-based multi-agent orchestrator for Claude Code.",
    no_args_is_help=True,
)

# Register all command modules on the app
from .commands.session import register_commands as _reg_session
from .commands.agents import register_commands as _reg_agents
from .commands.messaging import register_commands as _reg_messaging
from .commands.pipeline import register_commands as _reg_pipeline
from .commands.team import register_commands as _reg_team
from .commands.task import register_commands as _reg_task
from .commands.checkpoint import register_commands as _reg_checkpoint
from .commands.skills import register_commands as _reg_skills
from .commands.improve import register_commands as _reg_improve
from .commands.analytics import register_commands as _reg_analytics
from .commands.po import register_commands as _reg_po
from .commands.profile import register_commands as _reg_profile
from .commands.misc import register_commands as _reg_misc

_reg_session(app)
_reg_agents(app)
_reg_messaging(app)
_reg_pipeline(app)
_reg_team(app)
_reg_task(app)
_reg_checkpoint(app)
_reg_skills(app)
_reg_improve(app)
_reg_analytics(app)
_reg_po(app)
_reg_profile(app)
_reg_misc(app)


if __name__ == "__main__":
    app()
