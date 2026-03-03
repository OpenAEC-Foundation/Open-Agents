"""Bridge — local Flask server that connects the React SPA to oa-cli functions."""

from __future__ import annotations

import json
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS

from .lifecycle import capture_agent_output, check_agent, clean_finished, kill_agent
from .spawner import spawn_agent
from .tmux import session_exists, start_session
from .state import get_agent, list_agents
from .utils import generate_agent_name
from .workspace import read_output

# Resolve the web/dist directory (built React SPA)
WEB_DIR = Path(__file__).parent.parent.parent / "web" / "dist"

app = Flask(__name__, static_folder=str(WEB_DIR), static_url_path="")
CORS(app)


# --- Static files (React SPA) ---


@app.route("/")
def index():
    return send_from_directory(str(WEB_DIR), "index.html")


# --- Agent endpoints ---


@app.route("/api/agents")
def api_list_agents():
    """List all agents with refreshed statuses."""
    agents = list_agents()
    for rec in agents:
        if rec.status == "running":
            check_agent(rec.name)
    # Reload after status updates
    agents = list_agents()
    return jsonify([_agent_to_dict(rec) for rec in agents])


@app.route("/api/agents/<name>")
def api_get_agent(name: str):
    """Get a single agent with detail."""
    rec = get_agent(name)
    if rec is None:
        return jsonify({"error": f"Agent '{name}' not found"}), 404
    check_agent(name)
    rec = get_agent(name)
    data = _agent_to_dict(rec)

    # Add output
    if rec.status == "running":
        data["live_output"] = capture_agent_output(rec.tmux_window, lines=50)
    else:
        data["live_output"] = None
        data["result"] = read_output(rec.workspace)

    return jsonify(data)


@app.route("/api/agents/<name>/output")
def api_agent_output(name: str):
    """Get live terminal output from a running agent."""
    rec = get_agent(name)
    if rec is None:
        return jsonify({"error": f"Agent '{name}' not found"}), 404

    lines = request.args.get("lines", 50, type=int)

    if rec.status == "running":
        output = capture_agent_output(rec.tmux_window, lines=lines)
    else:
        output = read_output(rec.workspace)

    return jsonify({"name": name, "status": rec.status, "output": output})


@app.route("/api/agents", methods=["POST"])
def api_spawn_agent():
    """Spawn a new agent."""
    data = request.get_json()
    if not data or "task" not in data:
        return jsonify({"error": "Missing 'task' field"}), 400

    task = data["task"]
    name = data.get("name", "")
    model = data.get("model", "claude")
    parent = data.get("parent", None)

    # Auto-generate name if not provided
    if not name:
        name = generate_agent_name(task)

    # Ensure session exists
    if not session_exists():
        start_session()

    try:
        rec = spawn_agent(name, task, model=model, parent=parent or None)
        return jsonify(_agent_to_dict(rec)), 201
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/agents/<name>/kill", methods=["POST"])
def api_kill_agent(name: str):
    """Kill a running agent."""
    success = kill_agent(name)
    if success:
        return jsonify({"status": "killed", "name": name})
    return jsonify({"error": f"Agent '{name}' not found"}), 404


@app.route("/api/clean", methods=["POST"])
def api_clean():
    """Clean finished agent workspaces."""
    cleaned = clean_finished()
    return jsonify({"cleaned": cleaned})


@app.route("/api/session/start", methods=["POST"])
def api_start_session():
    """Start the tmux session."""
    created = start_session()
    return jsonify({"created": created})


@app.route("/api/session/status")
def api_session_status():
    """Check if tmux session exists."""
    return jsonify({"exists": session_exists()})


# --- Helpers ---


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
    }


def run_bridge(port: int = 5174) -> None:
    """Start the bridge server."""
    print(f"Open Agents bridge running on http://localhost:{port}")
    print(f"Web UI: http://localhost:{port}")
    print(f"Serving static files from: {WEB_DIR}")
    app.run(host="127.0.0.1", port=port, debug=False)
