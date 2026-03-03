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
