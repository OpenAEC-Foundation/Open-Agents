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
    # GPU-first routing — when True, ollama/* models auto-route to Hetzner GPU
    "prefer_gpu": False,
    "gpu_machine": "hetzner",           # machine ID to route to when prefer_gpu=True
    "gpu_model_map": {                  # local ollama → hetzner equivalent
        "ollama/qwen3:4b":       "hetzner/llama3.1:8b",
        "ollama/phi4-mini":      "hetzner/phi4:14b",
        "ollama/qwen2.5-coder:7b": "hetzner/qwen2.5-coder:14b",
        "ollama/qwen3:8b":       "hetzner/qwen2.5:14b",
        "ollama/llama3.2:3b":    "hetzner/llama3.1:8b",
    },
    # Docker isolation (D-040) — opt-in via --docker flag
    "docker_enabled": False,
    "docker_image": "oa-agent:latest",
    "docker_memory_default": "2g",
    "docker_cpu_default": 1.0,
    "docker_timeout_default": 300,
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


MACHINES_PATH = OA_DIR / 'machines.json'

DEFAULT_MACHINES = {
    'machines': [
        {
            'id': 'local',
            'host': '',
            'description': 'Local (tmux)',
            'is_default': True,
        },
        {
            'id': 'hetzner',
            'host': 'hetzner',
            'description': 'Hetzner RTX 4000',
            'is_default': False,
        },
    ]
}


def load_machines_config() -> list[dict]:
    """Load machine definitions from ~/.oa/machines.json."""
    if MACHINES_PATH.exists():
        try:
            data = json.loads(MACHINES_PATH.read_text())
            return data.get('machines', DEFAULT_MACHINES['machines'])
        except Exception:
            return list(DEFAULT_MACHINES['machines'])
    return list(DEFAULT_MACHINES['machines'])


def get_machine_host(machine_id: str) -> str | None:
    """Get SSH host for a machine ID. Returns empty string for local, None if not found."""
    for m in load_machines_config():
        if m['id'] == machine_id:
            return m.get('host', '')
    return None
