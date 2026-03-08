---
name: oa-orchestration-communication
description: "Inter-agent messaging and output collection in Open-Agents. Use when: sending messages between agents, checking inboxes, broadcasting announcements, or collecting completed agent output. Activates for: oa send, oa inbox, oa broadcast, oa collect, agent messaging, inter-agent communication."
allowed-tools: Bash(oa *)
user-invocable: false
---

# oa-orchestration-communication

## Quick Reference

### Critical Rules

Include `--from` flag when sending messages — omitting it defaults to `user` as sender, making agent attribution impossible in multi-agent sessions.

Run `oa collect <name>` only after the agent status is `done` — collecting from a `running` agent fails because the output file may not yet be written.

Do not poll `oa inbox` in a busy loop — check once, process messages, then proceed; polling wastes context and can cause rate limits.

### Decision Tree
```
Need to communicate?
├── Message to specific agent → oa send
├── Message to all running agents → oa broadcast
├── Check received messages → oa inbox
└── Get completed agent output → oa collect
```

## Essential Patterns

### Pattern 1: Send a message to a specific agent
```bash
oa send <recipient-name> "<message content>" --from <sender-name>

# Example:
oa send worker-1 "Focus only on section 3, skip section 1-2" --from orchestrator
```

### Pattern 2: Check inbox (all messages)
```bash
oa inbox <agent-name>

# Example:
oa inbox worker-1
```

### Pattern 3: Check inbox (unread only)
```bash
oa inbox <agent-name> --unread

# Example:
oa inbox skill-orchestration --unread
```

### Pattern 4: Mark all messages as read
```bash
oa inbox <agent-name> --mark-read
```

### Pattern 5: Broadcast to all running agents
```bash
oa broadcast "<message>" --from <sender-name>

# Example:
oa broadcast "Priority change: focus on speed over completeness" --from orchestrator
```

### Pattern 6: Collect output from completed agent
```bash
oa collect <agent-name>

# Example:
oa collect researcher-a
```

## Command Reference Table

| Command | Syntax | When to Use |
|---------|--------|-------------|
| Send targeted message | `oa send <to> "<msg>" --from <from>` | Direct coordination between known agents |
| Check all inbox | `oa inbox <name>` | Review all received messages |
| Check unread inbox | `oa inbox <name> --unread` | Quick status check for new messages |
| Mark read | `oa inbox <name> --mark-read` | After processing messages |
| Broadcast to all | `oa broadcast "<msg>" --from <sender>` | System-wide announcements, priority changes |
| Get agent output | `oa collect <name>` | After agent status is `done` |

## Workflow Example: Coordination Pattern
```bash
# 1. Spawn workers
oa run "Research topic A..." --name researcher-a --model claude/sonnet --direct
oa run "Research topic B..." --name researcher-b --model claude/sonnet --direct

# 2. Mid-flight correction
oa send researcher-a "Also include pricing data in your research" --from orchestrator

# 3. Check if researcher-b has questions
oa inbox orchestrator --unread

# 4. Wait for completion then collect
oa status
oa collect researcher-a
oa collect researcher-b
```

## Workflow Example: Agent Self-Check
An agent checking its own inbox (inside an agent's CLAUDE.md task):
```bash
oa inbox <my-agent-name> --unread
```

## Broadcast Use Cases
- Priority changes affecting all workers
- Stop signals (when combined with manual `oa kill`)
- Progress checkpoints ("all agents: write progress snapshot now")
- Context updates that affect all parallel workers

## oa collect Details
- Reads `output.md` from the agent's workspace directory
- Returns nothing if `output.md` does not exist in the workspace
- Fails with warning if agent is still `running`
- Works for agents in `done`, `failed`, `killed`, or `timeout` status

## Reference
- Related: oa-orchestration-spawn, oa-orchestration-pipeline, oa-orchestration-patterns
