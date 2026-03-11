# A2A (Agent-to-Agent) Protocol Compatibility for Open-Agents

**Issue**: #57
**Date**: 2026-03-11
**Status**: Research — Draft
**Author**: research-a2a agent

---

## 1. Protocol Overview

### What is A2A?

The Agent2Agent (A2A) protocol is an open standard introduced by Google in April 2025 for structured
communication and interoperability between AI agents across different platforms, vendors, and frameworks.
Where MCP (Model Context Protocol) standardizes how a single agent connects vertically to tools and data
sources, A2A standardizes how agents communicate horizontally with each other.

> **Mental model**: MCP = agent ↔ tools. A2A = agent ↔ agent.

Both protocols are explicitly designed as **complementary**, not competing. An agent involved in an A2A
collaboration may use MCP internally to fulfill its part of a task.

### Core A2A Concepts

| Concept | Description |
|---------|-------------|
| **Agent Card** | JSON metadata document published at `/.well-known/agent.json` — describes the agent's identity, capabilities, skills, endpoint URL, and authentication requirements |
| **Task** | The unit of work. Has a unique ID and progresses through a defined lifecycle |
| **Task Lifecycle** | `submitted` → `working` → `input-required` → `completed` / `failed` |
| **Skill** | A declared capability or function an agent can perform; included in the Agent Card so clients can discover what an agent is good for |
| **Message** | Turn-based communication: client sends a message, agent responds (optionally streaming) |
| **Part** | Content units within a message: text, file, data (JSON blob) |
| **Artifact** | Durable output produced by a task (file, dataset, structured result) |

### Transport and Encoding

- **HTTP/HTTPS** as the transport layer (JSON-RPC 2.0 as payload format)
- **Server-Sent Events (SSE)** for streaming long-running tasks
- **gRPC** added in v0.3.0 (July 2025)
- Authentication credentials passed via **HTTP headers** (separate from A2A messages)
- Supported auth patterns: OAuth 2.0, API keys, mutual TLS

### Protocol Versions (as of knowledge cutoff August 2025)

| Version | Date | Key Additions |
|---------|------|---------------|
| v0.1 | April 2025 | Initial release (Google) |
| v0.2.5 | June 2025 | Stabilized core spec, Python SDK |
| v0.3.0 | July 2025 | gRPC support, signed security cards, extended Python SDK |

### Ecosystem Adoption

At knowledge cutoff (August 2025), early adoption includes: Google Vertex AI, ADK (Agent Development Kit),
LangChain/LangSmith, IBM, Apono, and a growing number of community A2A server implementations. Open
registry efforts (e.g., agent-reg) for discovering A2A agents by capability were in early stages.

---

## 2. Gap Analysis

### What Open-Agents Already Supports

Open-Agents (oa-cli) has a solid internal multi-agent coordination system built for **local,
subscription-based execution** via tmux + Claude Code. Many A2A concepts have informal equivalents:

| A2A Concept | Open-Agents Equivalent | Status |
|-------------|------------------------|--------|
| Agent identity | Agent name + CLAUDE.md description | Partial |
| Task lifecycle | agent state in `~/.oa/agents.json` (running/done/error) | Partial |
| Messaging (agent↔agent) | `oa send`, `oa inbox`, `oa broadcast` (file-based) | Partial |
| Skill discovery | Agent library JSON templates with `tools[]` and `description` | Partial |
| Pipeline orchestration | `oa pipeline` (planner → workers → combiner) | Present |
| Teams/multi-agent | `oa team create/list`, shared task lists | Present |
| Streaming output | tmux `capture-pane` + React SPA polling | Partial (non-standard) |
| Agent Card | None | **Missing** |
| HTTP endpoint per agent | None (tmux-only) | **Missing** |
| JSON-RPC transport | None (file-based IPC) | **Missing** |
| A2A task states | No `submitted`/`input-required` distinction | **Missing** |
| SSE endpoint | None (polling only) | **Missing** |
| Auth negotiation | None | **Missing** |
| Push notifications | None | **Missing** |
| Artifact management | `./output/` convention (informal) | Partial |

