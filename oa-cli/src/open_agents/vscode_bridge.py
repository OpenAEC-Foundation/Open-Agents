"""VS Code Bridge — lightweight REST/SSE API for the VS Code extension.

Runs on port 5175 (separate from the web UI on 5174).
Provides the minimal endpoints VS Code needs to manage agents.
"""

from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

from flask import Flask, Response, jsonify, request
from flask_cors import CORS

from .state import get_agent, list_agents
from .lifecycle import capture_agent_output, check_agent, kill_agent
from .spawner import spawn_agent
from .tmux import session_exists, start_session
from .utils import generate_agent_name
from .workspace import read_output

try:
    from . import __version__
except ImportError:
    __version__ = "0.0.0"

vscode_app = Flask(__name__)
CORS(vscode_app, resources={r"/*": {"origins": "*"}})


def _agent_to_dict(rec) -> dict:
    """Convert an AgentRecord to a JSON-serializable dict."""
    return {
        "name": rec.name,
        "task": rec.task,
        "workspace": rec.workspace,
        "tmux_window": rec.tmux_window,
        "model": getattr(rec, "model", "claude"),
        "parent": getattr(rec, "parent", None),
        "status": rec.status,
        "created_at": rec.created_at,
        "finished_at": rec.finished_at,
        "pid": getattr(rec, "pid", None),
    }


# --- Health ---


@vscode_app.route("/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "version": __version__, "port": 5175})


# --- Agents ---


@vscode_app.route("/agents")
def agents_list():
    """List all agents with refreshed statuses."""
    agents = list_agents()
    for rec in agents:
        if rec.status == "running":
            check_agent(rec.name)
    agents = list_agents()
    result = [_agent_to_dict(rec) for rec in agents]
    return jsonify(result)


@vscode_app.route("/agents/<name>")
def agents_get(name: str):
    """Get a single agent by name."""
    rec = get_agent(name)
    if rec is None:
        return jsonify({"error": f"Agent '{name}' not found"}), 404
    check_agent(name)
    rec = get_agent(name)
    data = _agent_to_dict(rec)
    if rec.status == "running":
        data["live_output"] = capture_agent_output(rec.tmux_window, lines=50)
    else:
        data["live_output"] = read_output(rec.workspace)
    return jsonify(data)


@vscode_app.route("/agents/spawn", methods=["POST"])
def agents_spawn():
    """Spawn a new agent. Body: {task, name?, model?}."""
    data = request.get_json()
    if not data or "task" not in data:
        return jsonify({"error": "Missing 'task' field"}), 400

    task = data["task"]
    name = data.get("name", "")
    model = data.get("model", "claude")

    if not name:
        name = generate_agent_name(task)

    if not session_exists():
        start_session()

    try:
        rec = spawn_agent(name, task, model=model)
        return jsonify(_agent_to_dict(rec)), 201
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400


@vscode_app.route("/agents/<name>/kill", methods=["POST"])
def agents_kill(name: str):
    """Kill a running agent."""
    success = kill_agent(name)
    if success:
        return jsonify({"status": "killed", "name": name})
    return jsonify({"error": f"Agent '{name}' not found"}), 404


@vscode_app.route("/agents/<name>/logs")
def agents_logs(name: str):
    """Get the last N lines of agent output (default 50)."""
    rec = get_agent(name)
    if rec is None:
        return jsonify({"error": f"Agent '{name}' not found"}), 404

    lines = request.args.get("lines", 50, type=int)

    if rec.status == "running":
        output = capture_agent_output(rec.tmux_window, lines=lines)
    else:
        output = read_output(rec.workspace)

    return jsonify({"name": name, "status": rec.status, "output": output})


# --- SSE Stream ---


@vscode_app.route("/stream")
def stream():
    """SSE stream: broadcasts agent status updates every 2 seconds."""
    def generate():
        while True:
            agents = list_agents()
            for rec in agents:
                if rec.status == "running":
                    check_agent(rec.name)
            # Re-read after status refresh
            agents = list_agents()
            snapshot = [_agent_to_dict(rec) for rec in agents]
            data = json.dumps({"agents": snapshot, "timestamp": time.time()})
            yield f"data: {data}\n\n"
            time.sleep(2)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )
