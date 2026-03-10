# Bridge API Design — Missing Endpoints

> Copy-paste ready Flask implementations for `bridge.py`.
> Generated: 2026-03-08

---

## 1. `POST /api/pipeline` — Start Pipeline

### Request Body
```json
{
  "task": "string (required) — the pipeline task description",
  "model": "string (optional, default: 'claude') — model to use for all agents"
}
```

### Response Body `201`
```json
{
  "pipeline_id": "a3f9c2",
  "status": "started",
  "planner_name": "pipe-plan-a3f9c2",
  "task": "original task string"
}
```

### Error Cases
- `400` — Missing `task` field
- `500` — Failed to start tmux session or spawn planner

### Implementation

```python
import threading
from .pipeline import run_pipeline, _pipeline_id

# In-memory pipeline state tracker
_pipeline_states: dict[str, dict] = {}
_pipeline_lock = threading.Lock()


@app.route("/api/pipeline", methods=["POST"])
def api_start_pipeline():
    """Start a new pipeline (planner → subtasks → combiner) in background."""
    data = request.get_json()
    if not data or "task" not in data:
        return jsonify({"error": "Missing 'task' field"}), 400

    task = data["task"]
    model = data.get("model", "claude")

    # Generate pipeline ID upfront (mirrors _pipeline_id logic)
    import hashlib, time as _time
    raw = f"{task}{_time.time()}"
    pid = hashlib.md5(raw.encode()).hexdigest()[:6]

    planner_name = f"pipe-plan-{pid}"

    with _pipeline_lock:
        _pipeline_states[pid] = {
            "pipeline_id": pid,
            "task": task,
            "status": "running",
            "started_at": _time.time(),
            "finished_at": None,
            "error": None,
        }

    def _run():
        try:
            run_pipeline(task)
            with _pipeline_lock:
                if pid in _pipeline_states:
                    _pipeline_states[pid]["status"] = "done"
                    _pipeline_states[pid]["finished_at"] = _time.time()
        except Exception as exc:
            with _pipeline_lock:
                if pid in _pipeline_states:
                    _pipeline_states[pid]["status"] = "error"
                    _pipeline_states[pid]["error"] = str(exc)
                    _pipeline_states[pid]["finished_at"] = _time.time()

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    return jsonify({
        "pipeline_id": pid,
        "status": "started",
        "planner_name": planner_name,
        "task": task,
    }), 201
```

---

## 2. `GET /api/pipeline/<id>/status` — Pipeline Step Status

### Response Body `200`
```json
{
  "pipeline_id": "a3f9c2",
  "status": "running",
  "task": "original task",
  "started_at": 1709900000.0,
  "finished_at": null,
  "agents": [
    {"name": "pipe-plan-a3f9c2", "role": "planner", "status": "done"},
    {"name": "pipe-a3f9c2-research", "role": "subtask", "status": "running"},
    {"name": "pipe-comb-a3f9c2", "role": "combiner", "status": "pending"}
  ]
}
```

### Error Cases
- `404` — Pipeline ID not found (no agents with that prefix exist and not in state)

### Implementation

```python
@app.route("/api/pipeline/<pid>/status")
def api_pipeline_status(pid: str):
    """Get step-by-step status for a pipeline by its ID."""
    # Collect all agents that belong to this pipeline
    all_agents = list_agents()
    pipeline_agents = []
    for rec in all_agents:
        if rec.name == f"pipe-plan-{pid}":
            pipeline_agents.append({"name": rec.name, "role": "planner", "status": rec.status})
        elif rec.name == f"pipe-comb-{pid}":
            pipeline_agents.append({"name": rec.name, "role": "combiner", "status": rec.status})
        elif rec.name.startswith(f"pipe-{pid}-"):
            pipeline_agents.append({"name": rec.name, "role": "subtask", "status": rec.status})

    # Check in-memory state
    with _pipeline_lock:
        state = _pipeline_states.get(pid)

    if not pipeline_agents and state is None:
        return jsonify({"error": f"Pipeline '{pid}' not found"}), 404

    # Derive overall status from agent states if no in-memory state
    if state is None:
        statuses = {a["status"] for a in pipeline_agents}
        if "running" in statuses:
            overall = "running"
        elif all(s == "done" for s in statuses):
            overall = "done"
        else:
            overall = "unknown"
        state = {"pipeline_id": pid, "status": overall, "task": None,
                 "started_at": None, "finished_at": None}

    return jsonify({
        **state,
        "agents": pipeline_agents,
    })
```

