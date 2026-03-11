# Open-Agents Bridge API Reference

The bridge is a local Flask server that connects the React SPA and external clients to oa-cli. It runs on **`http://localhost:5174`** by default.

Start it with:
```bash
oa web          # default port 5174
oa web --port 8080
```

---

## Authentication

State-changing endpoints require a `X-API-Token` header. Retrieve the token from:

```bash
curl http://localhost:5174/api/auth/token
# {"token": "abc123..."}
```

Then pass it in subsequent requests:
```bash
-H "X-API-Token: abc123..."
```

The token is stored in `~/.oa/bridge-token` and persists across restarts.

---

## System

### Health check

```bash
curl http://localhost:5174/api/health
```
```json
{"status": "ok"}
```

### Session status

```bash
curl http://localhost:5174/api/session/status
```
```json
{"exists": true}
```

### Start session

```bash
curl -X POST http://localhost:5174/api/session/start \
  -H "X-API-Token: $TOKEN"
```
```json
{"created": true}
```

### Stop session

```bash
curl -X POST http://localhost:5174/api/session/stop \
  -H "X-API-Token: $TOKEN"
```
```json
{"status": "stopped"}
```

### Clean finished workspaces

```bash
curl -X POST http://localhost:5174/api/clean \
  -H "X-API-Token: $TOKEN"
```
```json
{"cleaned": 3}
```

### Session cost

```bash
curl http://localhost:5174/api/session/cost
```
```json
{"tokens_used": 0, "cost_usd": 0.0}
```

---

## Agents

### List all agents

```bash
curl http://localhost:5174/api/agents
```

Returns an array of agent objects. Running agents include `live_output` (last 20 terminal lines). Finished agents include their result file content.

```json
[
  {
    "name": "researcher-abc",
    "task": "Summarise the latest AI papers",
    "status": "running",
    "model": "claude/sonnet",
    "parent": null,
    "created_at": 1710000000.0,
    "finished_at": null,
    "unread_messages": 0,
    "live_output": "Reading paper 1/5...",
    ...
  }
]
```

### Get agent details

```bash
curl http://localhost:5174/api/agents/researcher-abc
```

Running agents include `live_output` (last 50 lines). Finished agents include `result`.

```json
{
  "name": "researcher-abc",
  "status": "done",
  "result": "# Summary\n...",
  "live_output": null,
  ...
}
```

**404** if agent not found.

### Spawn a new agent

```bash
curl -X POST http://localhost:5174/api/agents \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Research the latest Claude models and write a summary",
    "name": "my-researcher",
    "model": "claude/sonnet",
    "parent": null
  }'
```

- `task` — required
- `name` — optional (auto-generated from task if omitted)
- `model` — optional, default `"claude"`
- `parent` — optional, parent agent name
- `machine` — optional, remote hostname for remote spawning

Returns `201 Created`:
```json
{"name": "my-researcher", "status": "running", ...}
```

**Aliases**: `POST /api/run` and `POST /api/spawn` are equivalent.

### Kill/delete an agent

```bash
# DELETE (RESTful)
curl -X DELETE http://localhost:5174/api/agents/my-researcher \
  -H "X-API-Token: $TOKEN"

# POST (legacy)
curl -X POST http://localhost:5174/api/agents/my-researcher/kill \
  -H "X-API-Token: $TOKEN"
```
```json
{"status": "killed", "name": "my-researcher"}
```

### Get agent output

```bash
curl "http://localhost:5174/api/agents/my-researcher/output?lines=100"
```
```json
{
  "name": "my-researcher",
  "status": "running",
  "output": "Step 1: Searching...\nStep 2: ..."
}
```

`lines` query param controls how many terminal lines to return (running agents only). Default: 50.

### Stream agent output (SSE)

```bash
curl -N http://localhost:5174/api/agents/my-researcher/stream
```

Server-Sent Events, one event per second:
```
data: {"output": "Reading paper 1/5...", "status": "running"}

data: {"output": "# Summary\n...", "status": "done"}
```

Stream closes when agent finishes.

### Pause an agent

Suspends the tmux pane. Status changes to `paused`.

```bash
curl -X POST http://localhost:5174/api/agents/my-researcher/pause \
  -H "X-API-Token: $TOKEN"
```
```json
{"status": "paused", "name": "my-researcher"}
```

### Resume a paused agent

```bash
curl -X POST http://localhost:5174/api/agents/my-researcher/resume \
  -H "X-API-Token: $TOKEN"
```
```json
{"status": "running", "name": "my-researcher"}
```

---

## Messaging

Agents communicate via a file-backed inbox system.

### Get agent inbox

```bash
curl "http://localhost:5174/api/agents/my-researcher/messages?unread=true&limit=10"
# or equivalently:
curl "http://localhost:5174/api/messages/my-researcher?unread=true"
```
```json
{
  "agent": "my-researcher",
  "messages": [
    {"from": "orchestrator", "to": "my-researcher", "content": "Focus on 2025 papers only", "timestamp": 1710000000.0, "read": false}
  ],
  "unread": 1
}
```

### Send message to agent

```bash
curl -X POST http://localhost:5174/api/agents/my-researcher/messages \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from": "user", "content": "Please wrap up"}'
```
```json
{"status": "sent", "from": "user", "to": "my-researcher"}
```

### Send message (generic endpoint)

```bash
curl -X POST http://localhost:5174/api/messages \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from": "agent-a", "to": "agent-b", "content": "Task done"}'
```

### Broadcast to all agents

```bash
curl -X POST http://localhost:5174/api/messages/broadcast \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from": "orchestrator", "content": "Session ending in 5 min"}'
```
```json
{"status": "broadcast", "from": "orchestrator", "delivered_to": 4}
```

**Alias**: `POST /api/broadcast` is equivalent.

