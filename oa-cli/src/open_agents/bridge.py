"""Bridge — local Flask server that connects the React SPA to oa-cli functions."""

from __future__ import annotations

import functools
import json
import os
import secrets
import signal
import subprocess
import time
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS


# --- API Token Authentication ---

_TOKEN_FILE = Path.home() / ".oa" / "bridge-token"


def _load_or_create_token() -> str:
    """Load or create the API authentication token."""
    if _TOKEN_FILE.exists():
        return _TOKEN_FILE.read_text().strip()
    token = secrets.token_hex(32)
    _TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    _TOKEN_FILE.write_text(token)
    _TOKEN_FILE.chmod(0o600)
    return token


API_TOKEN = _load_or_create_token()


def require_auth(f):
    """Decorator that requires a valid X-API-Token or Authorization: Bearer <token> header."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        # Try X-API-Token header first
        provided = request.headers.get("X-API-Token", "")
        # If not provided, try Authorization: Bearer <token>
        if not provided:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                provided = auth_header[7:]
        # Validate the token
        if not provided or not secrets.compare_digest(provided, API_TOKEN):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

from .lifecycle import capture_agent_output, check_agent, clean_finished, kill_agent
from .messaging import broadcast_message, mark_read, read_inbox, send_message, unread_count
from .spawner import spawn_agent, spawn_remote_agent
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
    from .checkpoint import list_incomplete, resume_from_checkpoint, load_checkpoint
    _checkpoints_ok = True
except ImportError:
    _checkpoints_ok = False

try:
    from .terminal_server import register_terminal_routes
    _terminal_available = True
except ImportError:
    _terminal_available = False

try:
    from .a2a_adapter import a2a_bp
    _a2a_available = True
except ImportError:
    _a2a_available = False

# Resolve the web/dist directory (built React SPA)
WEB_DIR = Path(__file__).parent.parent.parent / "web" / "dist"

app = Flask(__name__, static_folder=str(WEB_DIR), static_url_path="")

# Register WebSocket terminal routes (requires flask-sock + ptyprocess)
if _terminal_available:
    register_terminal_routes(app)

# Register A2A protocol adapter routes (/a2a/*)
if _a2a_available:
    app.register_blueprint(a2a_bp)

CORS(app,
     origins=["http://localhost:5173", "http://127.0.0.1:5173",
              "http://localhost:5174", "http://127.0.0.1:5174",
              "http://localhost:5175", "http://127.0.0.1:5175",
              "tauri://localhost"],
     methods=["GET", "POST", "PUT", "DELETE"],
     allow_headers=["Content-Type", "X-API-Token"])

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
@require_auth
def api_spawn_agent():
    """Spawn a new agent."""
    data = request.get_json()
    if not data or "task" not in data:
        return jsonify({"error": "Missing 'task' field"}), 400

    task = data["task"]
    name = data.get("name", "")
    model = data.get("model", "claude")
    parent = data.get("parent", None)
    machine = data.get("machine", "")

    # Auto-generate name if not provided
    if not name:
        name = generate_agent_name(task)

    # Ensure session exists
    if not session_exists():
        start_session()

    try:
        if model.startswith("hetzner/"):
            # hetzner/* models always route to Hetzner regardless of machine field
            from .config import get_machine_host
            host = machine if machine else (get_machine_host("hetzner") or "hetzner-agent")
            rec = spawn_remote_agent(name, task, host=host, model=model, direct=True)
        elif machine:
            rec = spawn_remote_agent(name, task, host=machine, model=model, direct=True)
        else:
            rec = spawn_agent(name, task, model=model, parent=parent or None)
        return jsonify(_agent_to_dict(rec)), 201
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/machines', methods=['GET'])
@require_auth
def api_list_machines():
    """List available machines for agent spawning."""
    from .config import load_machines_config
    return jsonify(load_machines_config())


def _parse_ollama_list(output: str, machine_id: str) -> list[dict]:
    """Parse 'ollama list' text output into model descriptors."""
    models = []
    for line in output.strip().splitlines():
        if line.startswith('NAME') or not line.strip():
            continue
        parts = line.split()
        if parts:
            name = parts[0]
            models.append({
                'id': f"hetzner/{name}",
                'name': name,
                'machine': machine_id,
                'type': 'ollama',
                'size': parts[2] if len(parts) > 2 else None,
            })
    return models


@app.route('/api/machines/<machine_id>/models', methods=['GET'])
def api_machine_models(machine_id: str):
    """List models available on a specific machine.

    For machines with Ollama capability: SSHes to the host and runs 'ollama list'.
    Falls back to static model list from machines.json capabilities field.
    """
    import subprocess as _sp
    from .config import load_machines_config
    machines = load_machines_config()
    machine = next((m for m in machines if m['id'] == machine_id), None)

    if machine is None:
        return jsonify({'error': f"Machine '{machine_id}' not found"}), 404

    host = machine.get('host', '')
    if host and machine.get('capabilities', {}).get('ollama', False):
        try:
            result = _sp.run(
                ['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5',
                 host, 'ollama list 2>/dev/null'],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                return jsonify(_parse_ollama_list(result.stdout, machine_id))
        except Exception:
            pass

    # Fall back to static capabilities from machines.json
    static_models = machine.get('capabilities', {}).get('models', [])
    return jsonify([
        {
            'id': f"hetzner/{m}",
            'name': m,
            'machine': machine_id,
            'type': 'ollama',
        }
        for m in static_models
    ])


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
@require_auth
def api_kill_agent(name: str):
    """Kill a running agent."""
    success = kill_agent(name)
    if success:
        return jsonify({"status": "killed", "name": name})
    return jsonify({"error": f"Agent '{name}' not found"}), 404


@app.route("/api/agents/<name>/pause", methods=["POST"])
@require_auth
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
@require_auth
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
@require_auth
def api_clean():
    """Clean finished agent workspaces."""
    cleaned = clean_finished()
    return jsonify({"cleaned": cleaned})


@app.route("/api/session/start", methods=["POST"])
@require_auth
def api_start_session():
    """Start the tmux session."""
    created = start_session()
    return jsonify({"created": created})


@app.route("/api/session/status")
def api_session_status():
    """Check if tmux session exists."""
    return jsonify({"exists": session_exists()})


@app.route("/api/session/stop", methods=["POST"])
@require_auth
def api_stop_session():
    """Stop the oa session."""
    result = subprocess.run(
        ["oa", "stop"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return jsonify({"error": result.stderr.strip() or "oa stop failed"}), 500
    return jsonify({"status": "stopped"})


@app.route("/api/session/cost")
def api_session_cost():
    """Return session cost (telemetry placeholder — sprint 22)."""
    return jsonify({"tokens_used": 0, "cost_usd": 0.0})


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
@require_auth
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


@app.route("/api/auth/token")
def api_get_auth_token():
    """Return the API token for the local web UI (only reachable from localhost)."""
    return jsonify({"token": API_TOKEN})


@app.route("/api/health")
def api_health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


# --- A2A well-known endpoint (spec requires /.well-known/agent.json) ---


@app.route("/.well-known/agent.json")
def well_known_agent_card():
    """Serve the A2A Agent Card at the spec-required well-known URL."""
    if _a2a_available:
        from .a2a_adapter import _build_agent_card
        return jsonify(_build_agent_card())
    return jsonify({"error": "A2A adapter not available"}), 501


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


@app.route("/api/pipeline", methods=["POST"])
@require_auth
def api_start_pipeline():
    """Start an oa pipeline via subprocess, return {pipeline_id, status}."""
    data = request.get_json()
    if not data or "task" not in data:
        return jsonify({"error": "Missing 'task' field"}), 400
    task = data["task"]
    pipeline_id = f"pipe-{int(time.time())}"
    try:
        subprocess.Popen(
            ["oa", "pipeline", task, "--name", pipeline_id],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return jsonify({"pipeline_id": pipeline_id, "status": "started"}), 201
    except FileNotFoundError:
        return jsonify({"error": "oa CLI not found in PATH"}), 500


@app.route("/api/pipeline/<pipeline_id>/status")
def api_pipeline_status(pipeline_id: str):
    """Return the status of all agents belonging to a pipeline."""
    agents = list_agents()
    related = [
        _agent_to_dict(rec)
        for rec in agents
        if rec.name.startswith(pipeline_id) or rec.name.startswith("pipe-")
    ]
    statuses = [a["status"] for a in related]
    overall = (
        "running" if "running" in statuses
        else "done" if statuses and all(s == "done" for s in statuses)
        else "failed" if "failed" in statuses or "error" in statuses
        else "unknown"
    )
    return jsonify({"pipeline_id": pipeline_id, "status": overall, "agents": related})


@app.route("/api/run", methods=["POST"])
def api_run_agent():
    """Alias for /api/agents POST — spawn an agent via /api/run."""
    return api_spawn_agent()


@app.route("/api/spawn", methods=["POST"])
def api_spawn_alias():
    """Alias for /api/agents POST — spawn an agent via /api/spawn."""
    return api_spawn_agent()


@app.route("/api/agents/<name>", methods=["DELETE"])
@require_auth
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
@require_auth
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
@require_auth
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
@require_auth
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
@require_auth
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
@require_auth
def api_delete_team(name: str):
    if not _teams_ok:
        return jsonify({"error": "teams module not available"}), 501
    deleted = delete_team(name)
    if not deleted:
        return jsonify({"error": f"Team '{name}' not found"}), 404
    return jsonify({"deleted": name})


@app.route("/api/teams/<name>/broadcast", methods=["POST"])
@require_auth
def api_team_broadcast(name: str):
    """Broadcast a message to all agents in a team via oa broadcast."""
    if not _teams_ok:
        return jsonify({"error": "teams module not available"}), 501
    if get_team(name) is None:
        return jsonify({"error": f"Team '{name}' not found"}), 404
    data = request.get_json() or {}
    content = data.get("content")
    if not content:
        return jsonify({"error": "Missing 'content' field"}), 400
    sender = data.get("from", f"team-{name}")
    result = subprocess.run(
        ["oa", "broadcast", content, "--from", sender],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return jsonify({"error": result.stderr.strip() or "broadcast failed"}), 500
    return jsonify({"status": "broadcast", "team": name, "from": sender})


@app.route("/api/teams/<name>/tasks")
def api_team_tasks(name: str):
    """List tasks for a specific team — alias for /api/tasks/<team>."""
    if not _tasks_ok:
        return jsonify({"error": "task_list module not available"}), 501
    if _teams_ok and get_team(name) is None:
        return jsonify({"error": f"Team '{name}' not found"}), 404
    return jsonify(list_tasks(name))


@app.route("/api/teams/<name>/members", methods=["POST"])
@require_auth
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
@require_auth
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
@require_auth
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
@require_auth
def api_resume_agent(agent: str):
    if not _checkpoints_ok:
        return jsonify({"error": "checkpoint module not available"}), 501
    try:
        resume_task = resume_from_checkpoint(agent)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    cp = load_checkpoint(agent)
    model = cp.get("model", "claude/sonnet") if cp else "claude/sonnet"
    if not model or model == "claude":
        model = "claude/sonnet"
    resume_name = f"{agent}-resume"
    # Truncate name to 62 chars max (agent name validation)
    if len(resume_name) > 62:
        resume_name = resume_name[:55] + "-resume"
    try:
        spawn_agent(resume_name, resume_task, model=model)
    except Exception:
        # Fallback: invoke oa CLI via subprocess
        subprocess.run(["oa", "resume", agent], capture_output=True)
    return jsonify({"spawned": resume_name, "task": resume_task})


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
        "remote_host": getattr(rec, "remote_host", None),
        "remote_workspace": getattr(rec, "remote_workspace", None),
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


@app.route("/api/compaction/status")
def api_compaction_status():
    """Get compaction status for all running agents."""
    from .compaction import check_and_compact_all, get_compaction_history
    results = check_and_compact_all(dry_run=True)
    history = get_compaction_history(limit=20)
    return jsonify({"agents": results, "history": history})


@app.route("/api/compaction/trigger", methods=["POST"])
def api_trigger_compaction():
    """Trigger compaction for all agents above threshold."""
    from .compaction import check_and_compact_all
    results = check_and_compact_all(dry_run=False)
    compacted = [r for r in results if r["action"] == "compacted"]
    return jsonify({"compacted": len(compacted), "results": results})


# ---------------------------------------------------------------------------
# Chat API — local-first, provider-agnostic  (issue #63 + #76)
# ---------------------------------------------------------------------------
# Supported model prefixes:
#   claude/*     → Anthropic API (requires ANTHROPIC_API_KEY)
#   ollama/*     → Local Ollama (/api/chat on localhost:11434 or custom host)
#   hetzner/*    → Remote Ollama on GPU server via SSH (OpenAI-compat format)
# ---------------------------------------------------------------------------
# OpenAI-compatible message format is used internally — no vendor lock-in.
# To add a new provider: add a prefix + streaming function, update _chat_stream().
# ---------------------------------------------------------------------------

@app.route("/api/chat", methods=["POST"])
def api_chat():
    """Non-streaming chat completion.

    Body: {model, messages: [{role, content}], system?}
    Returns: {role, content, model, provider}
    """
    data = request.get_json()
    if not data or "messages" not in data:
        return jsonify({"error": "Missing 'messages' field"}), 400

    model: str = data.get("model", "ollama/llama3.2")
    messages: list[dict] = data["messages"]
    system: str = data.get("system", "")

    try:
        reply = _chat_complete(model, messages, system, stream=False)
        return jsonify({"role": "assistant", "content": reply, "model": model})
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/chat/stream", methods=["POST"])
def api_chat_stream():
    """Streaming chat via SSE.

    Body: {model, messages: [{role, content}], system?}
    SSE events:
        data: {"delta": "<chunk>"}   — content chunk
        data: {"done": true}         — stream finished
        data: {"error": "<msg>"}     — error
    """
    data = request.get_json()
    if not data or "messages" not in data:
        return jsonify({"error": "Missing 'messages' field"}), 400

    model: str = data.get("model", "ollama/llama3.2")
    messages: list[dict] = data["messages"]
    system: str = data.get("system", "")

    def generate():
        try:
            for chunk in _chat_stream(model, messages, system):
                payload = json.dumps({"delta": chunk})
                yield f"data: {payload}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except RuntimeError as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.route("/api/chat/models", methods=["GET"])
def api_chat_models():
    """List available chat models (Ollama local + Hetzner GPU + Claude if key set).

    Never returns cloud-paid models unless explicitly configured.
    All hetzner/* models are local GPU (no API cost).
    """
    models = []

    # Claude models — only if API key is explicitly configured
    # (subscription users use claude/ prefix via tmux spawning, not chat API)
    if os.environ.get("ANTHROPIC_API_KEY"):
        models += [
            {"id": "claude/claude-opus-4-6", "provider": "claude", "name": "Claude Opus 4.6"},
            {"id": "claude/claude-sonnet-4-6", "provider": "claude", "name": "Claude Sonnet 4.6"},
            {"id": "claude/claude-haiku-4-5", "provider": "claude", "name": "Claude Haiku 4.5"},
        ]

    # Local Ollama models
    ollama_host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    try:
        import urllib.request as _req
        with _req.urlopen(f"{ollama_host}/api/tags", timeout=2) as resp:
            tags = json.loads(resp.read())
            for m in tags.get("models", []):
                name = m.get("name", "")
                # Skip embedding models in chat list
                if name and not any(e in name for e in ("embed", "bge", "nomic")):
                    models.append({
                        "id": f"ollama/{name}",
                        "provider": "ollama",
                        "name": name,
                        "size": m.get("size", 0),
                    })
    except Exception:
        pass

    # Hetzner GPU models — fetch live via SSH, fallback to known list
    ssh_host = os.environ.get("HETZNER_SSH_HOST", "hetzner-agent")
    try:
        import subprocess as _sub
        result = _sub.run(
            ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5",
             ssh_host, "ollama list 2>/dev/null"],
            capture_output=True, text=True, timeout=8
        )
        if result.returncode == 0:
            for line in result.stdout.strip().splitlines()[1:]:  # skip header
                parts = line.split()
                if parts:
                    name = parts[0]
                    # Skip embedding models
                    if not any(e in name for e in ("embed", "bge", "nomic")):
                        models.append({
                            "id": f"hetzner/{name}",
                            "provider": "hetzner",
                            "name": name,
                            "gpu": True,
                        })
        else:
            raise RuntimeError("SSH failed")
    except Exception:
        # Static fallback — known Hetzner models
        for name in ["qwen2.5:14b", "phi4:14b", "gemma3:27b", "llama3.1:8b",
                     "deepseek-r1:14b", "qwen2.5-coder:14b", "qwen2.5:32b"]:
            models.append({"id": f"hetzner/{name}", "provider": "hetzner",
                           "name": name, "gpu": True})

    return jsonify(models)


def _chat_complete(model: str, messages: list[dict], system: str, stream: bool) -> str:
    """Non-streaming completion — returns full reply string."""
    if stream:
        return "".join(_chat_stream(model, messages, system))
    return "".join(_chat_stream(model, messages, system))


def _chat_stream(model: str, messages: list[dict], system: str):
    """Yield content chunks from the appropriate provider.

    OpenAI-compatible messages format used throughout — no vendor lock-in.
    Add new providers by adding a prefix check + streaming function below.
    """
    if model.startswith("claude/"):
        yield from _stream_claude(model[len("claude/"):], messages, system)
    elif model.startswith("ollama/"):
        yield from _stream_ollama(model[len("ollama/"):], messages, system)
    elif model.startswith("hetzner/"):
        model_id = model[len("hetzner/"):]
        yield from _stream_hetzner_ollama(model_id, messages, system)
    else:
        raise RuntimeError(
            f"Unknown model prefix '{model}'. "
            "Supported: claude/*, ollama/*, hetzner/*"
        )


def _stream_claude(model_id: str, messages: list[dict], system: str):
    """Stream from Anthropic API via subprocess (avoids SDK import at module load)."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set.")

    try:
        import anthropic
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install anthropic")

    client = anthropic.Anthropic(api_key=api_key)
    kwargs: dict = {
        "model": model_id,
        "max_tokens": 8096,
        "messages": messages,
    }
    if system:
        kwargs["system"] = system

    with client.messages.stream(**kwargs) as stream:
        for text in stream.text_stream:
            yield text


def _stream_ollama(model_id: str, messages: list[dict], system: str):
    """Stream from local Ollama /api/chat endpoint."""
    import urllib.request as _req

    ollama_host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    payload = {
        "model": model_id,
        "messages": messages,
        "stream": True,
    }
    if system:
        # Prepend system message for Ollama
        payload["messages"] = [{"role": "system", "content": system}] + list(messages)

    body = json.dumps(payload).encode()
    req = _req.Request(
        f"{ollama_host}/api/chat",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    try:
        with _req.urlopen(req, timeout=120) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8").strip()
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                    delta = chunk.get("message", {}).get("content", "")
                    if delta:
                        yield delta
                    if chunk.get("done", False):
                        break
                except json.JSONDecodeError:
                    continue
    except OSError as exc:
        raise RuntimeError(f"Ollama not reachable at {ollama_host}: {exc}") from exc


def _stream_hetzner_ollama(model_id: str, messages: list[dict], system: str):
    """Stream from remote Ollama on Hetzner GPU server via SSH.

    Uses Ollama's OpenAI-compatible /v1/chat/completions endpoint.
    No API keys required — all local, no cloud.
    """
    import base64
    import subprocess as _sub

    if system:
        messages = [{"role": "system", "content": system}] + list(messages)

    payload_b64 = base64.b64encode(json.dumps({
        "model": model_id,
        "messages": messages,
        "stream": True,
    }).encode()).decode()

    # Script runs on the remote server — calls Ollama OpenAI-compat endpoint
    script = f"""
import base64, json, urllib.request, sys
payload = base64.b64decode("{payload_b64}")
req = urllib.request.Request(
    "http://localhost:11434/v1/chat/completions",
    data=payload,
    headers={{"Content-Type": "application/json"}}
)
try:
    with urllib.request.urlopen(req, timeout=300) as resp:
        for raw in resp:
            line = raw.decode("utf-8", errors="replace").strip()
            if not line.startswith("data: "):
                continue
            chunk = line[6:]
            if chunk == "[DONE]":
                break
            try:
                d = json.loads(chunk)
                content = d["choices"][0]["delta"].get("content", "")
                if content:
                    sys.stdout.write(content)
                    sys.stdout.flush()
            except Exception:
                pass
except Exception as e:
    sys.stderr.write(f"ERROR: {{e}}\\n")
    sys.exit(1)
"""

    ssh_host = os.environ.get("HETZNER_SSH_HOST", "hetzner-agent")
    encoded = base64.b64encode(script.encode()).decode()
    cmd = [
        "ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10",
        "-o", "ServerAliveInterval=30",
        ssh_host,
        f"echo {encoded} | base64 -d | python3",
    ]

    try:
        proc = _sub.Popen(cmd, stdout=_sub.PIPE, stderr=_sub.PIPE)
        assert proc.stdout is not None
        for chunk in iter(lambda: proc.stdout.read(64), b""):
            text = chunk.decode("utf-8", errors="replace")
            if text:
                yield text
        proc.wait(timeout=5)
        if proc.returncode not in (0, None):
            stderr = proc.stderr.read().decode(errors="replace") if proc.stderr else ""
            if stderr:
                raise RuntimeError(f"Hetzner SSH error: {stderr[:200]}")
    except OSError as exc:
        raise RuntimeError(f"SSH to {ssh_host} failed: {exc}") from exc


def run_bridge(port: int = 5174) -> None:
    """Start the bridge server."""
    import os as _os
    # Ensure tmux and common tools are findable regardless of how the bridge was started
    _env_path = _os.environ.get("PATH", "")
    for _p in ["/usr/bin", "/usr/local/bin", "/bin"]:
        if _p not in _env_path:
            _os.environ["PATH"] = _p + ":" + _os.environ.get("PATH", "")
    _kill_port(port)
    print(f"Open Agents bridge running on http://localhost:{port}")
    print(f"Web UI: http://localhost:{port}")
    print(f"Serving static files from: {WEB_DIR}")
    app.run(host="0.0.0.0", port=port, debug=False)


def start_vscode_bridge(port: int = 5175) -> None:
    """Start the lightweight VS Code bridge server on a separate port."""
    from .vscode_bridge import vscode_app

    _kill_port(port)
    print(f"VS Code bridge running on http://localhost:{port}")
    print(f"Endpoints: /health, /agents, /stream")
    print("Press Ctrl-C to stop")
    vscode_app.run(host="127.0.0.1", port=port, debug=False)