---

## 3. `POST /api/session/stop` — Stop tmux Session

### Request Body
```json
{}
```
(No body required)

### Response Body `200`
```json
{"status": "stopped"}
```

### Error Cases
- `404` — No active session to stop
- `500` — tmux kill-session failed

### Implementation

```python
from .tmux import SESSION_NAME

@app.route("/api/session/stop", methods=["POST"])
def api_stop_session():
    """Kill the oa tmux session."""
    if not session_exists():
        return jsonify({"error": "No active session"}), 404

    result = subprocess.run(
        ["tmux", "kill-session", "-t", SESSION_NAME],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return jsonify({"error": f"Failed to stop session: {result.stderr.strip()}"}), 500

    return jsonify({"status": "stopped"})
```

---

## 4. `POST /api/agents/<name>/retry` — Retry Agent with Same Config

### Request Body
```json
{
  "model": "string (optional) — override model for retry"
}
```

### Response Body `201`
```json
{
  "name": "agent-name",
  "task": "...",
  "status": "running",
  "model": "claude/sonnet",
  "workspace": "/tmp/oa-agent-xyz/",
  "tmux_window": "agent-agent-name"
}
```

### Error Cases
- `404` — Agent not found
- `400` — Agent is still running (must be stopped first or already done/error)
- `500` — Failed to respawn

### Implementation

```python
@app.route("/api/agents/<name>/retry", methods=["POST"])
def api_retry_agent(name: str):
    """Kill (if running) and respawn an agent with its original config."""
    rec = get_agent(name)
    if rec is None:
        return jsonify({"error": f"Agent '{name}' not found"}), 404

    data = request.get_json() or {}
    model = data.get("model", getattr(rec, "model", "claude"))

    # Kill if still running
    if rec.status == "running":
        kill_agent(name)

    # Ensure session
    if not session_exists():
        start_session()

    try:
        new_rec = spawn_agent(
            name,
            rec.task,
            model=model,
            parent=getattr(rec, "parent", None),
        )
        return jsonify(_agent_to_dict(new_rec)), 201
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 500
```

---

## 5. `POST /api/tasks/<team>/<id>/claim` — Claim Task

### Request Body
```json
{
  "agent": "string (required) — agent name claiming the task"
}
```

### Response Body `200`
```json
{
  "id": "uuid",
  "team": "my-team",
  "description": "...",
  "status": "claimed",
  "claimed_by": "my-agent",
  "depends_on": [],
  "created_at": 1709900000.0,
  "completed_at": null
}
```

### Error Cases
- `400` — Missing `agent` field, task already claimed/done/blocked
- `404` — Task not found

### Implementation

```python
try:
    from .teams import claim_task
    _teams_ok = True  # already imported above; add claim_task to the same try block
except ImportError:
    pass


@app.route("/api/tasks/<team>/<task_id>/claim", methods=["POST"])
def api_claim_task(team: str, task_id: str):
    """Claim a task for an agent."""
    if not _tasks_ok:
        return jsonify({"error": "task_list module not available"}), 501
    data = request.get_json() or {}
    agent_name = data.get("agent")
    if not agent_name:
        return jsonify({"error": "Missing 'agent' field"}), 400
    try:
        task = claim_task(task_id, agent_name)
        return jsonify(task)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
```

> **Import note:** add `claim_task` to the existing `from .task_list import` block in bridge.py, or import from `teams` if that's where it lives.

---

## 6. `POST /api/tasks/<team>/<id>/complete` — Complete Task

### Request Body
```json
{}
```
(No body required)

### Response Body `200`
```json
{
  "id": "uuid",
  "team": "my-team",
  "description": "...",
  "status": "done",
  "claimed_by": "my-agent",
  "completed_at": 1709900010.0
}
```

### Error Cases
- `404` — Task not found
- `400` — Task cannot be completed (e.g. not claimed)

### Implementation

```python
try:
    from .teams import complete_task
except ImportError:
    pass


@app.route("/api/tasks/<team>/<task_id>/complete", methods=["POST"])
def api_complete_task(team: str, task_id: str):
    """Mark a task as done and unblock dependents."""
    if not _tasks_ok:
        return jsonify({"error": "task_list module not available"}), 501
    try:
        task = complete_task(task_id)
        return jsonify(task)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
```

---

## 7. `GET /api/session/cost` — Estimated Session Cost

