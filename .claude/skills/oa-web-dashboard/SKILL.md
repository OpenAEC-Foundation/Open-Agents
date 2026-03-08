---
name: oa-web-dashboard
description: "Access and interpret the oa web UI and Textual TUI. Use when opening the dashboard, checking agent status visually, reading logs, or using the bridge API. Activates for: oa dashboard, oa web, web UI, localhost:5174, bridge API."
user-invocable: false
allowed-tools: Bash(oa *)
---

## Critical Rules

- ALWAYS use `oa status` for quick CLI checks — because the dashboard is for visual monitoring, not scripted automation.
- NEVER rely on the bridge API from inside agent prompts — because agents do not have network access to localhost; use `oa` CLI commands instead.

## Decision Tree

```
Need to check agent state?
├── Quick CLI check → oa status
├── Detailed logs for one agent → oa logs <name> or oa collect <name>
├── Visual overview of all agents → oa dashboard (Textual TUI)
└── React web UI with canvas → oa web → open http://localhost:5174
```

## Instructions

1. Open the Textual TUI dashboard:
   ```bash
   oa dashboard
   ```

2. Start the React web UI (bridge server on port 5174):
   ```bash
   oa web
   ```
   Then open: http://localhost:5174

3. Check bridge health:
   ```bash
   curl http://localhost:5174/api/health
   ```

4. Query agent list via API:
   ```bash
   curl http://localhost:5174/api/agents
   ```

5. Get live output for a specific agent:
   ```bash
   curl http://localhost:5174/api/agents/<name>/output?lines=50
   ```

## Bridge API Endpoints

| Method | Endpoint | Purpose |
|--------|---------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/agents` | List all agents with status |
| GET | `/api/agents/<name>` | Get single agent detail |
| GET | `/api/agents/<name>/output` | Live terminal output (`?lines=N`) |
| POST | `/api/agents` | Spawn new agent (`task`, `name`, `model`) |
| POST | `/api/agents/<name>/kill` | Kill agent |
| POST | `/api/agents/<name>/pause` | Pause agent (suspend tmux pane) |
| POST | `/api/agents/<name>/resume` | Resume paused agent |
| POST | `/api/clean` | Clean finished workspaces |
| GET | `/api/session/status` | Check tmux session exists |
| POST | `/api/session/start` | Start tmux session |
| GET | `/api/pipeline` | List pipeline agents (pipe-*) |
| GET | `/api/guardians` | List configured guardians |
| POST | `/api/guardians/trigger` | Manually trigger a guardian |
| GET | `/api/messages/<name>` | Get agent inbox (`?unread=true`) |
| POST | `/api/messages` | Send message (`from`, `to`, `content`) |
| POST | `/api/broadcast` | Broadcast to all agents |
| GET | `/api/teams` | List teams |
| POST | `/api/teams` | Create team (`name`, `members`) |
| GET | `/api/teams/<name>` | Get team detail |
| GET | `/api/tasks/<team>` | List team tasks |
| POST | `/api/tasks/<team>` | Create task (`title`, `description`) |
| GET | `/api/templates` | List library templates |
| GET | `/api/templates/<id>` | Load specific template |
| GET | `/api/checkpoints` | List incomplete checkpoints |
| POST | `/api/resume/<agent>` | Resume from checkpoint |

## Patterns

### Pattern 1: Spawn agent via bridge API
```bash
curl -X POST http://localhost:5174/api/agents \
  -H "Content-Type: application/json" \
  -d '{"task": "research topic X", "name": "researcher-1", "model": "claude/sonnet"}'
```

### Pattern 2: Check unread messages
```bash
curl "http://localhost:5174/api/messages/my-agent?unread=true"
```

## Anti-Patterns

- Bad: `curl localhost:5174/api/agents` from inside an agent prompt — agents cannot reach localhost bridge.
- Good: Use `oa status` and `oa collect <name>` for agent-to-system communication.
- Bad: Opening `oa web` for every status check — TUI or `oa status` is faster for scripted use.
- Good: Reserve `oa web` for visual canvas work or when monitoring many agents simultaneously.

## References

- Related: oa-orchestration-spawn, oa-teams-coordination, oa-library-discovery
