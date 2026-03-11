# Agent Pool Management & Scaling
## Research Report for Open-Agents #53

**Date**: 2026-03-11
**Author**: research-pool (oa agent, claude-sonnet-4-6)
**Status**: Final
**Relates to**: Sprint 4 (Pool Pattern), D-051, D-058, D-060, #50 (Registry), #55 (Dispatcher)

---

## Table of Contents

1. [What is Agent Pool Management?](#1-what-is-agent-pool-management)
2. [Process Manager Comparison](#2-process-manager-comparison)
3. [Scaling Policy Options](#3-scaling-policy-options)
4. [Resource Limits per Agent](#4-resource-limits-per-agent)
5. [Open-Agents Context: tmux-Based Spawning](#5-open-agents-context-tmux-based-spawning)
6. [Recommended MVP Scaling Approach](#6-recommended-mvp-scaling-approach)
7. [Decision Summary](#7-decision-summary)

---

## 1. What is Agent Pool Management?

Agent pool management is the discipline of maintaining a **set of ready-to-use agents** so that tasks can be dispatched without the cold-start cost of spinning up a new agent for every request.

### 1.1 Core Concepts

| Concept | Definition |
|---------|-----------|
| **Pool** | A collection of agents maintained in an idle or warm state, available for task assignment |
| **Pre-spawning** | Creating agents before work arrives so dispatch latency is near-zero |
| **Recycling** | Reusing an agent after it completes a task instead of terminating and re-creating it |
| **Scaling** | Adjusting pool size dynamically in response to load, schedule, or policy |
| **Worker slot** | A reserved capacity unit — one running agent occupies one slot |

### 1.2 Why it Matters for Open-Agents

Currently, Open-Agents uses **pure on-demand spawning**: every `oa run` creates a new agent from scratch. This works well at low concurrency but introduces:

1. **Cold-start latency**: every agent spends 3–8 seconds on workspace creation + Claude Code initialization before executing the task
2. **Resource spikes**: burst workloads create N agents simultaneously, each consuming CPU, memory, and API connections
3. **No backpressure**: if a user runs `oa pipeline` with 20 parallel tasks, all 20 spawn instantly regardless of system capacity
4. **No warm-up amortization**: recurring agent types (e.g., haiku scanners) repeat identical initialization for each task

Pool management addresses all four by keeping agents alive, limiting concurrency, and amortizing initialization.

### 1.3 Pool Lifecycle

```
          ┌──── pre-spawn ────┐
          │                   │
          ▼                   │
    ┌──────────┐    task    ┌──────────┐   done   ┌──────────┐
    │  IDLE    │───────────▶│ RUNNING  │──────────▶│  IDLE    │
    │ (warm)   │            │          │            │ (ready)  │
    └──────────┘            └──────────┘            └──────────┘
          │                      │                       │
    scale-in                  timeout                 recycle
    (too many idle)          (task hung)            (reset state)
          │                      │                       │
          ▼                      ▼                       ▼
    TERMINATED              TERMINATED              IDLE (next task)
```

**Recycling caveat**: Claude Code agents carry state in their context window. After recycling, the agent's context includes the previous task. This causes **context contamination** — the agent may carry incorrect assumptions into the new task. For Open-Agents, recycling requires either:
- A context-reset mechanism (new Claude Code session within the same workspace), or
- Limiting recycling to stateless agents (pure batch processors with `--direct`)

---

## 2. Process Manager Comparison

A process manager supervises a set of worker processes — restarting crashed workers, limiting concurrency, distributing tasks, and reporting health. The table below evaluates the four main options for Open-Agents.

### 2.1 Comparison Table

| Feature | supervisord | PM2 | systemd | Custom (oa-pool) |
|---------|:-----------:|:---:|:-------:|:----------------:|
| **Language** | Python | Node.js | C (Linux kernel) | Python |
| **Installation** | pip | npm | pre-installed | part of oa-cli |
| **Worker restart on crash** | ✅ | ✅ | ✅ | ✅ (planned) |
| **Max workers limit** | ✅ | ✅ | ✅ (slice) | ✅ |
| **Dynamic scaling** | ❌ (static config) | ✅ (cluster mode) | ❌ (manual) | ✅ |
| **Per-worker CPU limits** | ❌ | ❌ | ✅ (cgroup) | ⚠️ (via ulimit) |
| **Per-worker RAM limits** | ❌ | ❌ | ✅ (cgroup) | ⚠️ (via ulimit) |
| **tmux/subprocess workers** | ✅ | ✅ | ✅ | ✅ (native) |
| **Task queue built-in** | ❌ | ❌ | ❌ | ✅ |
| **agents.json integration** | ❌ | ❌ | ❌ | ✅ (native) |
| **oa messaging integration** | ❌ | ❌ | ❌ | ✅ (native) |
| **WSL2 compatibility** | ✅ | ✅ | ⚠️ (no systemd in WSL2 by default) | ✅ |
| **External dependencies** | 1 (pip) | 1 (npm) | 0 | 0 |
| **Learning curve** | Low | Low | Medium | Zero (same codebase) |
| **Fit for Open-Agents** | Medium | Medium | Low (WSL2) | High |

### 2.2 supervisord

**supervisord** manages long-running processes via a config file (`supervisord.conf`) and an XML-RPC API.

```ini
[program:oa-worker]
command=/home/freek/.local/bin/oa-worker --slot %(process_num)d
numprocs=4
autostart=true
autorestart=true
```

**Strengths**: mature, battle-tested, easy config, Python-based (fits oa-cli stack)
**Weaknesses**: static pool size (config-file only, no dynamic scaling), no task queue, no Open-Agents state integration
**Verdict**: viable external process supervisor but requires wrapping every agent in a persistent `oa-worker` daemon — this conflicts with the current ephemeral tmux model

### 2.3 PM2

**PM2** manages Node.js processes (and arbitrary scripts) with cluster mode for automatic fork scaling.

```bash
pm2 start oa-worker.sh --instances 4 --name oa-pool
pm2 scale oa-pool +2   # add workers dynamically
```

**Strengths**: cluster scaling, ecosystem file for multi-process configs, good monitoring UI
**Weaknesses**: Node.js dependency for a Python project, no built-in task queue, no awareness of Claude Code context lifecycle
**Verdict**: over-engineered for oa-cli; introduces npm dependency with no meaningful advantage over a custom solution

### 2.4 systemd

**systemd** can manage agent pools via service templates and slice units (cgroup-based resource limits).

```ini
# oa-agent@.service
[Service]
ExecStart=/home/freek/.local/bin/oa run %i
CPUQuota=25%
MemoryLimit=512M
```

**Strengths**: native cgroup resource limits (CPU%, RAM, I/O), socket activation, dependency ordering
**Weaknesses**: **WSL2 does not run systemd by default** (requires `systemd=true` in `/etc/wsl.conf`, not universal), poor dynamic scaling, config changes require `systemctl reload`
**Verdict**: not viable for WSL2 primary target; useful reference for Linux server deployments only

### 2.5 Custom oa-pool

A custom pool manager built into oa-cli, operating as an extension of the existing `agents.json` + tmux model.

```bash
oa pool start --size 3 --model claude/haiku --template scanner
oa pool scale --to 6
oa pool status
oa pool drain   # wait for tasks to complete, then stop
```

**Strengths**: full integration with `agents.json`, `oa messaging`, `oa status`; no external dependencies; can implement task queuing, recycling policies, and scaling rules natively
**Weaknesses**: custom implementation requires maintenance; no upstream bug fixes

**Verdict**: best fit for Open-Agents. The tmux model is already custom; a custom pool manager is a natural extension.

---

## 3. Scaling Policy Options

### 3.1 Fixed Pool

Maintain a constant number of agents regardless of load.

```
Pool size: 4
[ IDLE ]  [ IDLE ]  [ IDLE ]  [ IDLE ]
         ↓ tasks arrive ↓
[ WORK ]  [ WORK ]  [ IDLE ]  [ IDLE ]
         ↓ more tasks ↓
[ WORK ]  [ WORK ]  [ WORK ]  [ WORK ]   ← queue builds up
```

**Pros**: simple to reason about, predictable resource usage, no cold-start surprises
**Cons**: over-provisioned at low load (waste), under-provisioned at peak (queue grows)
**Best for**: known workloads with stable throughput (e.g., nightly batch jobs)

### 3.2 Auto-Scale (Reactive)

Pool size adjusts based on real-time metrics: queue depth, CPU, or agent utilization.

```
Scale-out rule: if queue_depth > 2 AND current_agents < MAX_AGENTS → spawn 1
Scale-in rule:  if idle_agents > MIN_IDLE AND uptime > 60s → terminate 1

MIN_AGENTS = 1
MAX_AGENTS = 8
SCALE_OUT_THRESHOLD = 2 queued tasks
SCALE_IN_COOLDOWN = 60s  (prevent thrashing)
```

**Pros**: efficient resource use, handles burst workloads automatically
**Cons**: cold-start latency when scaling out under load; thrashing risk without cooldown; complex to tune
**Best for**: variable workloads with unpredictable bursts

### 3.3 On-Demand (Current Model)

No pool. Every task spawns a new agent and terminates it after completion.

```
Task arrives → spawn agent → run → terminate
Task arrives → spawn agent → run → terminate
Task arrives → spawn agent → run → terminate
```

**Pros**: zero idle resource consumption, simplest implementation
**Cons**: cold-start on every task (3–8s), API connection re-establishment per task, no backpressure
**Best for**: low-frequency tasks, development, current Open-Agents behavior

### 3.4 Scheduled Pre-Warm

Pool scales up before anticipated load (e.g., pipeline start), then scales back down.

```
08:59  →  pre-warm: spawn 4 agents
09:00  →  pipeline runs against warm pool (near-zero dispatch latency)
09:45  →  pipeline complete: drain and scale to 0
```

**Pros**: minimal latency when the workload schedule is known; no idle waste between pipelines
**Cons**: requires schedule awareness; misses unexpected bursts
**Best for**: `oa pipeline` use case where orchestrator knows pool size needed upfront

### 3.5 Comparison Table

| Policy | Cold-Start | Resource Waste | Burst Handling | Complexity | Open-Agents Fit |
|--------|:----------:|:--------------:|:--------------:|:----------:|:---------------:|
| Fixed Pool | Low | High (idle waste) | Limited by size | Low | Medium |
| Auto-Scale | Varies | Low | Good | High | High (long-term) |
| On-Demand | High | Zero | Poor | Zero | Current state |
| Pre-Warm | Zero | Low (short window) | Good (if scheduled) | Medium | **High (MVP)** |

---

## 4. Resource Limits per Agent

### 4.1 Why Limits Matter

Claude Code agents are unrestricted by default: a single runaway agent can consume 100% CPU or exhaust available RAM. In a pool scenario with 8 concurrent agents, resource contention degrades all agents.

### 4.2 Available Mechanisms

**ulimit (shell-level)**
```bash
# Limit per-process memory to 512MB
ulimit -v 524288

# Limit file descriptors (relevant for tmux + claude code IPC)
ulimit -n 256
```
- Applies to the tmux window's shell and its children
- Simple to add to `oa run` wrapper script
- No CPU quota control (ulimit -t is CPU time, not CPU %)

**cgroups v2 (Linux kernel)**
```bash
# Create a cgroup for agent
cgcreate -g cpu,memory:oa-agents/worker-001

# Limit CPU to 25% of one core
cgset -r cpu.max="25000 100000" oa-agents/worker-001

# Limit RAM to 512MB
cgset -r memory.max=536870912 oa-agents/worker-001

# Run agent in cgroup
cgexec -g cpu,memory:oa-agents/worker-001 claude --dangerously-skip-permissions ...
```
- Full CPU% and RAM limits
- Requires root or `CAP_SYS_ADMIN` to create cgroups
- Works on WSL2 with `[wsl2] kernelCommandLine = cgroup_no_v1=all` (not universal)

**nice / ionice (priority, not limits)**
```bash
nice -n 10 claude ...    # lower scheduling priority
ionice -c 2 -n 7 claude  # reduce I/O priority
```
- Doesn't cap usage, just reduces priority relative to other processes
- Zero-config, no root required
- Effective for preventing agent thrashing on shared systems

**Token budget (application-level)**

The most practical limit for Open-Agents: enforce a token budget in the agent's CLAUDE.md prompt.

```markdown
## Resource Budget
- Max output tokens: 4000
- Max files written: 5
- Max tool calls: 20
- On budget exceeded: write partial result and create .done
```

This is already partially implemented via the `max_tokens_output` field in the dispatcher research (#55).

### 4.3 Recommended Approach for Open-Agents

For WSL2 MVP without requiring root:

| Mechanism | Use | Limit |
|-----------|-----|-------|
| `nice -n 10` | Always | Reduce scheduling priority |
| `ulimit -v` | Per pool slot | RAM ceiling (512MB default) |
| Token budget in CLAUDE.md | Always | Control LLM output scope |
| `MAX_CONCURRENT_AGENTS` in pool | Always | System-level concurrency cap |

For Linux server deployment (future):
- Add cgroup v2 support via `systemd --user` slices or direct cgroupfs

---

## 5. Open-Agents Context: tmux-Based Spawning

### 5.1 Current Architecture

Open-Agents spawns agents as tmux windows within a session. Each window runs `claude` CLI with a workspace-specific `CLAUDE.md`. State is tracked in `~/.oa/agents.json`.

```
tmux session: oa
├── window: meta-orchestrator  (user's Claude Code session)
├── window: worker-001         (oa run → tmux new-window)
├── window: worker-002         (oa run → tmux new-window)
└── window: worker-003         (oa run → tmux new-window)
```

**Key constraint**: tmux windows are not processes — they are pseudo-terminals. Resource limits at the tmux level require wrapping the `claude` command.

### 5.2 Pool Integration with tmux

An `oa pool` implementation maps naturally onto tmux:

```
tmux session: oa
├── window: meta-orchestrator
├── window: pool-haiku-001     (IDLE — waiting for task)
├── window: pool-haiku-002     (RUNNING — task in progress)
├── window: pool-haiku-003     (IDLE — waiting for task)
└── window: pool-manager       (pool daemon: dispatches tasks, monitors health)
```

The pool manager window runs a Python daemon (`oa/pool.py`) that:
1. Maintains a task queue (file-based: `~/.oa/pool/queue/*.json`)
2. Monitors agent status via `~/.oa/agents.json`
3. Dispatches tasks to idle agents via `oa send`
4. Scales pool size by calling `oa run` / `oa kill`

### 5.3 Context Contamination Problem

Recycling a Claude Code agent after a completed task is **not safe without a context reset**. The agent's conversation history carries the previous task's context, which can bias subsequent task interpretation.

**Options**:

| Approach | Safety | Cost |
|----------|--------|------|
| Terminate + re-spawn | ✅ Clean context | Cold-start on each recycle |
| New `claude` invocation in same tmux window | ✅ Clean context | Only workspace reuse |
| Continue same `claude` session | ❌ Context pollution | Zero cold-start |
| Pre-spawn idle `claude` sessions waiting for input | ✅ Clean context | Memory for idle sessions |

**Recommended**: Pre-spawn idle `claude --dangerously-skip-permissions` sessions that wait for a task file to appear in the workspace. When a task arrives, the workspace builder writes the task CLAUDE.md and signals the idle agent (via a sentinel file). This gives near-zero dispatch latency with clean per-task context.

### 5.4 Flat Spawning Constraint

Open-Agents enforces **flat spawning** (L-004): all agents spawn directly from the meta-orchestrator session, never from within another agent. Pool management must respect this:

```
✅ Pool manager (in meta session) → spawns pool workers
✅ Pool manager → dispatches tasks to pool workers via oa send
❌ Pool worker → spawns sub-workers (violates flat spawning)
```

The pool manager is a **daemon in the meta session's context**, not an agent itself. It runs as a background tmux window under the orchestrator's supervision.

---

## 6. Recommended MVP Scaling Approach

### 6.1 Design: Pre-Warm + On-Demand Hybrid

For Open-Agents MVP, the recommended scaling policy is a **hybrid of pre-warm and on-demand**:

```
oa pipeline / oa run (bulk)
    │
    ▼
Pool Manager
    │
    ├─ If pool exists and has idle slot → dispatch immediately (pre-warm path)
    │
    └─ If no pool or all slots busy:
        ├─ If queue_depth ≤ MAX_QUEUE → enqueue task, spawn +1 agent if < MAX_POOL
        └─ If queue_depth > MAX_QUEUE → reject with backpressure signal
```

**Configuration** (in `~/.oa/pool.json`):
```json
{
  "min_pool_size": 0,
  "max_pool_size": 6,
  "max_queue_depth": 10,
  "idle_timeout_seconds": 120,
  "default_model": "claude/haiku",
  "scale_out_threshold": 2,
  "scale_in_cooldown_seconds": 60
}
```

### 6.2 MVP Implementation Plan

**Phase 1: Basic pool (no recycling)**
```
oa pool start --size N --model claude/haiku
  → spawns N pre-warmed agents in idle state
  → writes pool config to ~/.oa/pool/config.json

oa pool dispatch "<task>"
  → finds idle agent, sends task via oa send
  → agent completes, signals done via .done file
  → pool manager marks agent as idle again (or terminates + re-spawns)

oa pool drain
  → waits for running agents to finish, terminates all
```

**Phase 2: Auto-scale**
```
Pool manager daemon monitors queue_depth and active_tasks
Scale-out: if queue_depth > threshold AND active < max → oa run (new agent)
Scale-in:  if idle > min AND idle_duration > timeout → oa kill
```

**Phase 3: Resource limits**
```
oa pool start --memory 512m --nice 10
  → wraps oa run with ulimit and nice
```

### 6.3 Task Queue Design

Simple file-based queue (consistent with Open-Agents' file-first philosophy):

```
~/.oa/pool/
  config.json          ← pool configuration
  queue/
    001-pending.json   ← queued task (FIFO by filename)
    002-pending.json
  agents/
    pool-001.json      ← agent state (id, status, current_task)
    pool-002.json
  logs/
    pool-manager.log   ← dispatch events, scale events
```

Task JSON format:
```json
{
  "id": "task-uuid",
  "prompt": "Write a scanner for ...",
  "model": "claude/haiku",
  "priority": "normal",
  "created_at": "2026-03-11T10:00:00Z",
  "tags": ["scanner", "python"]
}
```

### 6.4 Integration Points with Existing oa-cli

| Component | Change |
|-----------|--------|
| `oa/cli.py` | Add `pool` subcommand group |
| `oa/pool.py` | New pool manager module |
| `~/.oa/agents.json` | Add `pool_id` field to agent records |
| `~/.oa/pool/` | New directory for pool state |
| `oa/dispatcher.py` (from #55) | Pool manager becomes the dispatcher's backend |
| Agent CLAUDE.md template | Add `pool_slot` and `task_source` fields |

### 6.5 Scaling Limits Recommendation

Based on Open-Agents' WSL2 target environment (typically 8–16GB RAM available to WSL2):

| Model tier | RAM per agent (est.) | Max concurrent (8GB) | Max concurrent (16GB) |
|------------|--------------------:|:--------------------:|:---------------------:|
| claude/haiku | ~300MB | 8 | 16 |
| claude/sonnet | ~500MB | 6 | 12 |
| claude/opus | ~800MB | 4 | 8 |

**Hard ceiling**: `MAX_CONCURRENT_AGENTS = 8` for haiku, `6` for sonnet, `4` for opus.
These are enforced in the pool manager regardless of pool configuration.

---

## 7. Decision Summary

| Topic | Recommendation | Rationale |
|-------|---------------|-----------|
| **Process manager** | Custom `oa/pool.py` | Native integration with agents.json, messaging, tmux; zero deps |
| **Supervisord** | Not recommended for MVP | External dep, static config, no oa integration |
| **PM2** | Not recommended | Node.js dep in Python project, no advantage over custom |
| **systemd** | Future (Linux server only) | WSL2 incompatibility; good for cgroup limits when available |
| **Scaling policy** | Pre-warm + On-demand hybrid | Zero latency for known workloads; graceful handling of bursts |
| **Recycling** | Terminate + re-spawn (MVP) | Context contamination risk too high; revisit with context-reset |
| **Resource limits** | `nice + ulimit` (MVP) | No root required, WSL2 compatible; add cgroups for server deploy |
| **Task queue** | File-based (`~/.oa/pool/queue/`) | Consistent with file-first philosophy; debuggable |
| **Max agents** | 8 haiku / 6 sonnet / 4 opus | Based on estimated WSL2 RAM budget |
| **Context safety** | Pre-spawn + task signal | Clean context per task, near-zero dispatch latency |

### Relation to Existing Decisions

| Decision | Impact |
|----------|--------|
| D-051 (Orchestrator-First) | Pool manager is orchestrator-controlled; workers never self-direct |
| D-058 (Async queue) | Pool task queue IS the async task queue described in D-058 |
| D-060 (PATH + nested spawning) | Pool manager spawns via `oa run` with explicit PATH; flat spawning preserved |
| #50 (Agent Registry) | Pool agents register in `~/.oa/registry/`; pool manager uses registry for discovery |
| #55 (Dispatcher) | Pool manager is the runtime backend that the dispatcher routes to |
| L-004 (Flat spawning) | Pool manager runs in meta-session; pool workers spawn from there, never from each other |

---

*Research complete. Recommended next step: implement `oa pool start/drain/scale` as Phase 1 of `oa/pool.py`.*
*Estimated scope: ~250 lines Python + file-based queue (~50 lines). No external dependencies.*