### Key Gaps Detailed

**Gap 1 — No HTTP endpoint per agent**
oa-cli agents run as tmux sessions. They have no HTTP server. A2A requires each agent to expose an HTTP
endpoint where it accepts task requests. This is the most fundamental architectural gap.

**Gap 2 — No Agent Card**
oa agents have names and CLAUDE.md descriptions, but no machine-readable JSON document at a well-known URL.
No external system can discover oa agents' capabilities without reading internal files.

**Gap 3 — No JSON-RPC messaging**
Internal messaging (`oa send`/`oa inbox`) uses flat JSON files in `~/.oa/messages/`. Valid for local
coordination but incompatible with A2A's JSON-RPC 2.0 request/response envelope.

**Gap 4 — Incomplete task lifecycle**
oa tracks: `running`, `done`, `error`. A2A adds: `submitted` (queued), `working` (active), `input-required`
(paused awaiting human input), and distinguishes `completed` from `failed`. The `input-required` state is
particularly valuable for human-in-the-loop workflows.

**Gap 5 — No standardized auth**
oa-cli runs locally with full file permissions. No auth is needed internally, but exposing agents to external
callers (other systems, remote agents) requires a defined auth story.

**Gap 6 — No skill declaration standard**
The agent library has 454+ agent templates with descriptions and tool arrays, but this is not emitted in A2A
Skill format and is not queryable externally.

---

## 3. Architecture Options

### Option A — Native A2A

Rebuild oa-cli's agent communication layer on top of HTTP/JSON-RPC. Each spawned agent would expose a local
HTTP server. The orchestrator (`oa`) would become an A2A client. Internal messaging would be replaced with
JSON-RPC calls.

**Pros:**
- Full spec compliance
- External systems (Vertex AI, LangChain, etc.) can call oa agents natively
- Long-term future-proof if A2A becomes dominant standard

**Cons:**
- Major rewrite of core tmux-based runtime (D-045)
- Breaks the "no API key, subscription-based" value proposition — HTTP servers need ports, process
  management, lifetime management
- Each agent as an HTTP service is complex overhead for short-lived coding tasks
- Abandons the simplicity that is oa-cli's biggest strength

**Verdict**: Too disruptive. Not recommended for current phase.

### Option B — Compatibility Layer

Build an A2A adapter that wraps the existing oa-cli architecture. The adapter exposes an HTTP server with
A2A-compliant endpoints, translating A2A requests into `oa run` commands and mapping oa agent state back to
A2A task lifecycle states.

```
External A2A Client
        │
        ▼ HTTP / JSON-RPC 2.0
┌─────────────────────────┐
│   oa A2A Adapter        │   ← New component
│  - /.well-known/agent.json
│  - POST /tasks/send     │
│  - GET  /tasks/{id}     │
│  - SSE  /tasks/{id}/events
└────────┬────────────────┘
         │ translates to
         ▼
┌─────────────────────────┐
│   oa-cli (existing)     │
│  oa run / oa status     │
│  oa send / oa inbox     │
│  ~/.oa/agents.json      │
└─────────────────────────┘
```

**Pros:**
- No changes to existing oa-cli core
- Internal agents keep file-based messaging (fast, simple, offline)
- Incremental: start with read-only discovery, add task delegation in later phases
- Specific agents can opt-in to A2A exposure (not all agents need to be discoverable)
- Aligns with Sprint 15 plans for `oa MCP Server` — same pattern, different protocol

**Cons:**
- Not "native" A2A — may miss edge cases in spec
- Adapter adds a process to manage
- Long-running agents + HTTP polling adds complexity vs. SSE push

**Verdict**: Recommended. Low risk, incremental, preserves oa-cli's core simplicity.

### Option C — Wait and See

Defer A2A entirely until the ecosystem matures further and internal requirements emerge.

