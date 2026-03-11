"""Quality hooks for agent lifecycle events.

Register callables to be triggered on specific agent lifecycle events.
Supports decorator-based registration for ergonomic usage.

Also provides a file-system hook system: executable shell scripts placed
in ~/.oa/hooks/<event>/ are run automatically after agent lifecycle events.
"""

from __future__ import annotations

import logging
import os
import stat
import subprocess
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger(__name__)

_HOOKS_CONFIG_PATH = Path.home() / ".oa" / "hooks-config.yaml"

VALID_EVENTS = {"on_idle", "on_task_complete", "on_error", "on_batch_complete", "on_session_end", "on_detach", "on_resume"}

HOOKS: dict[str, list[Callable]] = {
    "on_idle": [],
    "on_task_complete": [],
    "on_error": [],
    "on_batch_complete": [],
    "on_session_end": [],
    "on_detach": [],
    "on_resume": [],
}


def register_hook(event: str, fn: Callable) -> None:
    """Register a callable for a lifecycle event.

    Args:
        event: One of 'on_idle', 'on_task_complete', 'on_error', 'on_batch_complete'.
        fn: Callable that accepts a context dict.

    Raises:
        ValueError: If the event name is not valid.
    """
    if event not in VALID_EVENTS:
        raise ValueError(f"Unknown hook event '{event}'. Valid events: {sorted(VALID_EVENTS)}")
    HOOKS[event].append(fn)


def trigger_hook(event: str, context: dict) -> list[str]:
    """Trigger all registered hooks for an event.

    Args:
        event: The lifecycle event name.
        context: Dict of contextual data passed to each hook.

    Returns:
        List of hook function names that were called.
    """
    if event not in VALID_EVENTS:
        raise ValueError(f"Unknown hook event '{event}'.")

    called = []
    for fn in HOOKS.get(event, []):
        try:
            fn(context)
            called.append(getattr(fn, "__name__", repr(fn)))
        except Exception as exc:
            logger.error("Hook '%s' for event '%s' raised: %s", getattr(fn, "__name__", fn), event, exc)
    return called


def clear_hooks(event: str | None = None) -> None:
    """Clear registered hooks. If event is None, clear all events."""
    if event is None:
        for key in HOOKS:
            HOOKS[key].clear()
    elif event in VALID_EVENTS:
        HOOKS[event].clear()
    else:
        raise ValueError(f"Unknown hook event '{event}'.")


# --- Decorators ---

def on_idle(fn: Callable) -> Callable:
    """Decorator: register a function as an on_idle hook.

    Example::

        @on_idle
        def my_idle_handler(context: dict):
            print("Agent is idle:", context)
    """
    register_hook("on_idle", fn)
    return fn


def on_task_complete(fn: Callable) -> Callable:
    """Decorator: register a function as an on_task_complete hook.

    Example::

        @on_task_complete
        def notify_done(context: dict):
            print("Task done:", context.get("agent"))
    """
    register_hook("on_task_complete", fn)
    return fn


def on_error(fn: Callable) -> Callable:
    """Decorator: register a function as an on_error hook.

    Example::

        @on_error
        def handle_error(context: dict):
            print("Error in agent:", context.get("agent"), context.get("error"))
    """
    register_hook("on_error", fn)
    return fn


def on_batch_complete(fn: Callable) -> Callable:
    """Decorator: register a function as an on_batch_complete hook.

    Example::

        @on_batch_complete
        def after_batch(context: dict):
            print("Batch complete:", context.get("batch_id"))
    """
    register_hook("on_batch_complete", fn)
    return fn


def on_session_end(fn: Callable) -> Callable:
    """Decorator: register a function as an on_session_end hook.

    Example::

        @on_session_end
        def save_state(context: dict):
            print("Session ending:", context.get("session_id"))
    """
    register_hook("on_session_end", fn)
    return fn


def on_detach(fn: Callable) -> Callable:
    """Decorator: register a function as an on_detach hook.

    Example::

        @on_detach
        def handle_detach(context: dict):
            print("Agent detached:", context.get("agent"))
    """
    register_hook("on_detach", fn)
    return fn


def on_resume(fn: Callable) -> Callable:
    """Decorator: register a function as an on_resume hook.

    Example::

        @on_resume
        def handle_resume(context: dict):
            print("Session resumed:", context.get("session_id"))
    """
    register_hook("on_resume", fn)
    return fn


# --- HookRunner class ---

class HookRunner:
    """Object-oriented hook registry — useful for scoped/isolated hook management.

    Example::

        runner = HookRunner()
        runner.register_hook("on_idle", lambda ctx: print("idle", ctx))
        runner.trigger("on_idle", "my-agent")
    """

    def __init__(self) -> None:
        self._hooks: dict[str, list[Callable]] = {event: [] for event in VALID_EVENTS}

    def register_hook(self, event: str, callback: Callable) -> None:
        """Register a callback for the given lifecycle event.

        Args:
            event: One of the VALID_EVENTS strings.
            callback: Callable accepting a context dict.

        Raises:
            ValueError: If event is not valid.
        """
        if event not in VALID_EVENTS:
            raise ValueError(f"Unknown hook event '{event}'. Valid events: {sorted(VALID_EVENTS)}")
        self._hooks[event].append(callback)

    def trigger(self, event: str, agent_name: str, extra: Optional[dict] = None) -> list[str]:
        """Trigger all callbacks for the event, passing context with agent_name.

        Args:
            event: The lifecycle event name.
            agent_name: The name of the agent that triggered the event.
            extra: Optional additional context data.

        Returns:
            List of callback function names that were called.
        """
        if event not in VALID_EVENTS:
            raise ValueError(f"Unknown hook event '{event}'.")

        context = {"agent": agent_name, **(extra or {})}
        called = []
        for fn in self._hooks.get(event, []):
            try:
                fn(context)
                called.append(getattr(fn, "__name__", repr(fn)))
            except Exception as exc:
                logger.error(
                    "HookRunner callback '%s' for event '%s' raised: %s",
                    getattr(fn, "__name__", fn),
                    event,
                    exc,
                )
        return called

    def clear(self, event: Optional[str] = None) -> None:
        """Clear registered callbacks. If event is None, clear all."""
        if event is None:
            for key in self._hooks:
                self._hooks[key].clear()
        elif event in VALID_EVENTS:
            self._hooks[event].clear()
        else:
            raise ValueError(f"Unknown hook event '{event}'.")


