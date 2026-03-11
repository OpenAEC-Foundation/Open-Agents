# Quick Start

Get your first agent running in 5 minutes.

---

## Step 1: Start a session

Open-Agents uses tmux to run agents in the background. Start the session first:

```bash
oa start
```

```
✅ Session 'oa' started
```

---

## Step 2: Spawn your first agent

Spawn an agent with a task, a name, and a model:

```bash
oa run "Write a Python function that calculates Fibonacci numbers" \
  --name fib-agent \
  --model claude/sonnet \
  --direct
```

- `--name fib-agent` — gives the agent a memorable name
- `--model claude/sonnet` — uses Sonnet (balanced speed/quality)
- `--direct` — agent writes output directly instead of proposals

You'll see:

```
✅ Agent 'fib-agent' spawned (claude/sonnet)
   Workspace: /tmp/oa-workspaces/fib-agent-abc123/
```

---

## Step 3: Watch it run

Check what all your agents are doing:

```bash
oa status
```

```
┌───────────┬────────┬─────────┬───────────────────────────────────────────┐
│ NAME      │ MODEL  │ STATUS  │ TASK                                      │
├───────────┼────────┼─────────┼───────────────────────────────────────────┤
│ fib-agent │ sonnet │ running │ Write a Python function that calculates...│
└───────────┴────────┴─────────┴───────────────────────────────────────────┘
```

To watch the agent's live output in real time:

```bash
oa watch fib-agent
```

Press `Ctrl+C` to stop watching (the agent keeps running).

---

## Step 4: Collect the output

Once the agent is done (status shows `done`), collect its output:

```bash
oa collect fib-agent
```

The output will be printed to your terminal. It's also saved in the agent's workspace directory.

---

## Step 5: Clean up

When you're done, stop the agent and remove its workspace:

```bash
oa kill fib-agent
```

Or clean up all finished agents at once:

```bash
oa clean
```

---

## Spawn multiple agents in parallel

The real power of Open-Agents is running many agents at the same time:

```bash
oa run "Write a REST API endpoint for user authentication" --name api-agent --model claude/sonnet --direct
oa run "Write unit tests for the auth endpoint" --name test-agent --model claude/sonnet --direct
oa run "Generate API documentation in OpenAPI format" --name docs-agent --model claude/haiku --direct
```

```bash
oa status
```

```
┌───────────┬────────┬─────────┬──────────────────────────────────────┐
│ NAME      │ MODEL  │ STATUS  │ TASK                                 │
├───────────┼────────┼─────────┼──────────────────────────────────────┤
│ api-agent │ sonnet │ running │ Write a REST API endpoint for...     │
│ test-agent│ sonnet │ running │ Write unit tests for the auth...     │
│ docs-agent│ haiku  │  done   │ Generate API documentation in...    │
└───────────┴────────┴─────────┴──────────────────────────────────────┘
```

All three are running simultaneously — independent Claude Code sessions, each focused on its task.

---

## What's next?

→ [Your First Agent](first-agent.md) — Understand workspaces, CLAUDE.md, and output files
→ [Spawning Agents](../guide/spawning.md) — All options for `oa run`
→ [Multi-Agent Workflows](../guide/workflows.md) — Patterns for coordinating agents
