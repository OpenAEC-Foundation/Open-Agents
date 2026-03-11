# Observability & Logging for Multi-Agent Systems

**Issue:** #56
**Date:** 2026-03-11

---

## 1. Overview

Open-Agents has the building blocks: `telemetry.py` tracks run lifecycle (start/finish, duration,
exit status), `context_tracker.py` records token usage snapshots, and `dashboard.py` provides a
real-time Textual TUI. What is missing is a **unified, structured log stream** across agent runs,
a coherent metrics layer, and a **replay mechanism** for debugging.

This document specifies:
- A structured log entry format (JSON Lines)
- Metrics that matter for multi-agent orchestration
- An extended TUI dashboard with observability panels
- A replay strategy for reproducing agent runs
- Integration points with existing `telemetry.py` and `context_tracker.py`

---

## 2. Structured Log Format (JSON Lines)

### 2.1 Design Goals

1. **Machine-readable** — every event is a single JSON line.
2. **Correlatable** — `run_id` and `parent_run_id` enable cross-agent tracing.
3. **Append-only** — never mutate log files; only append new lines.
4. **Low overhead** — buffered append, no blocking I/O.

### 2.2 Log File Layout

```
~/.oa/runs/{run_id}/
  run-log.json        # existing: lifecycle summary (start, finish, exit_status)
  events.jsonl        # NEW: structured event stream (one JSON object per line)
  context.jsonl       # existing: token usage snapshots (from context_tracker.py)
  replay-manifest.json  # NEW: run inputs snapshot for replay
```

### 2.3 Event Schema

Every log entry includes these mandatory fields:

| Field    | Type   | Description                                            |
|----------|--------|--------------------------------------------------------|
| `ts`     | float  | Unix timestamp with millisecond precision              |
| `run_id` | string | UUID4 matching telemetry.start_run                     |
| `agent`  | string | Agent name (matches AgentRecord.name)                  |
| `event`  | string | Event type (see §2.4)                                  |
| `level`  | string | `debug` / `info` / `warn` / `error`                   |
| `msg`    | string | Human-readable message                                 |

Optional fields: `parent_run_id`, `span_id`, `tool`, `duration_ms`, `tokens`, `exit_code`,
`error`, `data` (arbitrary structured payload).

### 2.4 Event Types

| Event                | Description                                         |
|---------------------|-----------------------------------------------------|
| `run.start`         | Agent started; contains task, model, workspace      |
| `run.finish`        | Agent finished; contains exit_status, duration_sec  |
| `run.timeout`       | Agent killed by timeout                             |
| `run.error`         | Fatal error; contains error message + context pct   |
| `tool.start`        | LLM invoked a tool                                  |
| `tool.finish`       | Tool completed; contains duration_ms, success       |
| `tool.error`        | Tool failed; contains error                         |
| `spawn.start`       | Agent spawned a child                               |
| `spawn.finish`      | Child agent finished (reported to parent)           |
| `message.sent`      | Inter-agent message sent via oa send                |
| `message.received`  | Inter-agent message received                        |
| `context.snapshot`  | Periodic token usage snapshot                       |
| `context.compact`   | /compact triggered                                  |
| `checkpoint.save`   | Agent saved a checkpoint                            |
| `output.write`      | Agent wrote to its output directory                 |

### 2.5 Concrete JSON Examples

**run.start**
```json
{
  "ts": 1741695600.123,
  "run_id": "3f8a1c2e-7b4d-4e9a-a1b2-c3d4e5f60001",
  "agent": "research-observability",
  "event": "run.start",
  "level": "info",
  "msg": "Agent started",
  "data": {
    "task": "Write research report on observability for multi-agent systems",
    "model": "claude/sonnet",
    "workspace": "/tmp/oa-agent-qumwnj0a",
    "project_root": "/mnt/c/Users/Freek/Documents/GitHub/Open-Agents",
    "parent": null,
    "depth": 0
  }
}
```

