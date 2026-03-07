"""Shared utility functions for Open Agents CLI."""

from __future__ import annotations

import hashlib
import re
import time


def generate_agent_name(task: str) -> str:
    """Generate a short deterministic name from the task text."""
    h = hashlib.md5(f"{task}{time.time()}".encode()).hexdigest()[:6]
    word = "".join(c for c in task.split()[0] if c.isalnum()).lower()[:10] if task.strip() else "agent"
    return f"{word}-{h}"


def format_duration(start: float, end: float | None = None) -> str:
    """Format elapsed time as human-readable string."""
    elapsed = (end or time.time()) - start
    if elapsed < 60:
        return f"{elapsed:.0f}s"
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)
    if minutes < 60:
        return f"{minutes}m {seconds}s"
    hours = int(minutes // 60)
    minutes = minutes % 60
    return f"{hours}h {minutes}m"


def validate_agent_name(name: str) -> bool:
    """Validate an agent name: lowercase alphanumeric + hyphens, 2-63 chars, starts with alnum."""
    return bool(re.match(r"^[a-z0-9][a-z0-9-]{0,61}$", name))


# ---------------------------------------------------------------------------
# Model display helpers
# ---------------------------------------------------------------------------

# (label, rich_color) tuples per model string
_MODEL_DISPLAY = {
    "claude":        ("claude (default)", "bold bright_cyan"),
    "claude/opus":   ("opus",            "bold yellow"),
    "claude/sonnet": ("sonnet",          "cyan"),
    "claude/haiku":  ("haiku",           "green"),
}


def format_model_label(model: str) -> str:
    """Return a short human-readable label for a model string."""
    if model in _MODEL_DISPLAY:
        return _MODEL_DISPLAY[model][0]
    return model  # ollama/* or unknown — show as-is


def format_model_rich(model: str) -> str:
    """Return a Rich-markup string with color for a model."""
    if model in _MODEL_DISPLAY:
        label, color = _MODEL_DISPLAY[model]
        return f"[{color}]{label}[/{color}]"
    # ollama or unknown
    return f"[bright_magenta]{model}[/bright_magenta]"


def model_rich_color(model: str) -> str:
    """Return just the Rich style string for a model (no brackets)."""
    if model in _MODEL_DISPLAY:
        return _MODEL_DISPLAY[model][1]
    return "bright_magenta"
