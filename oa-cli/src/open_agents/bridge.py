"""Bridge — local Flask server that connects the React SPA to oa-cli functions."""

from __future__ import annotations

import json
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS

from .orchestrator import (
    capture_agent_output,
    check_agent,
    clean_finished,
    kill_agent,
    session_exists,
    spawn_agent,
    start_session,
)
from .state import get_agent, list_agents
from .workspace import list_proposals, read_output, read_proposal, read_proposals_summary

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
        import hashlib
        import time

        h = hashlib.md5(f"{task}{time.time()}".encode()).hexdigest()[:6]
        word = "".join(c for c in task.split()[0] if c.isalnum()).lower()[:10] if task.strip() else "agent"
        name = f"{word}-{h}"

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


@app.route("/api/agents/<name>/proposals")
def api_agent_proposals(name: str):
    """List proposals from a completed agent."""
    rec = get_agent(name)
    if rec is None:
        return jsonify({"error": f"Agent '{name}' not found"}), 404

    summary = read_proposals_summary(rec.workspace)
    proposals = list_proposals(rec.workspace)
    items = []
    for p in proposals:
        items.append({
            "filename": p.name,
            "content": read_proposal(p),
        })
    return jsonify({"summary": summary, "proposals": items})


@app.route("/api/agents/<name>/proposals/<filename>/apply", methods=["POST"])
def api_apply_proposal(name: str, filename: str):
    """Apply a single proposal from an agent."""
    import re

    rec = get_agent(name)
    if rec is None:
        return jsonify({"error": f"Agent '{name}' not found"}), 404

    proposals = list_proposals(rec.workspace)
    matches = [p for p in proposals if p.name == filename]
    if not matches:
        return jsonify({"error": f"Proposal '{filename}' not found"}), 404

    content = read_proposal(matches[0])

    # Extract target file path
    target_match = re.search(r'(?:Bestand|File|Target|Path):\s*[`"]?(/[^\s`"]+)', content)
    if not target_match:
        target_match = re.search(r'(?:schrijf naar|write to|target:)\s*[`"]?(/[^\s`"]+)', content, re.IGNORECASE)
    if not target_match:
        return jsonify({"error": "No target file path found in proposal"}), 400

    target_file = target_match.group(1)

    # Extract content from last code block
    code_blocks = re.findall(r'```(?:\w*)\n(.*?)```', content, re.DOTALL)
    if not code_blocks:
        return jsonify({"error": "No code block found in proposal"}), 400

    new_content = code_blocks[-1]
    Path(target_file).parent.mkdir(parents=True, exist_ok=True)
    Path(target_file).write_text(new_content)

    return jsonify({"applied": True, "target": target_file})


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
