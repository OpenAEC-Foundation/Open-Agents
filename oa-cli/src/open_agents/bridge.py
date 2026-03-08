"""Bridge — local Flask server that connects the React SPA to oa-cli functions."""

from __future__ import annotations

import json
import os
import signal
import subprocess
import time
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS

from .lifecycle import capture_agent_output, check_agent, clean_finished, kill_agent
from .messaging import broadcast_message, mark_read, read_inbox, send_message, unread_count
from .spawner import spawn_agent
from .tmux import session_exists, start_session
from .state import get_agent, list_agents, update_agent
from .utils import generate_agent_name
from .workspace import read_output
from .guardians import list_guardians, trigger_guardian, SESSION_LOG_PATH

try:
    from .teams import create_team, get_team, list_teams, add_member, delete_team
    _teams_ok = True
except ImportError:
    _teams_ok = False

try:
    from .task_list import create_task, list_tasks, update_task
    _tasks_ok = True
except ImportError:
    _tasks_ok = False

try:
    from .template_loader import list_templates, load_template
    _templates_ok = True
except ImportError:
    _templates_ok = False

try:
    from .checkpoint import list_incomplete, resume_from_checkpoint
    _checkpoints_ok = True
except ImportError:
    _checkpoints_ok = False

# Resolve the web/dist directory (built React SPA)
WEB_DIR = Path(__file__).parent.parent.parent / "web" / "dist"

app = Flask(__name__, static_folder=str(WEB_DIR), static_url_path="")
CORS(app)

# PERF: Short-lived cache for /api/agents to prevent N+1 file reads per poll cycle.
# The frontend polls every 2 s; caching for 1 s absorbs burst requests without
# staling status information for more than one extra second.
_AGENTS_CACHE_TTL = 1.0  # seconds
_agents_result_cache: list | None = None
_agents_result_cache_ts: float = 0.0


# --- Static files (React SPA) ---


@app.route("/")
def index():
    return send_from_directory(str(WEB_DIR), "index.html")


# --- Agent endpoints ---


@app.route("/api/agents")
def api_list_agents():
    """List all agents with refreshed statuses."""
    global _agents_result_cache, _agents_result_cache_ts
    now = time.time()
    # PERF: Return cached result within TTL to prevent N+1 file reads per poll
    if _agents_result_cache is not None and (now - _agents_result_cache_ts) < _AGENTS_CACHE_TTL:
        return jsonify(_agents_result_cache)
    agents = list_agents()
    for rec in agents:
        if rec.status == "running":
            check_agent(rec.name)
    # Reload once after all status updates (state.py cache makes this cheap)
    agents = list_agents()
    result = []
    for rec in agents:
        d = _agent_to_dict(rec)
        if rec.status == "running":
            d["live_output"] = capture_agent_output(rec.tmux_window, lines=20)
        else:
            d["live_output"] = read_output(rec.workspace)
        result.append(d)
    _agents_result_cache = result
    _agents_result_cache_ts = now
    return jsonify(result)


@app.route("/api/agents/<name>")
def api_get_agent(name: str):
    """Get a single agent with detail."""
    rec = get_agent(name)
    if rec is None:
        return jsonify({"error": f"Agent '{name}' not found"}), 404
    prev_status = rec.status
    check_agent(name)
    # PERF: Only re-read from disk if check_agent may have mutated state;
    # state.py write-through cache makes this a cheap in-memory lookup.
    if rec.status == "running":
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


@app.route("/api/agents/<name>/stream")
def api_agent_stream(name: str):
    """Stream agent output via Server-Sent Events (SSE)."""
    def generate():
        while True:
            rec = get_agent(name)
            if rec is None:
                data = json.dumps({"error": f"Agent '{name}' not found"})
                yield f"data: {data}\n\n"
                break

            if rec.status == "running":
                check_agent(name)
                rec = get_agent(name)
                output = capture_agent_output(rec.tmux_window, lines=50)
            else:
                output = read_output(rec.workspace)

            data = json.dumps({"output": output or "", "status": rec.status})
            yield f"data: {data}\n\n"

            if rec.status != "running":
                break

            time.sleep(1)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.route("/api/agents/<name>/kill", methods=["POST"])