### Mark messages as read

```bash
curl -X POST http://localhost:5174/api/messages/my-researcher/read
```
```json
{"marked_read": 3}
```

---

## Pipeline

Pipelines run multi-step planner → workers → combiner workflows.

### List pipeline agents

```bash
curl http://localhost:5174/api/pipeline
```

Returns agents with names starting `pipe-`.

### Start a pipeline

```bash
curl -X POST http://localhost:5174/api/pipeline \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"task": "Research AI safety, then write a 5-page report"}'
```
```json
{"pipeline_id": "pipe-1710000000", "status": "started"}
```

### Get pipeline status

```bash
curl http://localhost:5174/api/pipeline/pipe-1710000000/status
```
```json
{
  "pipeline_id": "pipe-1710000000",
  "status": "running",
  "agents": [...]
}
```

Status values: `running`, `done`, `failed`, `unknown`.

---

## Teams

### List teams

```bash
curl http://localhost:5174/api/teams
```

### Create a team

```bash
curl -X POST http://localhost:5174/api/teams \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "backend-team", "members": ["agent-a", "agent-b"]}'
```

### Get team

```bash
curl http://localhost:5174/api/teams/backend-team
```

### Delete team

```bash
curl -X DELETE http://localhost:5174/api/teams/backend-team \
  -H "X-API-Token: $TOKEN"
```

### Add member

```bash
curl -X POST http://localhost:5174/api/teams/backend-team/members \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent": "agent-c"}'
```

### Broadcast to team

```bash
curl -X POST http://localhost:5174/api/teams/backend-team/broadcast \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Sprint review in 10 min", "from": "pm-agent"}'
```

### List team tasks

```bash
curl http://localhost:5174/api/teams/backend-team/tasks
```

---

## Tasks

### List tasks for a team

```bash
curl http://localhost:5174/api/tasks/backend-team
```

### Create task

```bash
curl -X POST http://localhost:5174/api/tasks/backend-team \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Write unit tests", "description": "Cover all new endpoints"}'
```

### Update task status

```bash
curl -X PUT http://localhost:5174/api/tasks/backend-team/task-123 \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

Status values: `pending`, `in_progress`, `done`.

---

## Templates

Agent prompt templates from `agents/library/`.

### List templates

```bash
curl http://localhost:5174/api/templates
```

### Load a template

```bash
curl http://localhost:5174/api/templates/research-swarm
```
```json
{
  "id": "research-swarm",
  "name": "Research Swarm",
  "description": "3 parallel researchers + combiner",
  "systemPrompt": "...",
  "modelHint": "claude/sonnet"
}
```

---

## Checkpoints

### List incomplete checkpoints

```bash
curl http://localhost:5174/api/checkpoints
```

### Resume from checkpoint

```bash
curl -X POST http://localhost:5174/api/resume/my-researcher \
  -H "X-API-Token: $TOKEN"
```

---

## Guardians

Guardians are automated monitoring agents that trigger on events.

### List guardians

```bash
curl http://localhost:5174/api/guardians
```
```json
[
  {"name": "error-watcher", "description": "Watches for agent errors", "last_triggered": 1710000000.0}
]
```

### Trigger a guardian manually

```bash
curl -X POST http://localhost:5174/api/guardians/trigger \
  -H "X-API-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"guardian": "error-watcher", "event": "manual_trigger"}'
```
```json
{"triggered": ["error-watcher"]}
```

---

## Machines

List machines configured for remote agent spawning (from `~/.oa/machines.yaml`).

```bash
curl http://localhost:5174/api/machines \
  -H "X-API-Token: $TOKEN"
```

---

## Compaction

Manage context compaction for long-running agents.

### Check compaction status

```bash
curl http://localhost:5174/api/compaction/status
```
```json
{
  "agents": [{"name": "researcher", "action": "skip", "reason": "below threshold"}],
  "history": [...]
}
```

### Trigger compaction

```bash
curl -X POST http://localhost:5174/api/compaction/trigger
```
```json
{"compacted": 2, "results": [...]}
```

---

## A2A Protocol

Open-Agents implements the [A2A v0.3.0](https://google.github.io/A2A/) spec for inter-agent communication with external systems.

### Agent Card

```bash
curl http://localhost:5174/.well-known/agent.json
```

Returns the A2A Agent Card for the Open-Agents orchestrator, enabling external agents to discover capabilities and endpoints.

---

## Agent object reference

All agent endpoints return objects with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique agent identifier |
| `task` | string | Task prompt |
| `workspace` | string | Temp directory path |
| `tmux_window` | string | tmux window identifier |
| `model` | string | Model used (e.g. `claude/sonnet`) |
| `parent` | string\|null | Parent agent name |
| `status` | string | `running`, `done`, `error`, `killed`, `paused` |
| `created_at` | float | Unix timestamp |
| `finished_at` | float\|null | Unix timestamp when finished |
| `unread_messages` | int | Unread message count |
| `pid` | int\|null | Process ID |
| `depth` | int | Nesting depth (0 = top-level) |
| `lineage` | string[] | Parent chain |
| `max_children` | int | Max sub-agent limit |
| `last_activity` | float | Last activity timestamp |
| `auto_cleanup_minutes` | int | Auto-cleanup timeout |
| `live_output` | string\|null | Terminal output (running) or result (done) |
| `result` | string\|null | Final output (only when not running) |

---

## Error responses

All errors return JSON with an `error` field:

```json
{"error": "Agent 'foo' not found"}
```

Common HTTP status codes:

| Code | Meaning |
|------|---------|
| 400 | Missing or invalid request body |
| 401 | Missing or invalid `X-API-Token` |
| 404 | Resource not found |
| 500 | Server-side error |
| 501 | Optional module not available |