**tool.finish**
```json
{
  "ts": 1741695612.456,
  "run_id": "3f8a1c2e-7b4d-4e9a-a1b2-c3d4e5f60001",
  "agent": "research-observability",
  "event": "tool.finish",
  "level": "info",
  "msg": "Write completed",
  "tool": "Write",
  "duration_ms": 87.3,
  "data": {
    "path": "/mnt/c/.../docs/research/observability.md",
    "bytes_written": 14200,
    "success": true
  }
}
```

**context.snapshot**
```json
{
  "ts": 1741695630.000,
  "run_id": "3f8a1c2e-7b4d-4e9a-a1b2-c3d4e5f60001",
  "agent": "research-observability",
  "event": "context.snapshot",
  "level": "info",
  "msg": "Context at 34.2%",
  "tokens": 68400,
  "data": {
    "pct": 34.2,
    "health": "green",
    "trend": "↑",
    "window_limit": 200000
  }
}
```

**run.error**
```json
{
  "ts": 1741695700.000,
  "run_id": "3f8a1c2e-7b4d-4e9a-a1b2-c3d4e5f60001",
  "agent": "research-observability",
  "event": "run.error",
  "level": "error",
  "msg": "Agent exited with error",
  "exit_code": 1,
  "error": "FileNotFoundError: /tmp/oa-agent-xyz/output not found",
  "data": { "last_tool": "Write", "context_pct": 41.5 }
}
```

---

## 3. Metrics

### 3.1 Core Metrics (computable from existing files + events.jsonl)

**Agent Run Metrics**

| Metric            | Unit  | Source           | Description                          |
|------------------|-------|------------------|--------------------------------------|
| `run_count`      | count | runs-index.json  | Total runs in time window            |
| `success_rate`   | %     | exit_status      | Fraction with exit_status=success    |
| `error_rate`     | %     | exit_status      | Fraction with exit_status=error      |
| `p50_duration`   | sec   | duration_seconds | Median run duration                  |
| `p95_duration`   | sec   | duration_seconds | 95th percentile run duration         |
| `timeout_rate`   | %     | exit_status      | Fraction killed by timeout           |

**Token / Context Metrics (per run)**

| Metric              | Unit   | Source        | Description                         |
|--------------------|--------|---------------|-------------------------------------|
| `peak_tokens`      | tokens | context.jsonl | Maximum token count for the run     |
| `avg_tokens`       | tokens | context.jsonl | Average over all snapshots          |
| `compaction_count` | count  | context.jsonl | Times /compact was triggered        |

**Fleet-Level Metrics**

| Metric              | Unit  | Source          | Description                         |
|--------------------|-------|-----------------|-------------------------------------|
| `active_agents`    | count | agents.json     | Currently running agents            |
| `spawn_rate`       | /min  | events.jsonl    | Child agents spawned per minute     |
| `completion_rate`  | /min  | runs-index.json | Completions per minute              |
| `tree_depth_max`   | int   | agents.json     | Deepest active agent tree           |

### 3.2 Alerting Thresholds (default config in ~/.oa/config.json)

```json
{
  "observability": {
    "alert_error_rate_pct": 20,
    "alert_p95_duration_sec": 1800,
    "alert_context_pct": 90,
    "alert_timeout_rate_pct": 10
  }
}
```

---

## 4. TUI Dashboard — Extended Observability Panels

The existing `dashboard.py` provides an agent tree and live output panel. The following adds
two new tabs and enriches the existing Agent Tree.

### 4.1 Tab Layout

```
[ Agents [1] ]  [ Teams [2] ]  [ Metrics [3] ]  [ Logs [4] ]
```

**Tab 3 — Metrics Panel** (refreshed every 10s)
```
┌──── FLEET METRICS ──────────────┬──── TRENDS (last 30 runs) ──────────────┐
│  Active agents     3            │  Success rate  ████████████████░░░░  92% │
│  Success rate      92%          │  Avg duration  ████████░░░░░░░░░░░░  310s│
│  Error rate         8%          │  Peak tokens   ████████████░░░░░░░░  62% │
│  Avg duration    310s           │  Tool errors   ██░░░░░░░░░░░░░░░░░░   3% │
│  P95 duration    720s           │                                           │
│  Spawn rate      1.2/min        │  [r] Refresh   [e] Export CSV            │
└─────────────────────────────────┴───────────────────────────────────────────┘
```

