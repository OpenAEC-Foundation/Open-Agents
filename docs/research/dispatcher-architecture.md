# Dispatcher Architecture & Emergent Agent Behavior
## Research Report for Open-Agents #55

**Date**: 2026-03-11
**Author**: research-dispatcher (oa agent)
**Status**: Final
**Relates to**: Sprint 4 (Pool Pattern), Sprint 17 (Agent Teams), D-051, D-060

---

## Table of Contents

1. [Dispatcher Concept](#1-dispatcher-concept)
2. [Routing Strategies](#2-routing-strategies)
3. [Guardrail Spec](#3-guardrail-spec)
4. [Framework Comparison](#4-framework-comparison)
5. [Recommended Design for Open-Agents](#5-recommended-design-for-open-agents)
6. [Emergent Behavior Handling](#6-emergent-behavior-handling)
7. [Decision](#7-decision)

---

## 1. Dispatcher Concept

A **dispatcher** is the routing brain of a multi-agent system. Its sole responsibility is to receive tasks and direct them to the most appropriate agent (or set of agents) without performing the work itself.

### Core Responsibilities

| Responsibility | Description |
|---------------|-------------|
| **Task intake** | Receives tasks from the orchestrator or user |
| **Agent registry** | Maintains a live view of available agents and their capabilities |
| **Routing decision** | Selects the right agent(s) for each task |
| **Load awareness** | Tracks agent workload to prevent overload |
| **Result routing** | Forwards agent output to the correct downstream consumer |
| **Failure handling** | Re-routes or escalates when an agent fails or times out |

### Where the Dispatcher Sits

```
User / Orchestrator
        │
        ▼
  ┌─────────────┐
  │  Dispatcher  │  ← routing brain, no task execution
  └─────┬───────┘
        │ routes to
  ┌─────┼──────────────────────┐
  ▼     ▼                      ▼
Agent A  Agent B  ...  Agent N
(writer) (researcher) (validator)
        │
        ▼
  Result aggregator / next step
```

### Dispatcher vs. Orchestrator

A common confusion: dispatcher and orchestrator are **not the same**.

| Concept | Role | Makes decisions about |
|---------|------|-----------------------|
| **Orchestrator** | Plans, sequences, monitors | What to do and when |
| **Dispatcher** | Routes, balances, forwards | Who does it |

In Open-Agents terms: the meta-orchestrator (this session) decides strategy; the dispatcher is the routing layer that fills the pool. The dispatcher is a **stateless** or **lightly stateful** service — it does not own the task lifecycle, only the routing decision.

---

## 2. Routing Strategies

### 2.1 Capability-Based Routing

Match tasks to agents by declared capabilities (skills, domains, tools).

```
Task: "Write a Blender SNLite node"
         │
         ▼
  Dispatcher checks registry:
  ┌─────────────────────────────────┐
  │ Agent A: skills=[python, math]  │
  │ Agent B: skills=[blender, svg]  │← match: blender
  │ Agent C: skills=[docs, markdown]│
  └─────────────────────────────────┘
         │
         ▼
  Route to Agent B
```

**Pros**: High task-agent fit, minimal rework
**Cons**: Requires maintained capability registry; new agents must self-declare

**In Open-Agents**: This is the `skillRef` + `tags` pattern from D-053 and the agent template format (`tags: ["blender", "sverchok"]`). The dispatcher reads tags from `~/.oa/agents.json` or the template JSON.

### 2.2 Load-Based Routing

Route to the agent with the lowest current workload.

```
Task arrives
      │
      ▼
Dispatcher checks load:
  Agent A: 3 tasks queued  ─── busy
  Agent B: 1 task queued   ─── available ← route here
  Agent C: 5 tasks queued  ─── busy
```

**Pros**: Prevents bottlenecks; maximizes throughput
**Cons**: Ignores capability fit; may route to wrong specialist

**In Open-Agents**: Load data comes from `agents.json` state (running/idle). Relevant for Sprint 17 Agent Teams where multiple agents share a task list.

### 2.3 Priority-Based Routing

Tasks carry a priority level; higher-priority tasks preempt or jump the queue.

```
Queue (FIFO):      After priority sort:
┌─────────────┐    ┌─────────────┐
│ Task A P=2  │    │ Task C P=1  │ ← dispatched first
│ Task B P=3  │    │ Task A P=2  │
│ Task C P=1  │    │ Task B P=3  │
└─────────────┘    └─────────────┘
```

**Pros**: Critical tasks never block behind low-value work
**Cons**: Priority starvation risk for low-priority tasks; requires priority metadata on tasks

**In Open-Agents**: Useful for guardian agents (high priority) vs. batch template generation (low priority).

### 2.4 Round-Robin Routing

Distribute tasks evenly across agents, ignoring capability.

```
Task 1 → Agent A
Task 2 → Agent B
Task 3 → Agent C
Task 4 → Agent A  ← cycles back
```

**Pros**: Simplest implementation; perfectly even distribution
**Cons**: Ignores capability and load; poor fit for specialized agents

**Verdict for Open-Agents**: Round-robin is suitable only for homogeneous pools (e.g., 5× identical haiku agents processing the same template). For heterogeneous pools (mixed skills), use capability-based with load as a tiebreaker.

### 2.5 Hybrid Strategy (Recommended)

```
                         ┌─── capability match? ─── yes ──→ capability pool
Task ──→ Dispatcher ────┤
                         └─── no match ──→ load-balanced fallback pool
                                                │
                                         priority applied
                                         before final route
```

Three-tier decision:
1. **Capability filter**: narrow to matching agents
2. **Load tiebreaker**: within matching agents, pick least busy
3. **Priority queue**: urgent tasks skip normal queue

---

## 3. Guardrail Spec

Guardrails prevent agents from drifting outside their declared scope. Without guardrails, emergent behavior accumulates until the system is untrustworthy.

### 3.1 Scope Declaration

Every agent template MUST declare:

```json
{
  "name": "blender-sv-builder",
  "scope": {
    "allowed_file_patterns": ["*.py", "*.json"],
    "allowed_directories": ["/tmp/", "/mnt/c/.../Open-Agents/agents/"],
    "forbidden_patterns": ["*.env", "secrets/*", "~/.ssh/*"],
    "max_files_written": 10,
    "max_tokens_output": 8000
  },
  "tools": ["Write", "Edit", "Read", "Bash"],
  "forbidden_tools": ["WebSearch", "WebFetch"]
}
```

### 3.2 Dispatcher Enforcement Layer

```
Task + context
      │
      ▼
┌─────────────────────────────────────────────┐
│              GUARDRAIL CHECK                │
│  1. Is task within agent's declared scope?  │
│  2. Does task require forbidden tools?      │
│  3. Is output target in allowed dirs?       │
│  4. Does task exceed token/file budget?     │
└─────────────────────────────────────────────┘
      │             │
    PASS           FAIL
      │             │
      ▼             ▼
  Route to      Reject + escalate
  agent         to orchestrator
```

### 3.3 Runtime Guardrails

In addition to pre-dispatch checks, runtime guardrails catch scope violations during execution:

| Guardrail | Mechanism | Action on violation |
|-----------|-----------|-------------------|
| File boundary | Check write path before Write tool | Block + log |
| Token budget | Count tokens before each LLM call | Truncate or halt |
| Tool allowlist | Compare tool call against allowed_tools | Block + notify |
| Time budget | Wall clock per agent | Kill + log |
| Output validation | Schema/format check on result | Flag for review |

### 3.4 Scope Drift Detection

Agents can drift subtly — not a single violation, but gradual expansion of activity. Detect via:

- **Diff analysis**: compare declared vs. actual files touched (logged in `~/.oa/agents.json`)
- **Tool usage audit**: log every tool call; flag if non-declared tools appear
- **Output size monitoring**: if outputs grow 2× across similar tasks, investigate

### 3.5 Proposal Pattern as Guardrail

The proposal pattern (agent writes to `proposals/` instead of directly editing live files) is the **strongest guardrail** for high-stakes tasks. The orchestrator reviews and approves before changes land. This is D-051's "worker proposes, orchestrator approves" pattern applied at the dispatcher level.

---

## 4. Framework Comparison

### 4.1 LangGraph Dispatcher

LangGraph models dispatch as a **graph with conditional edges**. The "router node" is a LLM or function that decides which node executes next.

```
       START
         │
         ▼
    [Router Node]  ← LLM decides which branch
    /     |     \
   ▼      ▼      ▼
Node A  Node B  Node C
   \      |      /
    └─────┼──────┘
          ▼
         END
```

**Pros**:
- Declarative graph structure; easy to visualize
- Native support for cycles (agent loops)
- State passed as typed dict across nodes
- Human-in-the-loop checkpoints built-in

**Cons**:
- Requires Python + LangChain ecosystem
- Routing logic lives in LLM call (expensive + non-deterministic for simple routing)
- Complex multi-agent coordination needs explicit state management
- Not designed for tmux/subprocess agents (local execution model)

**Fit for Open-Agents**: Low. Open-Agents uses tmux subprocess agents, not Python in-process nodes. LangGraph's graph model could inspire the visual canvas routing but cannot be directly applied.

### 4.2 AutoGen Dispatcher

AutoGen uses **GroupChat** with a `GroupChatManager` as the dispatcher. The manager is an LLM that selects the next speaker from a group.

```
User ─→ GroupChatManager (LLM)
              │
         selects next
              │
    ┌─────────┼──────────┐
    ▼         ▼          ▼
AssistantA AssistantB AssistantC
    └─────────┼──────────┘
              │ reply
              ▼
        GroupChatManager
              │
         selects next
              ...
```

**Pros**:
- Simple to set up for small groups
- LLM-driven selection handles ambiguous tasks
- Built-in conversation history shared by all agents

**Cons**:
- GroupChatManager is an LLM call = expensive per routing decision
- All agents see full conversation = context bloat at scale
- No capability registry; LLM must infer from descriptions
- No load awareness; no priority queue
- GroupChat breaks down at 6+ agents (LLM loses track)

**Fit for Open-Agents**: Medium for small ad-hoc groups (like oa pipeline); too expensive and fragile for large pools (100+ agents in the library).

### 4.3 Custom Dispatcher (Current Open-Agents approach)

Open-Agents uses `oa run` with explicit agent selection — the human or meta-orchestrator IS the dispatcher. This is effective but manual.

The implicit dispatcher logic currently lives in:
- `oa-cli/oa/cli.py`: spawn logic
- `~/.oa/agents.json`: agent state
- The human's judgment: "I'll spawn 4 parallel haiku agents"

**Pros**:
- Full control, no LLM call overhead for routing
- Integrates with tmux subprocess model
- No external dependencies

**Cons**:
- Manual = bottleneck; orchestrator must know all agent capabilities
- No dynamic capability registry
- No automatic load balancing

### 4.4 Comparison Table

| Feature | LangGraph | AutoGen | Custom (current) | Custom (proposed) |
|---------|-----------|---------|-----------------|-------------------|
| Routing model | Graph edges | LLM selection | Manual | Capability + load |
| Routing cost | LLM call | LLM call | None | Index lookup |
| Capability registry | No | No | No | Yes (tags + skills) |
| Load awareness | No | No | No | Yes (agents.json) |
| Priority queue | No | No | No | Yes |
| Scale | Medium | Small | Large (manual) | Large (auto) |
| tmux/subprocess | No | No | Yes | Yes |
| Dependencies | LangChain | AutoGen | None | None |
| Deterministic | No | No | Yes | Yes |

---

## 5. Recommended Design for Open-Agents

### 5.1 Dispatcher as oa-cli Module

The dispatcher should be a new module in oa-cli: `oa/dispatcher.py`, invoked as:

```bash
oa dispatch "<task>" --tags blender,python --priority high
```

This wraps the existing `oa run` with automatic agent selection.

### 5.2 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        oa dispatch                           │
│                                                              │
│  Task + metadata                                             │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                  Guardrail Pre-check                 │    │
│  │  • scope validation    • tool allowlist check        │    │
│  └───────────────────────────┬──────────────────────────┘    │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                   Routing Engine                     │    │
│  │                                                      │    │
│  │  1. Load agent registry (agents.json + library/)     │    │
│  │  2. Filter by capability (tags match)                │    │
│  │  3. Filter by availability (state != running)        │    │
│  │  4. Sort by load (fewest active tasks first)         │    │
│  │  5. Apply priority (bump in queue if priority=high)  │    │
│  │  6. Select top candidate                             │    │
│  └───────────────────────────┬──────────────────────────┘    │
│                              │                               │
│                              ▼                               │
│              oa run "<task>" --template <match>              │
│                  --name <auto-generated>                     │
│                  --model <modelHint>                         │
│                  --direct                                    │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Agent Registry Format

Extend `~/.oa/agents.json` with a capability index:

```json
{
  "agents": {
    "blender-sv-builder-001": {
      "state": "idle",
      "template": "aec-blender/sv-builder",
      "tags": ["blender", "sverchok", "python"],
      "modelHint": "claude/sonnet",
      "active_tasks": 0,
      "last_active": "2026-03-11T14:22:00Z"
    }
  },
  "capability_index": {
    "blender": ["blender-sv-builder-001", "blender-renderer-002"],
    "python": ["blender-sv-builder-001", "code-writer-003"]
  }
}
```

### 5.4 Dispatcher Decision Algorithm

```python
def select_agent(task_tags: list[str], priority: str) -> str:
    # 1. Capability filter
    candidates = capability_index.get_agents_for_tags(task_tags)
    if not candidates:
        candidates = get_all_idle_agents()  # fallback pool

    # 2. Load filter: exclude agents with active_tasks >= MAX_LOAD
    available = [a for a in candidates if agents[a].active_tasks < MAX_LOAD]

    # 3. Sort by load (ascending)
    available.sort(key=lambda a: agents[a].active_tasks)

    # 4. Priority: if high, skip queue (spawn immediately)
    if priority == "high" and available:
        return available[0]

    # 5. Return best candidate
    return available[0] if available else None
```

### 5.5 Integration Points

| Component | Change |
|-----------|--------|
| `oa/cli.py` | Add `dispatch` subcommand |
| `oa/dispatcher.py` | New routing engine module |
| `~/.oa/agents.json` | Add `capability_index` + `active_tasks` fields |
| `agents/library/*/template.json` | Tags already exist; no schema change needed |
| `oa/messaging.py` | Dispatcher sends routing decisions via messaging (D-062) |

---

## 6. Emergent Behavior Handling

### 6.1 What is Emergent Agent Behavior?

Emergent behavior in multi-agent systems is **unintended, systemic behavior** that arises from agent interactions — not from any single agent's instructions. Examples in Open-Agents:

| Behavior | Source | Risk |
|----------|--------|------|
| **Hallucination cascade** | Agent A fabricates a fact → Agent B uses it as input | Corrupted downstream output |
| **Scope creep accumulation** | Each agent slightly exceeds scope → compound drift | Files modified outside project |
| **Feedback loop** | Agent A's output triggers Agent B which re-triggers Agent A | Infinite loop, resource exhaustion |
| **Homogenization** | All agents converge on same style/approach → reduced diversity | Blind spots in output |
| **Conflict** | Two agents write to the same file simultaneously | Data loss, merge conflicts |

### 6.2 Detection Strategies

```
Agent output
      │
      ▼
┌─────────────────────────────────────────────────┐
│              Output Monitor (guardian)           │
│                                                  │
│  • File diff check: files written vs. declared  │
│  • Factual anchor check: outputs cite sources   │
│  • Cross-agent consistency check               │
│  • Cycle detection: task appears 2+ times       │
│  • Size anomaly: output > 2× expected size      │
└──────────────────────┬──────────────────────────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
         Log        Alert        Halt
      (low risk)  (medium)    (high risk)
```

### 6.3 Prevention at Dispatch Time

The dispatcher is the **best place to prevent** emergent behavior because it controls what gets spawned:

1. **Deduplication check**: before spawning, check if a similar task is already running
   ```python
   if task_hash in active_task_hashes:
       return existing_agent_id  # don't spawn duplicate
   ```

2. **Dependency graph**: dispatcher maintains a DAG of task dependencies; refuses to create cycles
   ```
   Task A → Task B → Task A  ← BLOCKED: cycle detected
   ```

3. **Resource ceiling**: dispatcher enforces global limits
   ```
   MAX_CONCURRENT_AGENTS = 8
   MAX_AGENTS_PER_FILE = 1  # no two agents touch same file
   ```

4. **File lock registry**: before routing, check and claim file ownership
   ```python
   if target_file in file_locks and file_locks[target_file] != agent_id:
       queue_task_until_lock_released(task, target_file)
   ```

### 6.4 Steering Emergent Behavior

Not all emergence is bad. Some can be **steered toward beneficial outcomes**:

| Emergent Pattern | Steering Mechanism |
|-----------------|-------------------|
| Unexpected solution from agent combination | Capture in `LESSONS.md` via guardian agent |
| Cross-domain knowledge transfer | Extract into new skill; add to capability registry |
| Agent self-corrects without instruction | Log correction pattern; bake into template systemPrompt |
| High-quality output exceeding spec | Use as reference template for future similar tasks |

### 6.5 Guardian Agent as Emergence Monitor

Aligned with D-057 (guardian agents as reflexes), implement a **dispatcher-level guardian**:

```bash
# Runs after every dispatch batch completes
oa run "Review agent outputs in ~/.oa/logs/batch-<id>/:
  1. Check for scope violations (files written outside allowed dirs)
  2. Check for inconsistencies between agent outputs
  3. Check for duplicate work (same content, different agents)
  4. Write report to /tmp/emergence-report-<id>.md
  5. Flag anomalies with severity: LOW/MEDIUM/HIGH" \
  --name emergence-monitor \
  --model claude/sonnet \
  --direct
```

### 6.6 Feedback Loop Prevention

```
Dispatcher tracks task lineage:
Task A → spawns → Task B → result triggers → Task A?

If depth > MAX_DEPTH (default: 6, matching CLAUDE.md agent tree limit):
  HALT + escalate to orchestrator

Cycle signature = hash(task_description + output_target)
If signature seen before in current session:
  WARN + require human approval before proceeding
```

---

## 7. Decision

### Summary of Findings

| Topic | Recommendation |
|-------|---------------|
| Routing strategy | Hybrid: capability-first, load as tiebreaker, priority queue |
| Framework | Custom oa-cli module — no external dependencies, fits tmux model |
| LangGraph | Inspiration for visual canvas only; not for execution |
| AutoGen | Not suitable for large pools or subprocess agents |
| Guardrails | Pre-dispatch scope check + runtime file locks + proposal pattern for high-stakes |
| Emergent behavior | Prevent at dispatch time (deduplication, cycle detection, file locks); monitor via guardian |

### Decision: Implement `oa dispatch` as oa-cli Module

**Chosen approach**: Custom `oa/dispatcher.py` module extending `oa run` with:

1. **Capability-based routing** using tags from template JSON (`agents/library/*/template.json`)
2. **Load balancing** via `active_tasks` field in `~/.oa/agents.json`
3. **Priority queue** with `--priority [low|normal|high|critical]`
4. **Guardrail pre-check** before routing (scope + tool allowlist)
5. **File lock registry** to prevent concurrent writes
6. **Cycle detection** via task lineage tracking

**Not chosen**:
- LangGraph: Python in-process model incompatible with tmux subprocess agents
- AutoGen GroupChat: too expensive (LLM call per routing decision), breaks at scale
- Manual dispatch (current): bottleneck, no capability awareness

**Implementation order**:
1. Extend `agents.json` schema with `capability_index` + `active_tasks`
2. Implement `dispatcher.py` with routing algorithm
3. Add `oa dispatch` CLI subcommand
4. Add file lock registry (`~/.oa/file_locks.json`)
5. Add guardian agent template for emergence monitoring

**Relates to**:
- D-051 (Orchestrator-First): dispatcher enforces orchestrator-worker separation
- D-058 (async queue): dispatcher queue is the async task queue described in D-058
- D-060 (nested spawning): dispatcher uses same `oa run` + PATH mechanism
- D-062 (filesystem messaging): dispatcher sends routing decisions via messaging

---

*Research complete. Dispatcher architecture designed for Open-Agents oa-cli ecosystem.*
*Next step: implement `oa/dispatcher.py` — estimated scope: ~200 lines Python.*
