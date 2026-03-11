# Agent Workspace Templating & Isolation

**Issue:** #52
**Date:** 2026-03-11
**Status:** Final

---

## 1. Executive Summary

Every Open-Agents agent runs inside a temporary workspace directory (`/tmp/oa-agent-<name>/`)
that is scaffolded by `workspace.py:create_workspace`. The workspace is the agent's entire
world: it contains identity, task, rules, tooling configuration, and output channels.

This report defines a formal workspace template spec, provides three copyable CLAUDE.md
templates (base, researcher, code-worker), analyses isolation strategies across tmux, Docker,
and virtual environments, and gives a concrete MVP recommendation.

**Recommendation:** Formalise the existing tmux workspace as a versioned template system
with typed templates (base / researcher / code-worker / orchestrator). Add environment
variable filtering as a zero-cost isolation improvement. Keep Docker as an opt-in mode
for security-sensitive work only.

---

## 2. Workspace Template Spec

### 2.1 Minimum Required Files

Every agent workspace MUST contain the following on creation:

```
/tmp/oa-agent-<name>/
├── CLAUDE.md                    # Identity, task, rules — agent's "brain"
├── output/                      # All agent output goes here
│   └── result.md                # Final output (written by agent on completion)
├── .done                        # Completion signal (created by agent or spawner)
└── .claude/
    ├── settings.json            # bypassPermissions + Agent tool hook config
    └── hooks/
        └── block-agent-tool.sh  # Enforces oa run for sub-agent spawning
```

**Optional, conditionally added:**
- `.oa-run.sh` — shell script the spawner writes and executes via tmux
- `output/error.md` — written by agent when it encounters an unrecoverable error

### 2.2 CLAUDE.md Section Spec

The CLAUDE.md is the workspace's most important file. It controls agent behavior.
Sections are ordered by priority (agent reads top-down):

| Section | Required | Description |
|---------|----------|-------------|
| `# Agent: <name>` | Yes | Document title |
| `## Identity` | Yes | Name, model, team, task summary |
| `## Task` | Yes | Full task description, verbatim from `oa run` |
| `## Output Location` | Yes | Absolute paths to result.md and .done |
| `## DIRECT WRITE MODE` | Conditional | Present when `--direct` flag used |
| `## Quality Rules` | Yes | Numbered rules: no hallucinations, direct writes, abs paths |
| `## Anti-patterns` | Yes | Explicit prohibitions (no proposals, no Agent tool) |
| `## Team Context` | Conditional | Present when agent belongs to a team |
| `## Inter-Agent Messaging` | Yes | oa inbox / send / broadcast instructions |
| `## PATH Setup` | Yes | `export PATH=...` before oa commands |
| `## Sub-Agent Delegation` | Yes | oa run pattern, banned Agent tool |
| `## Constraints` | Yes | Autonomy, error handling, .done guarantee |

**Optional injected sections:**
- `# Skills` — domain knowledge from `skill_loader.py` when `--skill-type` provided
- `# Honesty Enforcer` — factuality constraints when `--honesty` flag used