def api_kill_agent(name: str):
    """Kill a running agent."""
    success = kill_agent(name)
    if success:
        return jsonify({"status": "killed", "name": name})
    return jsonify({"error": f"Agent '{name}' not found"}), 404


@app.route("/api/agents/<name>/pause", methods=["POST"])
def api_pause_agent(name: str):
    """Pause a running agent by suspending its tmux pane."""
    rec = get_agent(name)
    if rec is None:
        return jsonify({"error": f"Agent '{name}' not found"}), 404
    if rec.status != "running":
        return jsonify({"error": f"Agent '{name}' is not running (status: {rec.status})"}), 400

    result = subprocess.run(
        ["tmux", "pause-pane", "-t", rec.tmux_window],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return jsonify({"error": f"Failed to pause agent: {result.stderr.strip()}"}), 500

    update_agent(name, status="paused")
    return jsonify({"status": "paused", "name": name})


@app.route("/api/agents/<name>/resume", methods=["POST"])
def api_resume_agent_pane(name: str):
    """Resume a paused agent by unpausing its tmux pane."""
    rec = get_agent(name)
    if rec is None:
        return jsonify({"error": f"Agent '{name}' not found"}), 404
    if rec.status != "paused":
        return jsonify({"error": f"Agent '{name}' is not paused (status: {rec.status})"}), 400

    result = subprocess.run(
        ["tmux", "pause-pane", "-U", "-t", rec.tmux_window],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return jsonify({"error": f"Failed to resume agent: {result.stderr.strip()}"}), 500

    update_agent(name, status="running")
    return jsonify({"status": "running", "name": name})


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


# --- Guardians endpoint ---


@app.route("/api/guardians")
def api_list_guardians():
    """List all configured guardians with last-triggered info from session log."""
    guardians = list_guardians()

    # Load session log to find last triggered timestamps
    last_triggered: dict[str, float] = {}
    if SESSION_LOG_PATH.exists():
        try:
            import json as _json
            log = _json.loads(SESSION_LOG_PATH.read_text())
            for entry in log:
                if entry.get("event") == "guardian_triggered":
                    name = entry.get("guardian", "")
                    ts = entry.get("timestamp", 0)
                    if name and ts > last_triggered.get(name, 0):
                        last_triggered[name] = ts
        except Exception:
            pass

    for g in guardians:
        g["last_triggered"] = last_triggered.get(g["name"])

    return jsonify(guardians)


@app.route("/api/guardians/trigger", methods=["POST"])
def api_trigger_guardian():
    """Manually trigger a specific guardian by name."""
    data = request.get_json() or {}
    event = data.get("event", "manual_trigger")
    guardian = data.get("guardian")

    if not guardian:
        return jsonify({"error": "Missing 'guardian' field"}), 400

    triggered = trigger_guardian(event, guardian_name=guardian)
    if not triggered:
        return jsonify({"error": f"Guardian '{guardian}' not found"}), 404

    return jsonify({"triggered": triggered})


@app.route("/api/health")
def api_health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


@app.route("/api/pipeline")
def api_list_pipelines():
    """List active pipeline agents (planner, subtask, and combiner agents)."""
    agents = list_agents()
    pipeline_agents = [
        _agent_to_dict(rec)
        for rec in agents
        if rec.name.startswith("pipe-")
    ]
    return jsonify(pipeline_agents)


@app.route("/api/run", methods=["POST"])
def api_run_agent():
    """Alias for /api/agents POST — spawn an agent via /api/run."""
    return api_spawn_agent()


@app.route("/api/spawn", methods=["POST"])
def api_spawn_alias():
    """Alias for /api/agents POST — spawn an agent via /api/spawn."""
    return api_spawn_agent()


@app.route("/api/agents/<name>", methods=["DELETE"])
def api_delete_agent(name: str):
    """Delete/kill an agent via DELETE /api/agents/:name."""
    success = kill_agent(name)
    if success:
        return jsonify({"status": "killed", "name": name})
    return jsonify({"error": f"Agent '{name}' not found"}), 404


@app.route("/api/agents/<name>/messages")
def api_agent_messages_get(name: str):
    """Get messages for an agent via /api/agents/:name/messages."""
    unread_only = request.args.get("unread", "false").lower() == "true"
    limit = request.args.get("limit", 50, type=int)
    messages = read_inbox(name, unread_only=unread_only, limit=limit)
    for msg in messages:
        msg.pop("_file", None)
    return jsonify({"agent": name, "messages": messages, "unread": unread_count(name)})


@app.route("/api/agents/<name>/messages", methods=["POST"])
def api_agent_messages_post(name: str):
    """Send a message to an agent via /api/agents/:name/messages."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400
    sender = data.get("from", "user")
    content = data.get("content")
    if not content:
        return jsonify({"error": "Missing 'content' field"}), 400
    send_message(sender, name, content)
    return jsonify({"status": "sent", "from": sender, "to": name}), 201


# --- Messaging endpoints ---


@app.route("/api/messages/<name>")
def api_get_messages(name: str):
    """Get messages from an agent's inbox."""
    unread_only = request.args.get("unread", "false").lower() == "true"
    limit = request.args.get("limit", 50, type=int)
    messages = read_inbox(name, unread_only=unread_only, limit=limit)
    # Strip internal _file field
    for msg in messages:
        msg.pop("_file", None)
    return jsonify({"agent": name, "messages": messages, "unread": unread_count(name)})


@app.route("/api/messages", methods=["POST"])
def api_send_message():
    """Send a message from one agent to another."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400
    sender = data.get("from", "user")
    recipient = data.get("to")
    content = data.get("content")
    if not recipient or not content:
        return jsonify({"error": "Missing 'to' and/or 'content' fields"}), 400

    send_message(sender, recipient, content)
    return jsonify({"status": "sent", "from": sender, "to": recipient}), 201


@app.route("/api/messages/broadcast", methods=["POST"])
def api_broadcast():
    """Broadcast a message to all running agents."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400
    sender = data.get("from", "user")
    content = data.get("content")
    if not content:
        return jsonify({"error": "Missing 'content' field"}), 400

    paths = broadcast_message(sender, content)
    return jsonify({"status": "broadcast", "from": sender, "delivered_to": len(paths) - 1}), 201


@app.route("/api/messages/<name>/read", methods=["POST"])
def api_mark_read(name: str):
    """Mark messages as read for an agent."""
    count = mark_read(name)
    return jsonify({"marked_read": count})


# --- Broadcast alias ---


@app.route("/api/broadcast", methods=["POST"])
def api_broadcast_alias():
    """Alias for /api/messages/broadcast."""
    return api_broadcast()


# --- Teams endpoints ---


@app.route("/api/teams")
def api_list_teams():
    if not _teams_ok:
        return jsonify({"error": "teams module not available"}), 501
    return jsonify(list_teams())


@app.route("/api/teams", methods=["POST"])
def api_create_team():
    if not _teams_ok:
        return jsonify({"error": "teams module not available"}), 501
    data = request.get_json() or {}
    name = data.get("name")
    members = data.get("members", [])
    if not name:
        return jsonify({"error": "Missing 'name'"}), 400
    return jsonify(create_team(name, members)), 201


@app.route("/api/teams/<name>")
def api_get_team(name: str):
    if not _teams_ok:
        return jsonify({"error": "teams module not available"}), 501
    team = get_team(name)
    if team is None:
        return jsonify({"error": f"Team '{name}' not found"}), 404
    return jsonify(team)


@app.route("/api/teams/<name>", methods=["DELETE"])
def api_delete_team(name: str):
    if not _teams_ok:
        return jsonify({"error": "teams module not available"}), 501
    deleted = delete_team(name)
    if not deleted:
        return jsonify({"error": f"Team '{name}' not found"}), 404
    return jsonify({"deleted": name})


@app.route("/api/teams/<name>/members", methods=["POST"])
def api_add_member(name: str):
    if not _teams_ok:
        return jsonify({"error": "teams module not available"}), 501
    data = request.get_json() or {}
    agent_name = data.get("agent")
    if not agent_name:
        return jsonify({"error": "Missing 'agent'"}), 400
    try:
        return jsonify(add_member(name, agent_name))
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404


# --- Tasks endpoints ---


@app.route("/api/tasks/<team>")
def api_list_tasks(team: str):
    if not _tasks_ok:
        return jsonify({"error": "task_list module not available"}), 501
    return jsonify(list_tasks(team))


@app.route("/api/tasks/<team>", methods=["POST"])
def api_create_task(team: str):
    if not _tasks_ok:
        return jsonify({"error": "task_list module not available"}), 501
    data = request.get_json() or {}
    title = data.get("title")
    description = data.get("description", "")
    if not title:
        return jsonify({"error": "Missing 'title'"}), 400
    return jsonify(create_task(team, title, description)), 201


@app.route("/api/tasks/<team>/<task_id>", methods=["PUT"])
def api_update_task(team: str, task_id: str):
    if not _tasks_ok:
        return jsonify({"error": "task_list module not available"}), 501
    data = request.get_json() or {}
    status = data.get("status")
    if not status:
        return jsonify({"error": "Missing 'status'"}), 400
    return jsonify(update_task(team, task_id, status))


# --- Templates endpoints ---


@app.route("/api/templates")
def api_list_templates():
    if not _templates_ok:
        return jsonify({"error": "template_loader module not available"}), 501
    return jsonify(list_templates())


@app.route("/api/templates/<template_id>")
def api_load_template(template_id: str):
    if not _templates_ok:
        return jsonify({"error": "template_loader module not available"}), 501
    tpl = load_template(template_id)
    if tpl is None:
        return jsonify({"error": f"Template '{template_id}' not found"}), 404
    return jsonify(tpl)


# --- Checkpoints endpoints ---


@app.route("/api/checkpoints")
def api_list_checkpoints():
    if not _checkpoints_ok:
        return jsonify({"error": "checkpoint module not available"}), 501
    return jsonify(list_incomplete())


@app.route("/api/resume/<agent>", methods=["POST"])
def api_resume_agent(agent: str):
    if not _checkpoints_ok:
        return jsonify({"error": "checkpoint module not available"}), 501
    result = resume_from_checkpoint(agent)
    return jsonify(result)


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
        "unread_messages": unread_count(rec.name),
        "pid": getattr(rec, "pid", None),
        "output_file": getattr(rec, "output_file", None),
        "depth": getattr(rec, "depth", 0),
        "lineage": getattr(rec, "lineage", []),
        "task_hash": getattr(rec, "task_hash", ""),
        "max_children": getattr(rec, "max_children", 10),
        "shared_results_dir": getattr(rec, "shared_results_dir", None),
        "last_activity": getattr(rec, "last_activity", 0.0),
        "auto_cleanup_minutes": getattr(rec, "auto_cleanup_minutes", 20),
        "project_root": getattr(rec, "project_root", None),
    }


def _kill_port(port: int) -> None:
    """Kill any process occupying the given port using lsof."""
    try:
        result = subprocess.run(
            ["lsof", f"-ti:{port}"],
            capture_output=True,
            text=True,
        )
        pids = result.stdout.strip().splitlines()
        if not pids:
            return
        for pid_str in pids:
            pid = int(pid_str.strip())
            print(f"[bridge] Killing stale process {pid} on port {port}...")
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        time.sleep(1)
        print(f"[bridge] Port {port} cleared.")
    except FileNotFoundError:
        # lsof not available; skip
        pass


def run_bridge(port: int = 5174) -> None:
    """Start the bridge server."""
    _kill_port(port)
    print(f"Open Agents bridge running on http://localhost:{port}")
    print(f"Web UI: http://localhost:{port}")
    print(f"Serving static files from: {WEB_DIR}")
    app.run(host="127.0.0.1", port=port, debug=False)


def start_vscode_bridge(port: int = 5175) -> None:
    """Start the lightweight VS Code bridge server on a separate port."""
    from .vscode_bridge import vscode_app

    _kill_port(port)
    print(f"VS Code bridge running on http://localhost:{port}")
    print(f"Endpoints: /health, /agents, /stream")
    print("Press Ctrl-C to stop")
    vscode_app.run(host="127.0.0.1", port=port, debug=False)
