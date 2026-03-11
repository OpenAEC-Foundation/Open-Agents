"""A2A (Agent-to-Agent) Protocol adapter for Open-Agents.

Implements a minimal A2A-compatible HTTP layer on top of oa-cli.
Phase 1: Agent Card discovery + task state mapping (read-only).
Phase 1+: Inbound task creation via POST /a2a/tasks/send.

Decision: D-063 — Compatibility Layer (Option B).
Spec reference: A2A v0.3.0 (July 2025).
"""

from __future__ import annotations

import json
import time
import uuid
from typing import Any

from flask import Blueprint, jsonify, request

from .state import get_agent, list_agents
from .spawner import spawn_agent
from .tmux import session_exists, start_session
from .workspace import read_output
from .lifecycle import capture_agent_output
from .utils import generate_agent_name

a2a_bp = Blueprint("a2a", __name__, url_prefix="/a2a")

# ---------------------------------------------------------------------------
# State mapping: oa-cli → A2A task lifecycle
# ---------------------------------------------------------------------------

_OA_TO_A2A_STATE = {
    "running": "working",
    "done": "completed",
    "error": "failed",
    "killed": "failed",
    "paused": "input-required",
}


def _map_state(oa_status: str) -> str:
    """Map oa-cli agent status to A2A task state."""
    return _OA_TO_A2A_STATE.get(oa_status, "working")


# ---------------------------------------------------------------------------
# A2A Task ID ↔ oa agent name mapping
# ---------------------------------------------------------------------------

# In-memory bidirectional map (sufficient for PoC; file-backed in Phase 2)
_task_to_agent: dict[str, str] = {}
_agent_to_task: dict[str, str] = {}


def _ensure_task_id(agent_name: str) -> str:
    """Get or create an A2A task ID for an oa agent."""
    if agent_name in _agent_to_task:
        return _agent_to_task[agent_name]
    task_id = str(uuid.uuid4())
    _task_to_agent[task_id] = agent_name
    _agent_to_task[agent_name] = task_id
    return task_id


# ---------------------------------------------------------------------------
# Agent Card — /.well-known/agent.json equivalent
# ---------------------------------------------------------------------------

def _build_agent_card() -> dict[str, Any]:
    """Build the A2A Agent Card for the Open-Agents orchestrator."""
    return {
        "name": "Open-Agents Orchestrator",
        "description": (
            "Multi-agent orchestrator for Claude Code. "
            "Spawn and coordinate parallel AI agents via oa-cli. "
            "Supports coding, research, pipelines, and agent teams."
        ),
        "version": "0.2.0",
        "url": request.host_url.rstrip("/") + "/a2a",
        "documentationUrl": "https://github.com/OpenAEC-Foundation/Open-Agents",
        "provider": {
            "organization": "OpenAEC Foundation",
        },
        "capabilities": {
            "streaming": False,  # Phase 2: SSE streaming
            "pushNotifications": False,
            "stateTransitionHistory": False,
        },
        "authentication": {
            "schemes": ["none"],
            "credentials": None,
        },
        "defaultInputModes": ["text/plain", "application/json"],
        "defaultOutputModes": ["text/plain", "application/json"],
        "skills": [
            {
                "id": "run-agent",
                "name": "Run Agent",
                "description": (
                    "Spawn a new Claude Code agent with a task description. "
                    "Returns agent name and workspace path."
                ),
                "tags": ["orchestration", "claude", "agent"],
                "inputModes": ["text/plain"],
                "outputModes": ["text/plain", "application/json"],
                "examples": [
                    "Write a Python function that validates email addresses",
                    "Research the top 5 open-source agent frameworks",
                ],
            },
            {
                "id": "run-pipeline",
                "name": "Run Pipeline",
                "description": (
                    "Execute a multi-agent pipeline: planner splits the task, "
                    "parallel workers execute, combiner merges results."
                ),
                "tags": ["orchestration", "pipeline", "parallel"],
                "inputModes": ["text/plain"],
                "outputModes": ["application/json"],
            },
            {
                "id": "get-agent-status",
                "name": "Get Agent Status",
                "description": "Return the current status and output of a named agent.",
                "tags": ["monitoring"],
                "inputModes": ["application/json"],
                "outputModes": ["application/json"],
            },
            {
                "id": "list-agents",
                "name": "List Agents",
                "description": "Return all running and recently completed agents with their status.",
                "tags": ["monitoring"],
                "inputModes": [],
                "outputModes": ["application/json"],
            },
        ],
    }


