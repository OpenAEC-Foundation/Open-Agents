"""Configuration — reads ~/.oa/config.json with fallback to defaults."""

from __future__ import annotations

import json
from pathlib import Path

OA_DIR = Path.home() / ".oa"
CONFIG_PATH = OA_DIR / "config.json"

DEFAULT_CONFIG = {
    "version": "0.2.0",
    "default_model": "claude",
    "max_workers": 5,
    "timeout_minutes": 60,
    "max_depth": 5,
    "skill_packages": [],   # List of absolute paths to skill package repos
    "agents_library": "",   # Absolute path to agents/library dir (empty = auto-resolve)
    "on_disconnect": {
        "state_snapshot": True,
        "git_stash": False,
        "notify_desktop": True,
        "retention_days": 30,
        "cleanup_timeout_seconds": 300,
    },
    "periodic_checkpoint_minutes": 5,
    "session_log_max_mb": 50,
}


def load_config() -> dict:
    """Load config from ~/.oa/config.json, falling back to defaults for missing keys."""
    if CONFIG_PATH.exists():
        try:
            user_config = json.loads(CONFIG_PATH.read_text())
            return {**DEFAULT_CONFIG, **user_config}
        except Exception:
            return dict(DEFAULT_CONFIG)
    return dict(DEFAULT_CONFIG)


def get(key: str):
    """Get a single config value by key."""
    return load_config().get(key, DEFAULT_CONFIG.get(key))


def get_disconnect_config() -> dict:
    """Return the on_disconnect config block, merged with defaults."""
    cfg = load_config()
    defaults = DEFAULT_CONFIG["on_disconnect"]
    user_val = cfg.get("on_disconnect", {})
    if not isinstance(user_val, dict):
        return dict(defaults)
    return {**defaults, **user_val}


def get_periodic_checkpoint_minutes() -> int:
    """Return periodic_checkpoint_minutes from config."""
    val = load_config().get("periodic_checkpoint_minutes", DEFAULT_CONFIG["periodic_checkpoint_minutes"])
    return int(val)