**Pros**: Zero implementation cost now.
**Cons**: Risks falling behind ecosystem if A2A becomes table stakes for agent interoperability.
**Verdict**: Acceptable as a fallback, but Phase 1 of Option B is low enough effort to start.

---

## 4. Agent Card Prototype

An Agent Card for the Open-Agents orchestrator itself would look like this:

```json
{
  "name": "Open-Agents Orchestrator",
  "description": "Multi-agent orchestrator for Claude Code. Spawn and coordinate parallel AI agents via oa-cli. Supports coding, research, pipelines, and agent teams.",
  "version": "0.2.0",
  "url": "http://localhost:8090/a2a",
  "documentationUrl": "https://github.com/OpenAEC-Foundation/Open-Agents",
  "provider": {
    "organization": "OpenAEC Foundation"
  },
  "capabilities": {
    "streaming": true,
    "pushNotifications": false,
    "stateTransitionHistory": true
  },
  "authentication": {
    "schemes": ["None"],
    "credentials": null
  },
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["text/plain", "application/json"],
  "skills": [
    {
      "id": "run-agent",
      "name": "Run Agent",
      "description": "Spawn a new Claude Code agent with a task description. Returns agent name and workspace path.",
      "tags": ["orchestration", "claude", "agent"],
      "inputModes": ["text/plain"],
      "outputModes": ["text/plain", "application/json"],
      "examples": [
        "Write a Python function that validates email addresses",
        "Research the top 5 open-source agent frameworks in 2026"
      ]
    },
    {
      "id": "run-pipeline",
      "name": "Run Pipeline",
      "description": "Execute a multi-agent pipeline: planner splits the task, parallel workers execute, combiner merges results.",
      "tags": ["orchestration", "pipeline", "parallel"],
      "inputModes": ["text/plain"],
      "outputModes": ["application/json"]
    },
    {
      "id": "get-agent-status",
      "name": "Get Agent Status",
      "description": "Return the current status and output of a named agent.",
      "tags": ["monitoring"],
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    },
    {
      "id": "list-agents",
      "name": "List Agents",
      "description": "Return all running and recently completed agents with their status.",
      "tags": ["monitoring"],
      "inputModes": [],
      "outputModes": ["application/json"]
    }
  ]
}
```

This Agent Card would be served at `http://localhost:8090/.well-known/agent.json` by the oa A2A Adapter.

---

## 5. Adoption Roadmap

### Phase 1 — Discovery (Low Effort, High Value)

**Goal**: Make oa agents discoverable by A2A clients.

**Tasks:**
- Implement `oa a2a serve` command that starts a lightweight HTTP server (FastAPI or Flask)
- Serve `/.well-known/agent.json` with the Agent Card above
- Implement `GET /tasks/{id}` to read agent state from `~/.oa/agents.json` and map to A2A task states:

  | oa state | A2A state |
  |----------|-----------|
  | `running` | `working` |
  | `done` | `completed` |
  | `error` | `failed` |
  | queued | `submitted` |

- Return task output as a `TextPart` in the A2A response
- No inbound task creation yet — read-only

**Effort estimate**: 2-3 days
**Dependency**: None (additive to existing oa-cli)

### Phase 2 — Task Delegation (Medium Effort)

**Goal**: External A2A clients can spawn oa agents and receive results.

**Tasks:**
- Implement `POST /tasks/send` — translate A2A `TaskSendParams` to `oa run` invocation
- Generate A2A task ID, map to oa agent name
- Implement SSE endpoint `GET /tasks/{id}/events` using tmux `capture-pane` output polling
- Add `input-required` state support: pause agent execution, surface to A2A client, resume on reply
- Add basic API key auth for the adapter (header-based)

**Effort estimate**: 1-2 weeks
**Dependency**: Phase 1 complete

### Phase 3 — Ecosystem Integration (Higher Effort)

**Goal**: Full bidirectional interoperability — oa agents can also call external A2A agents.