**Tab 4 — Logs Panel** (tail from events.jsonl, refreshed every 1s)
```
┌──── FILTER ─────────────────────────────────────────────────────────────────┐
│  Agent: [all ▼]  Level: [info ▼]  Event: [all ▼]  [Clear]                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  14:32:01.123  [INFO ]  research-alpha   run.start    Agent started          │
│  14:32:01.456  [INFO ]  research-alpha   tool.start   Read /docs/arch.md     │
│  14:32:01.543  [INFO ]  research-alpha   tool.finish  Read 87ms              │
│  14:32:05.001  [WARN ]  research-beta    context      Context at 76% ↑       │
│  14:32:08.333  [ERROR]  worker-3         run.error    FileNotFoundError       │
└─────────────────────────────────────────────────────────────────────────────┘
  [↑ ↓] scroll   [/] search   [f] follow   [x] export
```

### 4.2 Agent Tree Enrichment (Tab 1)

Add context bar per row:
```
 ● research-alpha    sonnet  ↑62% [████████░░]  running   5m12s
 └─ ● worker-1       haiku   ↑34% [████░░░░░░]  running   2m04s
```

### 4.3 Refresh Strategy

| Panel            | Interval | Source                  |
|-----------------|----------|-------------------------|
| Agent tree       | 2s       | agents.json (current)   |
| Metrics panel    | 10s      | runs-index.json + jsonl |
| Logs panel       | 1s       | events.jsonl tail       |
| Context bars     | 5s       | context.jsonl           |

All updates must be non-blocking. Use `asyncio.to_thread` for file reads in the Textual loop.

---

## 5. Replay Strategy

Replay reconstructs an agent run for debugging. It re-executes the **same task + config**;
it does not replay LLM responses (non-deterministic).

### 5.1 Replay Manifest

Saved at `~/.oa/runs/{run_id}/replay-manifest.json` at run start:

```json
{
  "run_id": "3f8a1c2e-7b4d-4e9a-a1b2-c3d4e5f60001",
  "created_at": "2026-03-11T14:32:00Z",
  "agent": "research-observability",
  "task": "Write research report on observability (#56)",
  "model": "claude/sonnet",
  "workspace": "/tmp/oa-agent-qumwnj0a",
  "project_root": "/mnt/c/Users/Freek/Documents/GitHub/Open-Agents",
  "env": {
    "OA_SESSION": "oa",
    "OA_COMPACT_THRESHOLD": "75"
  },
  "parent_run_id": null,
  "depth": 0,
  "input_snapshots": [
    {
      "path": "/mnt/c/.../oa-cli/src/open_agents/telemetry.py",
      "sha256": "a3f9c1...",
      "size": 5120
    }
  ],
  "claude_md_hash": "b7e2..."
}
```

`input_snapshots` is populated from `tool.finish` events with `tool=Read`.

### 5.2 Replay Commands

```bash
oa replay <run_id>                      # Replay with original config
oa replay <run_id> --model claude/opus  # Override model
oa replay <run_id> --dry-run            # Print what would be run, no execution
oa replay-diff <orig_run_id> <new_run_id>  # Diff output/result.md between runs
```

The replay command:
1. Reads `replay-manifest.json`
2. Warns if input file hashes have changed
3. Spawns a new agent with original task + model + project_root
4. Records `replay_of: <original_run_id>` in the new run's manifest

### 5.3 Checkpoint-Based Partial Replay

For long runs using `checkpoint.py`, replay can start from a saved checkpoint:

```bash
oa replay <run_id> --from-checkpoint <checkpoint_id>
```

This restores the workspace state from the checkpoint and resumes from that point, skipping
already-completed work. The existing `checkpoint.py` captures todo state; replay only needs
to restore the workspace directory and inject the checkpoint task list into the new prompt.

---

## 6. Integration with Existing telemetry.py