### 2.3 settings.json Spec

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "deny": ["Agent"]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Agent",
        "hooks": ["bash /tmp/oa-agent-<name>/.claude/hooks/block-agent-tool.sh"]
      }
    ]
  }
}
```

`deny: ["Agent"]` is omitted when `can_spawn=True` (orchestrator mode).

### 2.4 Template Versioning

Current templates are generated inline by `workspace.py`. To support typed templates,
add a `template_version` field to CLAUDE.md metadata and a `type` field:

```markdown
<!-- template: base-agent | version: 1.0 -->
```

This allows future tooling to detect and migrate template versions without breaking
existing workspaces.

---

## 3. Isolation Strategy

### 3.1 What Open-Agents Currently Isolates

| Resource | Isolated? | Mechanism |
|----------|-----------|-----------|
| Filesystem (working dir) | Partial | Each agent gets its own `/tmp/oa-agent-*/` |
| Filesystem (project root) | No | Direct-write agents share the project |
| Environment variables | No | Agent inherits full parent environment |
| Network | No | Unrestricted |
| Process namespace | No | All agents in same tmux session |
| CPU/Memory | No | No cgroups or limits |
| Tool access | Yes | `deny: ["Agent"]` + hook blocks Agent tool |
| Sub-agent spawning | Controlled | `--parent`, `--depth`, `MAX_DEPTH_ABSOLUTE=10` |

### 3.2 Filesystem Isolation

The `/tmp/oa-agent-<name>/` prefix gives each agent a private working directory.
This is effective for output isolation — agents cannot accidentally overwrite each
other's `output/result.md`.

**Gap:** Direct-write agents (`--direct`) all write to the same project root.
Conflicts are currently avoided by convention (agents check `oa status`) but not
enforced technically. A file ownership registry (`file_ownership.py` exists but
is not systematically enforced) could address this.

**Recommendation:** For MVP, document the file ownership convention. For v2, wire
`file_ownership.py` into `create_workspace` to register claimed paths at spawn time.

### 3.3 Environment Variable Filtering

Agents inherit the spawning shell's full environment, including secrets (API keys,
tokens). This is a security risk in multi-tenant or public deployments.

**Quick win (zero cost):** Add an `env_filter` parameter to `create_workspace` that
strips sensitive keys before spawning:

```python
SENSITIVE_ENV_KEYS = {"OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GITHUB_TOKEN", ...}
```

In `_build_claude_command`, prepend `env -u KEY1 -u KEY2 ...` to unset these before
the agent command. Agents that legitimately need API access can receive them via
explicit workspace injection (`workspace/secrets/env.json`, gitignored).

### 3.4 Tool Access Isolation

The `deny: ["Agent"]` permission + `block-agent-tool.sh` hook is the most effective
isolation mechanism currently in place. It guarantees:
1. Agents cannot spawn invisible sub-agents (bypassing oa orchestration)
2. All sub-agent activity is registered in state and visible via `oa status`

**Extension:** Add deny entries for other high-risk tools per agent type:
- `researcher` agents: deny `Write`, `Edit`, `Bash` (read-only by default)
- `code-worker` agents: deny `WebFetch`, `WebSearch` (no internet by default)

This can be driven by the typed template system.

---

## 4. Isolation Strategy Comparison

### 4.1 tmux (Current)

**How it works:** Each agent is a tmux window in the `oa` session. Isolation is
purely by convention: separate working directories, naming conventions, depth limits.

| Property | Value |
|----------|-------|
| Setup overhead | Zero (tmux already running) |
| Filesystem isolation | Working dir only |
| Env var isolation | None (inherits parent) |
| Network isolation | None |
| Resource limits | None |
| Visibility | Full (oa status, oa watch) |
| Inter-agent comms | Native (oa send/inbox via JSON files) |
| Crash recovery | Guardian window restarts crashed agents |
| Nested agents | Supported (depth up to 10) |

**Verdict:** Appropriate for trusted, single-user local development. Insufficient
for multi-tenant, public, or security-critical workloads.

### 4.2 Docker

**How it works:** Each agent runs in an isolated container with its own filesystem,
network namespace, and optional resource limits.

| Property | Value |
|----------|-------|
| Setup overhead | High (daemon, image builds, registry) |
| Filesystem isolation | Full (container root FS, volume mounts) |
| Env var isolation | Full (explicit `--env` injection) |
| Network isolation | Full (custom bridge networks) |
| Resource limits | Full (cgroups: CPU, memory, PIDs) |
| Visibility | External (`docker ps`, logs via `docker logs`) |
| Inter-agent comms | Requires bridge (shared volume, message queue) |
| Crash recovery | `--restart unless-stopped` |
| Nested agents | Requires Docker-in-Docker or socket mounting |

A `docker_runtime.py` already exists in the codebase — this is the foundation for
an opt-in Docker mode. The main blockers are:
- Image build time (cold start for first agent)
- Claude Code requires a writable home directory and npm/node
- Nested `oa run` inside Docker requires socket passthrough or DinD

**Verdict:** The right solution for production, multi-tenant, or security-critical
deployments. Too heavy for personal local development. Target as `oa run --runtime docker`.

### 4.3 Virtual Environments (Python venv / conda)

**How it works:** Process-level isolation for Python dependencies. Not a general
agent isolation strategy.

| Property | Value |
|----------|-------|
| Setup overhead | Low (venv create, pip install) |
| Filesystem isolation | Python packages only |
| Env var isolation | None |
| Network isolation | None |
| Resource limits | None |

**Verdict:** Irrelevant for LLM agent isolation. Relevant only for agents that
run Python tooling (e.g., data analysis agents needing specific package versions).
Not a substitute for workspace isolation.

### 4.4 Summary Matrix

| Feature | tmux (current) | Docker (opt-in) | venv |
|---------|----------------|-----------------|------|
| Zero-setup | Yes | No | Partial |
| Filesystem isolation | Working dir | Full | No |
| Env var isolation | No | Yes | No |
| Network isolation | No | Yes | No |
| Resource limits | No | Yes | No |
| Nested agents | Yes | Complex | N/A |
| Inter-agent messaging | Native | Needs bridge | N/A |
| Production-safe | No | Yes | No |

---

## 5. Typed Template Recommendation

### 5.1 Three Core Templates

Introduce three typed templates as the default options for `oa run --type`:

| Type | Purpose | Tool Grants | Tool Denials |
|------|---------|-------------|--------------|
| `base-agent` | Generic worker | All standard tools | Agent |
| `researcher` | Read-only information gathering | Read, Glob, Grep, WebFetch, WebSearch | Agent, Write, Edit, Bash |
| `code-worker` | File modification, coding | Read, Edit, Write, Bash, Glob, Grep | Agent, WebFetch, WebSearch |

A fourth template (`orchestrator`) grants `can_spawn=True` for pipeline coordinators.

### 5.2 Template Injection in workspace.py

Add a `template_type` parameter to `create_workspace`:

```python
create_workspace(
    agent_name="my-agent",
    task="...",
    template_type="researcher",  # base-agent | researcher | code-worker | orchestrator
)
```

Each type injects additional `deny` entries into `settings.json` and prepends a
type-specific preamble to CLAUDE.md (from `agents/templates/<type>/CLAUDE.md`).

### 5.3 MVP Scope

For MVP (Issue #52), implement:
1. The three CLAUDE.md templates in `agents/templates/` (this report creates them)
2. `template_type` parameter in `create_workspace` → drives `deny` list in settings.json
3. `--type` flag for `oa run` in `cli.py`
4. Document the template spec in this file

Defer to v2:
- Docker runtime integration
- File ownership enforcement
- Environment variable filtering
- Template versioning / migration

---

## 6. References

- `oa-cli/src/open_agents/workspace.py` — current workspace builder (source of truth)
- `oa-cli/src/open_agents/spawner.py` — agent spawn flow
- `oa-cli/src/open_agents/docker_runtime.py` — existing Docker runtime skeleton
- `oa-cli/src/open_agents/file_ownership.py` — file ownership registry (unused)
- `docs/research/tmux-runtime.md` — tmux session architecture (Issue #51)
- `agents/presets/*.json` — existing agent presets with tool lists

---

## Appendix: Workspace Template File Tree

```
agents/templates/
├── base-agent/
│   └── CLAUDE.md      # Generic worker template
├── researcher/
│   └── CLAUDE.md      # Read-only research agent template
└── code-worker/
    └── CLAUDE.md      # File modification / coding agent template
```

Each template is a complete, copyable CLAUDE.md with `{{PLACEHOLDER}}` variables
for name, task, and output paths. `workspace.py` reads and interpolates these
when `template_type` is set.
