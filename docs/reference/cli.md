# CLI Reference

Complete reference for all `oa` commands.

---

## Session management

### `oa start`

Start the Open-Agents tmux session.

```bash
oa start
```

Creates a tmux session named `oa` where all agents run. Must be called before spawning agents.

---

### `oa stop`

Stop the Open-Agents session and all running agents.

```bash
oa stop
```

!!! warning
    This kills all running agents. Make sure to collect output first.

---

### `oa status`

Show the status of all agents.

```bash
oa status
```

```
┌─────────────┬────────┬─────────┬──────────────────────────────┐
│ NAME        │ MODEL  │ STATUS  │ TASK                         │
├─────────────┼────────┼─────────┼──────────────────────────────┤
│ researcher  │ sonnet │ running │ Research React 19 new...     │
│ documenter  │ haiku  │  done   │ Generate OpenAPI docs...     │
│ reviewer    │ opus   │  error  │ Review PR #42 for security.. │
└─────────────┴────────┴─────────┴──────────────────────────────┘
```

Status values:

| Status | Meaning |
|--------|---------|
| `running` | Agent is actively working |
| `done` | Agent finished successfully |
| `error` | Agent encountered an error |
| `killed` | Agent was stopped manually |
| `paused` | Agent is suspended |

---

## Spawning agents

### `oa run`

Spawn a new agent.

```bash
oa run "<task>" [options]
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--name NAME` | auto-generated | Unique name for the agent |
| `--model MODEL` | `claude/sonnet` | Model to use |
| `--direct` | false | Write directly to project (skip workspace isolation) |
| `--template TEMPLATE` | none | Use a template from the library |
| `--parent NAME` | none | Parent agent name |
| `--workspace DIR` | auto-created | Use existing workspace directory |
| `--prompt-file FILE` | none | Read task from a file |

**Examples:**

```bash
# Basic spawn
oa run "Write a Python CLI for parsing CSV files" --name csv-parser --model claude/sonnet --direct

# Using a template
oa run --template research-swarm "Latest trends in WebAssembly" --name wasm-research --direct

# From a file (for complex prompts)
oa run --prompt-file /tmp/complex-task.txt --name complex-agent --model claude/opus --direct

# With parent (nested agent)
oa run "Implement the auth routes" --name auth-builder --model claude/sonnet --parent orchestrator --direct
```

---

### `oa pipeline`

Run a multi-step planner → workers → combiner pipeline.

```bash
oa pipeline "<task>"
```

Automatically spawns:

1. A **planner** agent (Opus) that creates a structured task breakdown
2. **Worker** agents (Sonnet) that implement each subtask in parallel
3. A **combiner** agent (Sonnet) that integrates all results

```bash
oa pipeline "Build a REST API for a todo application with authentication, CRUD endpoints, and tests"
```

Monitor with `oa status` — pipeline agents are named `pipe-<timestamp>-*`.

---

### `oa delegate`

Spawn an autonomous orchestrator agent that plans and delegates work.

```bash
oa delegate "<high-level goal>"
```

The delegate agent analyzes the goal, creates a plan, and spawns specialized sub-agents automatically.

```bash
oa delegate "Migrate our Flask application to FastAPI"
```

---

## Monitoring

### `oa watch`

Stream live output from a running agent.

```bash
oa watch <name>
```

```bash
oa watch researcher
# Streams the agent's terminal output in real time
# Press Ctrl+C to stop watching (agent keeps running)
```

---

### `oa collect`

Get the completed output from a finished agent.

```bash
oa collect <name>
```

```bash
oa collect researcher
# Prints output/result.md from the agent's workspace
```

Pipe to a file:

```bash
oa collect researcher > /tmp/research-output.md
```

---

## Agent lifecycle

### `oa kill`

Stop a running agent.

```bash
oa kill <name>
```

```bash
oa kill researcher
# Kills the tmux pane and marks the agent as killed
```

---

### `oa clean`

Remove all finished/killed agent workspaces.

```bash
oa clean
```

Frees disk space by removing `/tmp/oa-workspaces/*` for completed agents.

---

## Messaging

### `oa send`

Send a message to an agent.

```bash
oa send <to> "<message>" --from <sender>
```

```bash
# Send as meta-orchestrator to an agent
oa send researcher "Focus on 2024-2025 publications only" --from meta

# Agent-to-agent communication
oa send combiner "Your input files are ready at /tmp/research/*.md" --from researcher-1
```

---

### `oa inbox`

Read messages in an agent's inbox.

```bash
oa inbox <name> [--unread]
```

```bash
oa inbox meta          # all messages to meta
oa inbox meta --unread # only unread messages
oa inbox researcher-1  # messages to researcher-1
```

---

### `oa watch-inbox`

Watch for incoming messages in real time.

```bash
oa watch-inbox <name>
```

```bash
oa watch-inbox meta
# Streams new messages as they arrive
# Press Ctrl+C to stop
```

---

### `oa broadcast`

Send a message to all running agents.

```bash
oa broadcast "<message>" --from <sender>
```

```bash
oa broadcast "Wrap up — session ending in 10 minutes" --from meta
```

---

## Templates

### `oa templates`

List available agent templates.

```bash
oa templates [--category CATEGORY] [--search TERM]
```

```bash
oa templates                    # list all templates
oa templates --category code-dev # filter by category
oa templates --search "security" # search by keyword
```

---

## Interfaces

### `oa dashboard`

Open the Textual TUI dashboard — a real-time overview of all agents in the terminal.

```bash
oa dashboard
```

Shows agent status, model, task, and live output in a terminal UI. Press `q` to quit.

---

### `oa web`

Start the React web UI and Bridge API server.

```bash
oa web [--port PORT]
```

```bash
oa web           # starts at http://localhost:5174
oa web --port 8080  # custom port
```

The web UI provides:
- Visual canvas for building agent workflows
- Real-time agent monitoring
- Template browser
- Inter-agent messaging

---

## Utilities

### `oa version`

Show the installed version.

```bash
oa version
# Open-Agents v0.3.1
```

---

### `oa doctor`

Run a health check on all dependencies.

```bash
oa doctor
```

```
✅ Python 3.11.4
✅ tmux 3.3a
✅ Claude Code CLI v1.x.x
✅ oa v0.3.1
✅ agents/library: 1612 templates found
```

---

## Quick reference

| Command | Description |
|---------|-------------|
| `oa start` | Start tmux session |
| `oa stop` | Stop session and all agents |
| `oa status` | Show all agents |
| `oa run "<task>"` | Spawn an agent |
| `oa pipeline "<task>"` | Multi-agent pipeline |
| `oa delegate "<goal>"` | Autonomous orchestrator |
| `oa watch <name>` | Stream live output |
| `oa collect <name>` | Get completed output |
| `oa kill <name>` | Stop one agent |
| `oa clean` | Remove finished workspaces |
| `oa send <to> "<msg>"` | Send message to agent |
| `oa inbox <name>` | Read agent inbox |
| `oa watch-inbox <name>` | Watch for messages |
| `oa broadcast "<msg>"` | Message all agents |
| `oa templates` | List agent templates |
| `oa dashboard` | TUI dashboard |
| `oa web` | React web UI |
| `oa version` | Show version |
| `oa doctor` | Health check |
