"""Quality hooks for agent lifecycle events.

Register callables to be triggered on specific agent lifecycle events.
Supports decorator-based registration for ergonomic usage.
"""

from __future__ import annotations

import logging
from typing import Callable

logger = logging.getLogger(__name__)

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