### 6.1 Proposed Additions

Three new functions to add to `telemetry.py`:

```python
def log_event(run_id: str, agent: str, event: str, msg: str,
              level: str = "info", **kwargs) -> None:
    """Append a structured event to ~/.oa/runs/{run_id}/events.jsonl."""
    entry = {"ts": time.time(), "run_id": run_id, "agent": agent,
             "event": event, "level": level, "msg": msg}
    entry.update(kwargs)
    run_dir = RUNS_DIR / run_id
    if not run_dir.exists():
        return
    with open(run_dir / "events.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")

def write_replay_manifest(run_id: str, manifest: dict) -> None:
    """Write replay-manifest.json for this run at start_run time."""
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "replay-manifest.json").write_text(json.dumps(manifest, indent=2))

def tail_events(run_id: str, limit: int = 100) -> list[dict]:
    """Return the last `limit` events from events.jsonl for a run."""
    path = RUNS_DIR / run_id / "events.jsonl"
    if not path.exists():
        return []
    lines = path.read_text().splitlines()
    results = []
    for line in lines[-limit:]:
        try:
            results.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return results
```

### 6.2 Integration Points

| Location                          | Action                                              |
|----------------------------------|-----------------------------------------------------|
| `spawner.py` — after spawn        | `log_event(run_id, agent, "spawn.start", ...)`      |
| `lifecycle.py` — `check_agent()`  | `log_event(run_id, agent, "run.finish", ...)`       |
| `lifecycle.py` — timeout handler  | `log_event(run_id, agent, "run.timeout", ...)`      |
| `context_tracker.py` — snapshot   | `log_event(run_id, agent, "context.snapshot", ...)` |
| `context_tracker.py` — compact    | `log_event(run_id, agent, "context.compact", ...)`  |
| `messaging.py` — `send_message`   | `log_event(run_id, agent, "message.sent", ...)`     |
| Claude Code PostToolUse hook      | `log_event(run_id, agent, "tool.finish", ...)`      |

For tool-level logging, `OA_RUN_ID` must be passed in the agent environment (extend
`spawner.py` alongside the existing `OA_RUN_LOG_PATH`).

### 6.3 Backward Compatibility

All additions are additive — new files inside existing run directories. The `run-log.json`
schema is unchanged. Older runs without `events.jsonl` degrade silently in the TUI (empty
Logs panel). No migration needed.

---

## 7. Implementation Priority

| Phase | Item                                  | Effort | Value  |
|-------|---------------------------------------|--------|--------|
| 1     | `log_event()` in telemetry.py         | low    | high   |
| 1     | Integrate into lifecycle + spawner    | low    | high   |
| 2     | Replay manifest at run start          | low    | medium |
| 2     | Metrics computation from jsonl        | medium | high   |
| 3     | TUI Metrics tab (Tab 3)               | medium | medium |
| 3     | TUI Logs tab (Tab 4) with filtering   | medium | high   |
| 4     | `oa replay` command                   | high   | medium |
| 4     | `oa replay-diff` output comparison    | medium | low    |

Phase 1 delivers most observability value with minimal code changes. Phase 3 makes data
visible in the TUI. Phase 4 enables structured debugging workflows.

---

## 8. Open Questions

1. **Tool-level logging hook**: Claude Code's `PostToolUse` hook fires after every tool call —
   the cleanest injection point for `tool.finish` events. Requires `OA_RUN_ID` in the hook env.

2. **Input snapshot limits**: Recording file hashes at `tool.finish(Read)` is low-cost, but
   files > 1MB should be skipped in `input_snapshots` to keep manifests compact.

3. **Metrics aggregation**: On-the-fly computation from JSONL is simpler but slow for large
   run histories. Recommendation: maintain a pre-aggregated `metrics-summary.json` updated
   by `finish_run()`.

4. **Context log consolidation**: `context_tracker.py` already writes
   `~/.oa/context-log/{agent}.jsonl`. Recommendation: emit `context.snapshot` events in
   `events.jsonl` for correlation, while keeping the separate context-log for dedicated tools.
