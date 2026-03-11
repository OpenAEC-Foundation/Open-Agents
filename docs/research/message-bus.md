# Message Bus Evaluation for Multi-Agent Communication

> **Issue**: #49 | **Date**: 2026-03-11 | **Author**: Research Agent

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Evaluation Criteria](#2-evaluation-criteria)
3. [Tool Comparison Table](#3-tool-comparison-table)
4. [Benchmark Results (Estimated)](#4-benchmark-results-estimated)
5. [MVP Recommendation](#5-mvp-recommendation)
6. [Production Recommendation](#6-production-recommendation)
7. [Docker Compose Snippet](#7-docker-compose-snippet)
8. [Migration Path](#8-migration-path)

---

## 1. Current State

Open-Agents implements inter-agent communication via **file-based message passing**:

- Messages stored as JSON files in `~/.oa/messages/<agent>/inbox/`
- Broadcast messages routed to `~/.oa/messages/_broadcast/`
- File locking via `fcntl` (`lock_ex`, `lock_sh`, `lock_un`) for safe concurrent access
- Each message is a timestamped JSON file: `<timestamp_ms>-<sender>.json`
- CLI commands: `oa send <to> "<msg>" --from <name>`, `oa inbox <name>`, `oa broadcast`

### Strengths of the current system

- **Zero dependencies** — no external services required
- **Fully persistent** — files survive process crashes
- **Debuggable** — messages readable with any text editor
- **WSL2 compatible** — works without Docker or network configuration
- **Simple** — straightforward implementation, easy to reason about

### Weaknesses of the current system

- **No real-time delivery** — agents must poll `~/.oa/messages/` to receive messages
- **Polling overhead** — agents check for messages on a timer (implicit in the CLI flow)
- **No pub/sub** — no topic-based routing; broadcast touches every agent's inbox individually
- **No TTL/expiry** — old messages accumulate unless cleaned up manually
- **No backpressure** — senders cannot detect whether recipients are overwhelmed
- **Latency** — filesystem sync in WSL2 is slow (cross-layer: Linux ↔ Windows NTFS)
- **No ordering guarantees** — concurrent writes can produce non-deterministic ordering
- **Scalability ceiling** — degrades with many agents due to file handle contention

### Current messaging flow

```
oa send researcher-1 "hello" --from orchestrator
    → writes ~/.oa/messages/researcher-1/inbox/<ts>-orchestrator.json

oa inbox researcher-1
    → reads all JSON files in ~/.oa/messages/researcher-1/inbox/
    → marks unread files as read (lock_ex, update field, write back)
```

---

## 2. Evaluation Criteria

| Criterion | Description | Weight |
|-----------|-------------|--------|
| **Latency** | Time from send to receive (ms) | High |
| **Throughput** | Messages/sec the system handles sustainably | Medium |
| **Persistence** | Survives process or machine restart | High |
| **Complexity** | Operational burden: install, config, maintain | High |
| **WSL2 Compatibility** | Works without issues in WSL2 (Ubuntu on Windows) | High |
| **Pub/Sub Support** | Topic-based routing, not just point-to-point | Medium |
| **Python SDK** | Quality and maturity of Python client library | High |
| **Observability** | Built-in monitoring, message inspection tools | Low |
| **Backpressure** | Ability to signal queue saturation to senders | Low |

**Scoring**: 1 (poor) → 5 (excellent)

---

## 3. Tool Comparison Table

| Tool | Latency | Throughput | Persistence | Complexity | WSL2 Compat | Pub/Sub | Python SDK | Observability | **Total** |
|------|---------|------------|-------------|------------|-------------|---------|------------|---------------|-----------|
| **Current (file-based)** | 2 | 2 | 5 | 5 | 5 | 2 | 5 | 3 | **29** |
| **Redis Pub/Sub** | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 4 | **34** |
| **Redis Streams** | 5 | 5 | 5 | 3 | 4 | 4 | 5 | 4 | **35** |
| **NATS** | 5 | 5 | 4 | 4 | 3 | 5 | 4 | 3 | **33** |
| **ZeroMQ** | 5 | 5 | 1 | 2 | 4 | 4 | 4 | 1 | **26** |
| **Unix pipes** | 4 | 4 | 1 | 4 | 4 | 1 | 4 | 1 | **23** |
| **SQLite polling** | 2 | 3 | 5 | 5 | 5 | 2 | 5 | 3 | **30** |
| **In-memory queue** | 5 | 5 | 1 | 5 | 5 | 3 | 5 | 2 | **31** |

### Tool Summaries

#### Redis Pub/Sub
Real-time pub/sub with channel-based routing. Messages are **not persisted** — if a subscriber is offline, it misses the message. Requires Redis server (`redis-server` or Docker). Mature `redis-py` client with async support.

#### Redis Streams (recommended)
Redis Streams (`XADD`, `XREAD`, `XREADGROUP`) combine **real-time delivery with persistence**. Consumer groups allow multiple agents to process from the same stream without duplication. Messages stored with configurable retention. This is the production-grade evolution of Pub/Sub.

#### NATS
Cloud-native messaging with extremely low latency (~microseconds). Supports JetStream for persistence. Standalone binary, no dependencies. WSL2 requires running the binary or Docker. Less established Python ecosystem compared to Redis.

#### ZeroMQ
Library-level messaging (no separate server). Patterns: PUB/SUB, PUSH/PULL, REQ/REP. No persistence by design. Excellent for process-to-process within the same machine. Complex to configure for dynamic topologies.

#### Unix pipes / FIFOs
Named pipes (`mkfifo`) offer sub-millisecond IPC. No persistence. Single-reader per pipe. Poor fit for multi-agent fan-out patterns. Very low overhead.

#### SQLite polling
Each agent polls a shared SQLite database. Persistence is excellent. Latency bounded by poll interval (typically 100ms–1s). `aiosqlite` for async. No external service needed. Good fit for low-frequency coordination messages.

#### In-memory queue (Python `asyncio.Queue` / `multiprocessing.Queue`)
Zero infrastructure. Works only within the same process or with shared memory. No persistence across restarts. Suitable only if all agents run in the same Python process (not the current oa-cli tmux-based architecture).

---

## 4. Benchmark Results (Estimated)

These are **estimated benchmarks** based on published benchmarks, documentation, and WSL2-specific characteristics. Not measured directly on the Open-Agents stack.

### Latency (message round-trip, local machine)

| Tool | P50 latency | P99 latency | Notes |
|------|-------------|-------------|-------|
| File-based (current) | 50–200ms | 500ms+ | Dominated by WSL2 cross-layer filesystem sync |
| SQLite polling | 100–500ms | 1s+ | Bounded by poll interval |
| In-memory queue | <0.1ms | <1ms | Same-process only |
| Unix pipes | 0.5–2ms | 5ms | Within WSL2 Linux layer |
| ZeroMQ | 0.1–1ms | 5ms | Inproc or IPC transport |
| Redis Pub/Sub | 1–5ms | 10ms | localhost TCP in WSL2 |
| Redis Streams | 1–5ms | 10ms | localhost TCP in WSL2 |
| NATS | 0.5–3ms | 8ms | localhost TCP in WSL2 |

### Throughput (messages/sec, sustained)

| Tool | Throughput | Notes |
|------|------------|-------|
| File-based (current) | ~50–200 msg/s | File I/O bottleneck |
| SQLite polling | ~500–2,000 msg/s | WAL mode; write lock contention |
| Unix pipes | ~50,000 msg/s | Kernel buffer limited |
| ZeroMQ | ~100,000+ msg/s | HWM-limited |
| Redis Pub/Sub | ~50,000–100,000 msg/s | Single-threaded Redis |
| Redis Streams | ~50,000+ msg/s | Consumer group overhead manageable |
| NATS | ~100,000–1,000,000 msg/s | Designed for throughput |

### WSL2-specific considerations

- **Cross-layer filesystem access** (`/mnt/c/` paths): 10–100× slower than native Linux paths
- **Current messages are stored in `~/.oa/` which is in the Linux layer** — this is acceptable
- **Redis, NATS running in WSL2 Docker**: adds ~2ms overhead vs native Linux
- **Named pipes in WSL2**: work correctly within the Linux layer; do not cross to Windows

---

## 5. MVP Recommendation

### Recommendation: SQLite-based message queue

**Replace the file-per-message approach with a single SQLite database**, while maintaining the same `oa send` / `oa inbox` CLI interface.

#### Rationale

| Factor | Assessment |
|--------|------------|
| Zero new dependencies | SQLite is bundled with Python (`import sqlite3`) |
| WSL2 compatible | Works entirely in the Linux layer, no Docker required |
| Persistent | Messages survive restarts, no data loss |
| Real-time capable | Triggers or short poll interval (100ms) for near-realtime |
| Drop-in migration | Same CLI interface, just swap the storage backend |
| Debuggable | `sqlite3 ~/.oa/messages.db` to inspect messages |
| Ordering guarantees | ROWID provides strict insertion order |
| Cleanup | Simple `DELETE WHERE timestamp < X` |

#### Implementation sketch

```python
# ~/.oa/messages.db schema
CREATE TABLE messages (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    sender    TEXT NOT NULL,
    recipient TEXT NOT NULL,  -- '_broadcast' for broadcasts
    content   TEXT NOT NULL,
    timestamp REAL NOT NULL DEFAULT (unixepoch('now', 'subsec')),
    read      INTEGER NOT NULL DEFAULT 0,
    metadata  TEXT  -- JSON blob
);

CREATE INDEX idx_recipient ON messages(recipient, read, timestamp);
```

```python
def send_message(sender, recipient, content, metadata=None):
    with sqlite3.connect(DB_PATH, timeout=5) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            "INSERT INTO messages (sender, recipient, content, metadata) VALUES (?,?,?,?)",
            (sender, recipient, content, json.dumps(metadata) if metadata else None)
        )

def read_inbox(agent_name, unread_only=False):
    with sqlite3.connect(DB_PATH, timeout=5) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        query = "SELECT * FROM messages WHERE recipient IN (?, '_broadcast')"
        if unread_only:
            query += " AND read = 0"
        query += " ORDER BY timestamp ASC"
        rows = conn.execute(query, (agent_name,)).fetchall()
        # mark as read
        conn.execute(
            "UPDATE messages SET read=1 WHERE recipient=? AND read=0",
            (agent_name,)
        )
    return rows
```

#### Migration impact

- Drop-in: swap `messaging.py` — CLI commands unchanged
- Existing messages in `~/.oa/messages/` can be migrated with a one-time script or ignored
- `aiosqlite` can be added for async support if needed

#### Estimated improvement over current system

| Metric | Current (file-based) | SQLite MVP |
|--------|---------------------|------------|
| Send latency | 50–200ms | 5–20ms |
| Receive latency | 50–500ms (poll) | 5–50ms (poll at 100ms) |
| Throughput | ~100 msg/s | ~2,000 msg/s |
| Persistence | Yes | Yes |
| Dependencies | None | None (stdlib) |
| Ordering | Non-deterministic | Guaranteed (ROWID) |

---

## 6. Production Recommendation

### Recommendation: Redis Streams

For a production Open-Agents deployment (multiple machines, high agent counts, real-time requirements), **Redis Streams** is the optimal choice.

#### Why Redis Streams over alternatives

| Criterion | Redis Streams | NATS JetStream | ZeroMQ |
|-----------|---------------|----------------|--------|
| Persistence | Yes (configurable retention) | Yes | No |
| Consumer groups | Yes | Yes | No (manual) |
| Pub/sub + queue hybrid | Yes | Yes | Partial |
| Python SDK maturity | `redis-py` (excellent) | `nats-py` (good) | `pyzmq` (good) |
| WSL2 Docker overhead | Low (~2ms) | Low (~2ms) | N/A (no server) |
| Observability | Redis Insight, RedisTimeSeries | NATS Surveyor | None |
| Operational complexity | Medium | Medium | Low |
| Message replay | Yes | Yes | No |

#### Architecture with Redis Streams

```
oa send researcher-1 "task result" --from orchestrator
    → XADD oa:messages:researcher-1 * sender orchestrator content "task result"

oa inbox researcher-1
    → XREADGROUP GROUP oa-consumers researcher-1 COUNT 100 STREAMS oa:messages:researcher-1 >
    → XACK oa:messages:researcher-1 oa-consumers <id>

oa broadcast "shutdown" --from orchestrator
    → XADD oa:messages:_broadcast * sender orchestrator content "shutdown"
    → Each agent reads from _broadcast stream in their polling loop
```

#### Consumer group pattern for agents

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
STREAM = f"oa:messages:{agent_name}"

# Create consumer group on startup
try:
    r.xgroup_create(STREAM, "oa-consumers", id='0', mkstream=True)
except redis.exceptions.ResponseError:
    pass  # Group already exists

# Read new messages
messages = r.xreadgroup(
    groupname="oa-consumers",
    consumername=agent_name,
    streams={STREAM: ">"},
    count=100,
    block=0  # 0 = wait indefinitely; set to 100 for 100ms polling
)

# Acknowledge processed messages
for stream, msgs in messages:
    for msg_id, data in msgs:
        process(data)
        r.xack(STREAM, "oa-consumers", msg_id)
```

#### When to migrate to Redis Streams

- Agent count exceeds ~20 concurrent agents
- Cross-machine deployments required
- Message throughput exceeds ~1,000 msg/s
- Real-time event streaming between agents needed (not just coordination)
- Integration with external systems (webhooks, APIs) via Redis

---

## 7. Docker Compose Snippet

For the **MVP (SQLite)**, no Docker is required.

For the **production Redis Streams** setup:

```yaml
# docker-compose.yml — Open-Agents message bus (production)
version: "3.9"

services:
  redis:
    image: redis:7-alpine
    container_name: oa-redis
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --loglevel notice
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis-insight:
    image: redis/redisinsight:latest
    container_name: oa-redis-insight
    restart: unless-stopped
    ports:
      - "127.0.0.1:5540:5540"
    volumes:
      - redis-insight-data:/data
    depends_on:
      redis:
        condition: service_healthy
    profiles:
      - observability  # Only start with: docker compose --profile observability up

volumes:
  redis-data:
  redis-insight-data:
```

**Usage:**

```bash
# Start the message bus
docker compose up -d redis

# With observability UI (http://localhost:5540)
docker compose --profile observability up -d

# Verify
docker compose exec redis redis-cli ping   # → PONG
docker compose exec redis redis-cli info server | grep redis_version

# Check streams
docker compose exec redis redis-cli XLEN oa:messages:orchestrator
```

**WSL2 notes:**
- Store `docker-compose.yml` in the Linux filesystem (`~/` or `/mnt/c/...`) — either works
- Docker Desktop with WSL2 backend: Redis binds to `127.0.0.1` in WSL2, reachable from Windows as `localhost:6379`
- If using Docker without Docker Desktop: install `docker` in WSL2 Ubuntu and use `service docker start`

**Python connection:**

```python
# oa-cli/src/open_agents/config.py addition
REDIS_URL = os.environ.get("OA_REDIS_URL", "redis://localhost:6379/0")

# oa-cli/src/open_agents/messaging_redis.py
import redis

def get_redis():
    from .config import REDIS_URL
    return redis.from_url(REDIS_URL, decode_responses=True)
```

---

## 8. Migration Path

### Phase 1 — MVP (now, ~1 day)

1. Create `messaging_sqlite.py` with same interface as `messaging.py`
2. Add `OA_MESSAGING_BACKEND=sqlite` env var (default: `file` for backwards compat)
3. Switch default to `sqlite` after one sprint of testing
4. Add `oa messages clean --older-than 7d` command

### Phase 2 — Production (when scaling required)

1. Add `redis-py` as optional dependency (`pip install open-agents[redis]`)
2. Create `messaging_redis.py` implementing the same interface
3. Backend selection via `OA_MESSAGING_BACKEND=redis` + `OA_REDIS_URL`
4. Add Docker Compose to `oa-cli/docker/message-bus.yml`
5. Document in `docs/deployment/message-bus.md`

### Interface contract (both backends must implement)

```python
def send_message(sender: str, recipient: str, content: str, metadata: dict | None) -> Any
def read_inbox(agent_name: str, unread_only: bool = False) -> list[dict]
def mark_read(agent_name: str, message_id: Any) -> None
def broadcast_message(sender: str, content: str, exclude: list[str] | None) -> list[Any]
def unread_count(agent_name: str) -> int
```

---

## Summary

| Decision | Choice | Reason |
|----------|--------|--------|
| **MVP** | SQLite | Zero dependencies, drop-in, persistent, ordered |
| **Production** | Redis Streams | Real-time, persistent, consumer groups, scalable |
| **Avoid** | ZeroMQ | No persistence |
| **Avoid** | Unix pipes | No fan-out, no persistence |
| **Avoid** | In-memory queue | Not compatible with tmux-based agent isolation |
| **Consider later** | NATS JetStream | If Redis proves too heavy or cross-datacenter needed |
