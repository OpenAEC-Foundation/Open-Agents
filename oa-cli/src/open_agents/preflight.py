"""Preflight checks — verifies required dependencies before starting oa."""

from __future__ import annotations

import shutil
import subprocess
import sys
from dataclasses import dataclass

from rich.console import Console
from rich.table import Table


@dataclass
class CheckResult:
    name: str
    ok: bool
    message: str
    fix_hint: str


def check_tmux() -> CheckResult:
    """Check if tmux is installed and meets minimum version requirements."""
    path = shutil.which("tmux")
    if path is None:
        return CheckResult(
            name="tmux",
            ok=False,
            message="tmux not found in PATH",
            fix_hint="Install tmux: sudo apt install tmux  (Ubuntu/Debian) or brew install tmux (macOS)",
        )

    try:
        result = subprocess.run(
            ["tmux", "-V"], capture_output=True, text=True, timeout=5
        )
        version_str = result.stdout.strip()  # e.g. "tmux 3.3a"
        parts = version_str.split()
        if len(parts) >= 2:
            version_num = parts[1].rstrip("abcdefghijklmnopqrstuvwxyz")
            major = int(version_num.split(".")[0])
            if major < 3:
                return CheckResult(
                    name="tmux",
                    ok=False,
                    message=f"tmux version too old: {version_str} (need >= 3.0)",
                    fix_hint="Upgrade tmux: sudo apt upgrade tmux  or brew upgrade tmux",
                )
        return CheckResult(
            name="tmux",
            ok=True,
            message=f"Found {version_str} at {path}",
            fix_hint="",
        )
    except Exception as exc:
        return CheckResult(
            name="tmux",
            ok=False,
            message=f"tmux version check failed: {exc}",
            fix_hint="Ensure tmux is correctly installed and executable.",
        )


def check_claude() -> CheckResult:
    """Check if the Claude Code CLI is installed."""
    path = shutil.which("claude")
    if path is None:
        return CheckResult(
            name="claude",
            ok=False,
            message="claude CLI not found in PATH",
            fix_hint="Install Claude Code: npm install -g @anthropic-ai/claude-code",
        )
    return CheckResult(
        name="claude",
        ok=True,
        message=f"Found claude at {path}",
        fix_hint="",
    )


def check_python() -> CheckResult:
    """Check that Python version is >= 3.10."""
    info = sys.version_info
    version_str = f"{info.major}.{info.minor}.{info.micro}"
    if (info.major, info.minor) < (3, 10):
        return CheckResult(
            name="python",
            ok=False,
            message=f"Python {version_str} is too old (need >= 3.10)",
            fix_hint="Upgrade Python: https://www.python.org/downloads/",
        )
    return CheckResult(
        name="python",
        ok=True,
        message=f"Python {version_str}",
        fix_hint="",
    )


def check_all() -> list[CheckResult]:
    """Run all preflight checks and return results."""
    return [
        check_python(),
        check_tmux(),
        check_claude(),
    ]


def print_report(results: list[CheckResult], console: Console | None = None) -> None:
    """Print a Rich table showing all check results with fix hints for failures."""
    if console is None:
        console = Console()

    table = Table(title="Open Agents — Preflight Checks", show_lines=False)
    table.add_column("Check", style="bold", min_width=10)
    table.add_column("Status", min_width=8)
    table.add_column("Details")
    table.add_column("Fix", style="dim")

    for r in results:
        status = "[green]OK[/green]" if r.ok else "[red]FAIL[/red]"
        table.add_row(r.name, status, r.message, r.fix_hint if not r.ok else "")

    console.print(table)

    failed = [r for r in results if not r.ok]
    if failed:
        console.print(f"\n[red bold]{len(failed)} check(s) failed.[/red bold] Fix the issues above before running 'oa start'.")
    else:
        console.print("\n[green bold]All checks passed![/green bold]")