Estimates token usage from workspace output files (rough heuristic: ~4 chars per token, ~$3/1M tokens for Sonnet).

### Response Body `200`
```json
{
  "estimated_tokens": 42000,
  "estimated_cost_usd": 0.126,
  "agent_count": 5,
  "breakdown": [
    {"name": "my-agent", "chars": 84000, "estimated_tokens": 21000}
  ]
}
```

### Implementation

```python
from pathlib import Path as _Path

COST_PER_M_TOKENS = 3.0  # USD, rough Sonnet pricing

@app.route("/api/session/cost")
def api_session_cost():
    """Estimate session token usage from workspace output sizes."""
    agents = list_agents()
    total_chars = 0
    breakdown = []

    for rec in agents:
        ws = _Path(rec.workspace) if rec.workspace else None
        chars = 0
        if ws and ws.exists():
            output_dir = ws / "output"
            if output_dir.exists():
                for f in output_dir.rglob("*"):
                    if f.is_file():
                        try:
                            chars += f.stat().st_size
                        except OSError:
                            pass
        # Also count task description
        chars += len(rec.task or "")
        total_chars += chars
        breakdown.append({
            "name": rec.name,
            "chars": chars,
            "estimated_tokens": chars // 4,
        })

    total_tokens = total_chars // 4
    cost_usd = round(total_tokens / 1_000_000 * COST_PER_M_TOKENS, 4)

    return jsonify({
        "estimated_tokens": total_tokens,
        "estimated_cost_usd": cost_usd,
        "agent_count": len(agents),
        "breakdown": breakdown,
    })
```

---

## 8. `DELETE /api/teams/<name>/members/<agent>` — Remove Team Member

### Response Body `200`
```json
{
  "name": "my-team",
  "members": ["agent-a", "agent-b"],
  "updated_at": 1709900020.0
}
```

### Error Cases
- `404` — Team not found
- `501` — teams module unavailable

### Implementation

```python
try:
    from .teams import remove_member
except ImportError:
    pass


@app.route("/api/teams/<name>/members/<agent_name>", methods=["DELETE"])
def api_remove_member(name: str, agent_name: str):
    """Remove an agent from a team."""
    if not _teams_ok:
        return jsonify({"error": "teams module not available"}), 501
    try:
        updated = remove_member(name, agent_name)
        return jsonify(updated)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
```

---

## 9. `POST /api/teams/<name>/broadcast` — Broadcast to Team

### Request Body
```json
{
  "content": "string (required) — message to broadcast",
  "from": "string (optional, default: 'user') — sender name"
}
```

### Response Body `201`
```json
{
  "status": "broadcast",
  "team": "my-team",
  "from": "orchestrator",
  "delivered_to": 3
}
```

### Error Cases
- `400` — Missing `content`
- `404` — Team not found
- `501` — teams module unavailable

### Implementation

```python
try:
    from .teams import broadcast
except ImportError:
    pass


@app.route("/api/teams/<name>/broadcast", methods=["POST"])
def api_team_broadcast(name: str):
    """Broadcast a message to all members of a team."""
    if not _teams_ok:
        return jsonify({"error": "teams module not available"}), 501
    data = request.get_json() or {}
    content = data.get("content")
    sender = data.get("from", "user")
    if not content:
        return jsonify({"error": "Missing 'content' field"}), 400

    # Verify team exists
    team = get_team(name)
    if team is None:
        return jsonify({"error": f"Team '{name}' not found"}), 404

    sent = broadcast(sender, content, team=name)
    return jsonify({
        "status": "broadcast",
        "team": name,
        "from": sender,
        "delivered_to": len(sent),
    }), 201
```

---

## Integration Checklist

Add to bridge.py import blocks:
```python
# In the teams try/except block, extend the import:
from .teams import create_team, get_team, list_teams, add_member, delete_team, \
    remove_member, broadcast, claim_task, complete_task

# At module level (for pipeline state):
import threading
_pipeline_states: dict = {}
_pipeline_lock = threading.Lock()

# In the pipeline try/except (new):
try:
    from .pipeline import run_pipeline
    _pipeline_ok = True
except ImportError:
    _pipeline_ok = False

# For session stop:
from .tmux import SESSION_NAME  # likely already imported via session_exists/start_session
```

> **Note on `claim_task` / `complete_task` location:** these functions are defined in `teams.py` (not `task_list.py`). Adjust the import accordingly.