# ---------------------------------------------------------------------------
# A2A Task response builder
# ---------------------------------------------------------------------------

def _build_task_response(agent_name: str) -> dict[str, Any] | None:
    """Build an A2A Task object from an oa agent record."""
    rec = get_agent(agent_name)
    if rec is None:
        return None

    task_id = _ensure_task_id(agent_name)
    a2a_state = _map_state(rec.status)

    # Get output based on state
    output_text = ""
    if rec.status == "running":
        output_text = capture_agent_output(rec.tmux_window, lines=30) or ""
    else:
        output_text = read_output(rec.workspace) or ""

    artifacts = []
    if output_text and a2a_state == "completed":
        artifacts.append({
            "name": f"{agent_name}-result",
            "parts": [{"type": "text", "text": output_text}],
        })

    return {
        "id": task_id,
        "status": {
            "state": a2a_state,
            "message": {
                "role": "agent",
                "parts": [{"type": "text", "text": output_text}],
            } if output_text and a2a_state != "completed" else None,
        },
        "artifacts": artifacts if artifacts else None,
        "metadata": {
            "oa_agent_name": agent_name,
            "oa_model": getattr(rec, "model", "claude"),
            "oa_workspace": rec.workspace,
            "created_at": rec.created_at,
            "finished_at": rec.finished_at,
        },
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@a2a_bp.route("/agent.json")
def agent_card():
    """Serve the A2A Agent Card (equivalent to /.well-known/agent.json)."""
    return jsonify(_build_agent_card())


@a2a_bp.route("/tasks", methods=["GET"])
def list_tasks():
    """List all agents as A2A tasks."""
    agents = list_agents()
    tasks = []
    for rec in agents:
        task = _build_task_response(rec.name)
        if task:
            tasks.append(task)
    return jsonify({"tasks": tasks})


@a2a_bp.route("/tasks/<task_id>", methods=["GET"])
def get_task(task_id: str):
    """Get a single A2A task by ID."""
    agent_name = _task_to_agent.get(task_id)
    if agent_name is None:
        # Try interpreting task_id as agent name directly
        rec = get_agent(task_id)
        if rec is None:
            return jsonify({
                "jsonrpc": "2.0",
                "error": {"code": -32602, "message": f"Task '{task_id}' not found"},
            }), 404
        agent_name = task_id

    task = _build_task_response(agent_name)
    if task is None:
        return jsonify({
            "jsonrpc": "2.0",
            "error": {"code": -32602, "message": f"Task '{task_id}' not found"},
        }), 404
    return jsonify(task)


@a2a_bp.route("/tasks/send", methods=["POST"])
def send_task():
    """Create a new task (spawn an oa agent) via A2A protocol.

    Expects JSON body with A2A TaskSendParams structure:
    {
        "message": {
            "role": "user",
            "parts": [{"type": "text", "text": "task description"}]
        },
        "metadata": {
            "model": "claude/sonnet",  // optional
            "name": "my-agent"         // optional
        }
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({
            "jsonrpc": "2.0",
            "error": {"code": -32600, "message": "Invalid request: missing JSON body"},
        }), 400

    # Extract task text from A2A message structure
    message = data.get("message", {})
    parts = message.get("parts", [])
    task_text = ""
    for part in parts:
        if part.get("type") == "text":
            task_text += part.get("text", "")

    if not task_text:
        return jsonify({
            "jsonrpc": "2.0",
            "error": {"code": -32602, "message": "No text part found in message"},
        }), 400

    # Extract optional metadata
    metadata = data.get("metadata", {})
    model = metadata.get("model", "claude/sonnet")
    name = metadata.get("name", "") or generate_agent_name(task_text)

    # Ensure tmux session
    if not session_exists():
        start_session()

    try:
        rec = spawn_agent(name, task_text, model=model)
    except RuntimeError as e:
        return jsonify({
            "jsonrpc": "2.0",
            "error": {"code": -32603, "message": str(e)},
        }), 500

    task_id = _ensure_task_id(rec.name)

    return jsonify({
        "id": task_id,
        "status": {
            "state": "submitted",
            "message": {
                "role": "agent",
                "parts": [{"type": "text", "text": f"Agent '{rec.name}' spawned."}],
            },
        },
        "metadata": {
            "oa_agent_name": rec.name,
            "oa_model": model,
            "oa_workspace": rec.workspace,
        },
    }), 201
