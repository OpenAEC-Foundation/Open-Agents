# Feedback Loop

Open-Agents includes a **bidirectional communication system** between you (the meta-orchestrator) and your agents. Agents don't just run silently — they report progress, ask questions when blocked, and wait for your input.

---

## The meta-orchestrator

You are the **meta** orchestrator. In the messaging system, your inbox name is `meta`.

When agents need to communicate with you, they send messages to `meta`:

```bash
# From inside an agent:
oa send meta "✅ Research complete — found 12 relevant papers" --from researcher-agent
oa send meta "🔴 Blocked — need login credentials for the internal API" --from api-agent
oa send meta "✅ DONE: Generated 847 lines of tests across 5 files" --from test-writer
```

---

## Checking your inbox

Read messages sent to you:

```bash
oa inbox meta
```

Read only unread messages:

```bash
oa inbox meta --unread
```

Example output:

```
📬 Inbox: meta (3 unread)

[10:42] researcher-agent → meta
  ✅ Milestone: Read 12 papers, summarizing findings

[10:51] api-agent → meta
  🔴 Blocked: Need the database connection string — env var DB_URL is not set

[11:03] test-writer → meta
  ✅ DONE: 847 lines of tests, 98% coverage on auth module
```

---

## Watching for incoming messages

Instead of repeatedly checking `oa inbox`, watch for messages in real time:

```bash
oa watch-inbox meta
```

This streams new messages as they arrive. Press `Ctrl+C` to stop.

---

## Responding to agents

When an agent is blocked and waiting for your input, send them a message:

```bash
oa send api-agent "DB_URL=postgresql://localhost/mydb — use this" --from meta
```

The agent will receive this in its inbox and can continue:

```bash
# From inside the agent:
oa inbox api-agent --unread  # reads your response
```

---

## Unblocking a blocked agent

When an agent is waiting for a response, it typically polls its inbox:

```
🔴 Blocked: Waiting for database credentials. Checking inbox every 30s...
```

Once you send the needed information via `oa send`, the agent picks it up on the next poll and continues.

If an agent is genuinely stuck and won't recover, kill it and re-spawn with better instructions:

```bash
oa kill api-agent
oa run "Set up the database connection using DB_URL=postgresql://localhost/mydb ..." \
  --name api-agent --model claude/sonnet --direct
```

---

## Standard messaging conventions

Well-behaved agents follow these messaging conventions:

| Event | Message prefix | Example |
|-------|---------------|---------|
| Start | 🚀 Gestart: | `🚀 Gestart: Analyzing codebase` |
| Milestone | ✅ Milestone: | `✅ Milestone: Step 2 complete — 3 files written` |
| Blocked | 🔴 Geblokkeerd: | `🔴 Geblokkeerd: Need API key for external service` |
| Done | ✅ KLAAR: | `✅ KLAAR: Generated complete REST API in 6 files` |
| Error | ❌ FOUT: | `❌ FOUT: File not found at /tmp/input.json` |

When you spawn custom agents with `oa run`, include these conventions in your prompt to get consistent updates.

---

## Sub-agent hierarchies

Agents can spawn their own children, creating trees:

```
meta (you)
├── orchestrator
│   ├── researcher-1 (parent: orchestrator)
│   ├── researcher-2 (parent: orchestrator)
│   └── combiner (parent: orchestrator)
└── test-runner
```

In `oa status`, parent-child relationships are shown:

```
┌──────────────┬────────┬─────────┬─────────────┬───────────────────────────┐
│ NAME         │ MODEL  │ STATUS  │ PARENT      │ TASK                      │
├──────────────┼────────┼─────────┼─────────────┼───────────────────────────┤
│ orchestrator │ opus   │ running │ —           │ Build authentication...   │
│ researcher-1 │ sonnet │  done   │ orchestrator│ Research JWT libraries    │
│ researcher-2 │ sonnet │ running │ orchestrator│ Research session patterns │
│ combiner     │ sonnet │ waiting │ orchestrator│ Combine research outputs  │
│ test-runner  │ haiku  │ running │ —           │ Run pytest on auth...     │
└──────────────┴────────┴─────────┴─────────────┴───────────────────────────┘
```

Messages route through the hierarchy: children report to parents, parents report to meta.

---

## Broadcasting to all agents

Send a message to every running agent at once:

```bash
oa broadcast "Session ending in 10 minutes — wrap up and write output" --from meta
```

Useful for coordinating a graceful shutdown or redirecting all agents at once.

---

## Inter-agent messaging

Agents can also communicate directly with each other (not just with meta):

```bash
# Agent A tells Agent B that a shared file is ready
oa send combiner-agent "researcher-1 output is at /tmp/research-1.md" --from researcher-1
```

This enables coordination without going through you — for example, a combiner agent can wait for researchers to signal completion before starting.

---

## Next steps

→ [Multi-Agent Workflows](workflows.md) — Patterns that use the feedback loop effectively
→ [CLI Reference](../reference/cli.md) — Full messaging command reference