**Tasks:**
- Implement A2A client in oa-cli: `oa a2a call <agent-card-url> "<task>"`
- Allow `oa run` to target an external A2A agent as the executor (not just Claude Code)
- Register oa agents in public A2A registries (if such registries stabilize)
- Signed Agent Cards (v0.3.0 feature) for verifiable identity
- Push notifications via webhook (for long-running remote tasks)
- Canvas integration: A2A agents as node types in the visual editor

**Effort estimate**: 3-5 weeks
**Dependency**: Phase 2 complete, A2A ecosystem maturation

---

## 6. Decision

### Recommendation: Compatibility Layer (Option B), starting with Phase 1

**Rationale:**

1. **Architectural fit**: oa-cli is a local, tmux-based, subscription-driven orchestrator. Rebuilding it as
   an HTTP-native A2A runtime (Option A) would undo the simplicity that makes it valuable. A thin adapter
   preserves the existing architecture while adding interoperability.

2. **Low risk, high upside**: Phase 1 (discovery only) is a 2-3 day investment that immediately gives oa a
   machine-readable identity and lets A2A clients discover its capabilities. This is strictly additive.

3. **Precedent within the project**: Sprint 15 already plans an `oa MCP Server`. An A2A adapter follows the
   exact same pattern — both are protocol adapters that translate external standard requests into oa-cli
   internal commands. Building one makes the other easier.

4. **Ecosystem timing**: A2A reached v0.3.0 in July 2025 and has real adoption (LangChain, IBM, Vertex AI).
   It is not yet ubiquitous, but the trajectory is clear. Early Phase 1 adoption positions Open-Agents
   ahead of the curve without betting on an unstable spec.

5. **Internal messaging stays unchanged**: oa's file-based `send`/`inbox`/`broadcast` system is faster and
   simpler than JSON-RPC for local agent coordination. There is no reason to replace it. A2A is for
   cross-platform, cross-network interoperability — a different use case.

### Decision to Record (D-051)

> **D-051: A2A Protocol Adoption Strategy**
> **Chosen**: Option B — Compatibility Layer
> **Approach**: Build `oa a2a serve` as a standalone adapter process. Phase 1: read-only Agent Card + task
> state endpoint. Phase 2: inbound task delegation. Phase 3: outbound A2A client + ecosystem integration.
> **Internal messaging**: Unchanged (file-based, local).
> **Not chosen**: Option A (native A2A rewrite — too disruptive), Option C (defer — low-effort Phase 1
> makes deferral unnecessary).

### Uncertainty Acknowledgment

- The A2A spec was at v0.3.0 at knowledge cutoff (August 2025). By March 2026, there may be v0.4+ with
  breaking changes — verify against current spec before implementation.
- The gRPC transport (v0.3.0) may become preferred over HTTP/SSE in the ecosystem. Design the adapter to
  be transport-agnostic from the start.
- A2A registry standardization was immature at cutoff. Phase 3 dependency on stable registries should be
  re-evaluated before starting that phase.

---

## Sources

- [A2A Protocol Specification (latest)](https://a2a-protocol.org/latest/specification/)
- [Announcing A2A — Google Developers Blog](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [A2A GitHub Repository (a2aproject/A2A)](https://github.com/a2aproject/A2A)
- [A2A v0.3.0 Specification](https://a2a-protocol.org/v0.3.0/specification/)
- [MCP vs A2A — Clarifai](https://www.clarifai.com/blog/mcp-vs-a2a-clearly-explained)
- [MCP vs A2A — Auth0](https://auth0.com/blog/mcp-vs-a2a/)
- [A2A Protocol Explained — HuggingFace](https://huggingface.co/blog/1bo/a2a-protocol-explained)
- [Agent Skills & Agent Card Tutorial](https://a2a-protocol.org/latest/tutorials/python/3-agent-skills-and-card/)
- [LangSmith A2A Endpoint](https://docs.langchain.com/langsmith/server-a2a)