# --- YAML config loader ---

def load_hooks_config(config_path: Optional[Path] = None) -> dict:
    """Load hook configuration from a YAML file.

    The config file (~/.oa/hooks-config.yaml) may contain a mapping of
    event names to lists of importable callable strings, e.g.::

        on_idle:
          - mypackage.hooks.handle_idle
        on_task_complete:
          - mypackage.hooks.task_done

    Returns the raw config dict (empty dict if file not found or unreadable).
    """
    path = config_path or _HOOKS_CONFIG_PATH
    if not path.exists():
        return {}
    try:
        import yaml  # type: ignore[import]
    except ImportError:
        logger.warning("PyYAML not installed; cannot load hooks-config.yaml")
        return {}
    try:
        with open(path) as f:
            data = yaml.safe_load(f)
        return data if isinstance(data, dict) else {}
    except Exception as exc:
        logger.warning("Failed to load hooks config from %s: %s", path, exc)
        return {}


def apply_hooks_config(config_path: Optional[Path] = None) -> None:
    """Load ~/.oa/hooks-config.yaml and register configured hook callables.

    Skips entries where the import fails (logs a warning instead of raising).
    """
    import importlib

    config = load_hooks_config(config_path)
    for event, callables in config.items():
        if event not in VALID_EVENTS:
            logger.warning("hooks-config.yaml: unknown event '%s', skipping.", event)
            continue
        if not isinstance(callables, list):
            continue
        for dotted_path in callables:
            try:
                module_path, _, attr = dotted_path.rpartition(".")
                if not module_path:
                    raise ImportError(f"Invalid callable path: '{dotted_path}'")
                module = importlib.import_module(module_path)
                fn = getattr(module, attr)
                register_hook(event, fn)
            except Exception as exc:
                logger.warning("Could not register hook '%s' for event '%s': %s", dotted_path, event, exc)


# --- File-system hook system ---

HOOK_DIRS: dict[str, Path] = {
    "post-run":      Path.home() / ".oa" / "hooks" / "post-run",
    "post-pipeline": Path.home() / ".oa" / "hooks" / "post-pipeline",
    "on-success":    Path.home() / ".oa" / "hooks" / "on-success",
    "on-failure":    Path.home() / ".oa" / "hooks" / "on-failure",
}


def run_hooks(event: str, env: dict) -> list[str]:
    """Run all executable scripts in HOOK_DIRS[event]. Returns list of outputs.

    Scripts are sorted by name so e.g. 01-foo.sh runs before 02-bar.sh.
    Env vars available to scripts: OA_RUN_ID, OA_AGENT_NAME, OA_RUN_LOG_PATH,
    OA_EXIT_STATUS. Errors in individual scripts are logged but do not stop
    subsequent scripts or the calling agent (fire-and-forget).
    """
    hook_dir = HOOK_DIRS.get(event)
    if hook_dir is None:
        logger.warning("run_hooks: unknown event '%s'", event)
        return []

    if not hook_dir.exists():
        return []

    scripts = sorted(
        p for p in hook_dir.iterdir()
        if p.is_file() and os.access(p, os.X_OK)
    )

    merged_env = {**os.environ, **{str(k): str(v) for k, v in env.items()}}
    outputs: list[str] = []

    for script in scripts:
        try:
            result = subprocess.run(
                [str(script)],
                env=merged_env,
                capture_output=True,
                text=True,
                timeout=30,
            )
            output = result.stdout.strip()
            if result.stderr.strip():
                logger.warning("Hook %s stderr: %s", script.name, result.stderr.strip())
            outputs.append(output)
        except Exception as exc:
            logger.error("Hook '%s' for event '%s' failed: %s", script.name, event, exc)

    return outputs


def ensure_hook_dirs() -> None:
    """Create hook directories if they don't exist."""
    for hook_dir in HOOK_DIRS.values():
        hook_dir.mkdir(parents=True, exist_ok=True)


def install_default_hooks() -> None:
    """Write default hooks: 01-log-to-index.sh and 02-check-success.sh."""
    ensure_hook_dirs()

    post_run_dir = HOOK_DIRS["post-run"]

    log_hook = post_run_dir / "01-log-to-index.sh"
    if not log_hook.exists():
        log_hook.write_text(
            '#!/bin/bash\n'
            'echo "$(date -Iseconds) | $OA_AGENT_NAME | $OA_EXIT_STATUS" >> ~/.oa/run-history.log\n'
        )
        log_hook.chmod(log_hook.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

    check_hook = post_run_dir / "02-check-success.sh"
    if not check_hook.exists():
        check_hook.write_text(
            '#!/bin/bash\n'
            '[ "$OA_EXIT_STATUS" = "error" ] && echo "\u26a0\ufe0f  Agent $OA_AGENT_NAME failed" >&2\n'
            'exit 0\n'
        )
        check_hook.chmod(check_hook.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
