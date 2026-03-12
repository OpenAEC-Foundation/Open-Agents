"""MCP Server — first-class interface between Claude Code and oa-cli.

This server exposes the full power of oa-cli as MCP tools so Claude Code can
orchestrate agents, manage teams, send messages, and inspect state — all without
leaving the conversation.

Tool categories:
  Session      (3)  — start/stop/status of the oa tmux session
  Agents       (8)  — spawn, list, inspect, collect, kill agents
  Messaging    (5)  — DM, broadcast, inbox, feedback
  Pipeline     (2)  — multi-agent pipeline, quality chain
  Teams        (4)  — create, list, manage, delete teams
  Tasks        (5)  — create, list, claim, complete tasks
  Library      (3)  — templates, skills
  Meta         (4)  — canvas, config, metrics, doctor

Usage (add to .mcp.json):
  {
    "mcpServers": {
      "open-agents": {
        "command": "python3",
        "args": ["-m", "open_agents.mcp_server"]
      }
    }
  }
"""

from __future__ import annotations

import json
import subprocess
import time
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from mcp.server.fastmcp import FastMCP

from .state import (
    load_agents,
    get_agent,
    list_agents as _list_agents,
    get_children,
)
from .messaging import (
    send_message as _send_message,
    broadcast_message as _broadcast_message,
    read_inbox as _read_inbox,
    unread_count as _unread_count,
    mark_read as _mark_read,
)
from .teams import (
    create_team as _create_team,
    get_team as _get_team,
    list_teams as _list_teams,
    add_member as _add_member,
    delete_team as _delete_team,
)
from .task_list import (
    create_task as _create_task,
    update_task as _update_task,
    get_task as _get_task,
    list_tasks as _list_tasks,
    claim_task as _claim_task,
)
from .config import load_config

mcp = FastMCP("open-agents")

OA_BIN = "oa"


def _autostart_session() -> None:
    """Start the oa tmux session at MCP server startup (runs once when Claude Code loads).

    This means `oa start` is called automatically every time Claude Code opens
    the project — no manual bootstrap needed. Safe to call if already running.
    """
    try:
        subprocess.run(
            [OA_BIN, "start"],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except Exception:
        pass  # Silent — don't break MCP startup if oa is unavailable


# Run at import time (Claude Code loads .mcp.json → starts this server → session starts)
_autostart_session()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _run_oa(*args: str, timeout: int = 60) -> dict:
    """Run an oa CLI command and return structured output."""
    cmd = [OA_BIN, *args]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "success": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Command timed out after {timeout}s", "cmd": " ".join(cmd)}
    except FileNotFoundError:
        return {"success": False, "error": f"'{OA_BIN}' not found in PATH — run: pip install -e oa-cli/"}


def _agent_summary(rec) -> dict:
    """Return a concise agent summary for list views."""
    d = asdict(rec)
    # Truncate task for readability
    if len(d.get("task", "")) > 120:
        d["task"] = d["task"][:120] + "…"
    # Calculate duration
    if rec.created_at and rec.finished_at:
        d["duration_seconds"] = round(rec.finished_at - rec.created_at, 1)
    elif rec.created_at:
        d["duration_seconds"] = round(time.time() - rec.created_at, 1)
    return d


# ===========================================================================
# CATEGORY 1: SESSION
# ===========================================================================

@mcp.tool()
def session_start() -> dict:
    """Start the oa tmux session and initialize the ~/.oa/ state directory.

    Must be called at the start of every orchestration session. Creates the
    tmux session that all agents run in. Safe to call if already running.

    Returns:
        success: whether session started (or was already running).
        message: human-readable status.
    """
    result = _run_oa("start")
    return {
        "success": result["success"],
        "message": result["stdout"] or result.get("error", result["stderr"]),
    }


@mcp.tool()
def session_stop() -> dict:
    """Stop the oa tmux session and all running agents inside it.

    Use at end of session or when cleaning up. Running agents are killed.

    Returns:
        success: whether session was stopped.
    """
    result = _run_oa("stop")
    return {
        "success": result["success"],
        "message": result["stdout"] or result.get("error", result["stderr"]),
    }


@mcp.tool()
def session_status() -> dict:
    """Get full session health: tmux, claude CLI, agent counts, unread messages.

    Use this at session start to understand the current state. Returns a
    comprehensive snapshot including:
    - tmux session alive?
    - claude CLI authenticated?
    - counts of running/done/failed agents
    - agents with unread inbox messages
    - current default model and config

    Returns:
        health: dict with tmux, claude_cli booleans
        agents: dict with status counts
        unread_inboxes: list of agent names with unread messages
        config: key config values (default_model, max_depth, timeout_minutes)
    """
    # Agent counts
    all_agents = load_agents()
    counts = {"running": 0, "done": 0, "failed": 0, "killed": 0, "other": 0}
    for rec in all_agents.values():
        if rec.status in counts:
            counts[rec.status] += 1
        else:
            counts["other"] += 1

    # Unread inbox summary
    unread_inboxes = []
    for name in all_agents:
        try:
            n = _unread_count(name)
            if n > 0:
                unread_inboxes.append({"agent": name, "unread": n})
        except Exception:
            pass

    # Config summary
    try:
        cfg = load_config()
        config_summary = {
            "default_model": cfg.get("default_model", "?"),
            "max_depth": cfg.get("max_depth", 5),
            "timeout_minutes": cfg.get("timeout_minutes", 60),
            "remote_default": bool(cfg.get("remote_repo_path")),
        }
    except Exception:
        config_summary = {}

    # tmux + claude health via doctor (quick)
    doctor = _run_oa("doctor", timeout=15)
    tmux_ok = "tmux" in doctor["stdout"].lower() and "✓" in doctor["stdout"]
    claude_ok = "claude" in doctor["stdout"].lower() and "✓" in doctor["stdout"]

    return {
        "success": True,
        "health": {
            "tmux": tmux_ok,
            "claude_cli": claude_ok,
        },
        "agents": {
            "total": len(all_agents),
            **counts,
        },
        "unread_inboxes": unread_inboxes,
        "config": config_summary,
    }


# ===========================================================================
# CATEGORY 2: AGENTS
# ===========================================================================

@mcp.tool()
def spawn_agent(
    task: str,
    name: str,
    model: str = "claude/sonnet",
    parent: Optional[str] = None,
    task_type: Optional[str] = None,
    can_spawn: bool = False,
    remote: Optional[str] = None,
    local: bool = False,
    budget: Optional[int] = None,
    template: Optional[str] = None,
) -> dict:
    """Spawn a new agent with the given task. ALWAYS use --direct.

    This is the primary way to run work. Each agent gets its own tmux window,
    workspace, and CLAUDE.md. Output is written to output/result.md.

    Args:
        task: The task prompt for the agent. Should follow 5-element format:
              absolute paths, explicit scope, reference files, quality rules, sources.
        name: Unique agent name (e.g. 'researcher-api', 'builder-auth').
              Use descriptive names — they appear in status and messaging.
        model: Which model to use. Options:
               claude/haiku   — fast, cheap (scanning, formatting)
               claude/sonnet  — balanced (default, coding, writing)
               claude/opus    — deepest reasoning (architecture, decisions)
               hetzner/mixtral:8x7b   — OSS, GPU, parallel
               hetzner/codestral:22b  — OSS, code-specialized
               hetzner/mistral-nemo   — OSS, long context (128k)
        parent: Name of the orchestrating agent (for hierarchy tracking).
        task_type: One of: researcher, builder, reviewer, transformer,
                   orchestrator, validator. Injects a matching CLAUDE.md template.
        can_spawn: Set True for orchestrators that need to spawn sub-agents.
        remote: SSH host to run on (e.g. 'hetzner-agent'). Default uses machines.json.
        local: Force local execution even if remote is default.
        budget: Max token budget for this agent run.
        template: Template ID from agents/library/ to inject.

    Returns:
        success: bool
        name: agent name (confirm)
        workspace: path to agent workspace
        message: spawn output
    """
    args = ["run", task, "--name", name, "--model", model, "--direct"]

    if parent:
        args += ["--parent", parent]
    if task_type:
        args += ["--type", task_type]
    if can_spawn:
        args.append("--can-spawn")
    if remote:
        args += ["--remote", remote]
    if local:
        args.append("--local")
    if budget:
        args += ["--budget", str(budget)]
    if template:
        args += ["--template", template]

    result = _run_oa(*args, timeout=30)
    return {
        "success": result["success"],
        "name": name,
        "model": model,
        "message": result["stdout"] or result.get("error", result["stderr"]),
    }


@mcp.tool()
def spawn_orchestrator(
    task: str,
    name: str,
    model: str = "claude/sonnet",
    remote: Optional[str] = None,
) -> dict:
    """Spawn a meta-orchestrator agent (--can-spawn enabled, task_type=orchestrator).

    Shortcut for the most common orchestration pattern: spawn a coordinator that
    will itself spawn workers. The orchestrator should decompose the task and
    delegate to sub-agents via oa run from within its tmux window.

    Args:
        task: High-level task for the orchestrator to decompose and delegate.
              Must include: goal, output path, worker expectations, quality rules.
        name: Name (e.g. 'meta-feature-x', 'orch-refactor').
        model: Use claude/sonnet (default) or claude/opus for complex planning.
        remote: Optional SSH host. Omit to use default from machines.json.

    Returns:
        success: bool
        name: orchestrator name
        message: spawn output
        tip: reminder about monitoring the orchestrator
    """
    args = ["run", task, "--name", name, "--model", model, "--can-spawn", "--direct"]
    if remote:
        args += ["--remote", remote]

    result = _run_oa(*args, timeout=30)
    return {
        "success": result["success"],
        "name": name,
        "model": model,
        "message": result["stdout"] or result.get("error", result["stderr"]),
        "tip": f"Monitor via: oa attach {name} | Check inbox: oa inbox {name} --unread",
    }


@mcp.tool()
def list_agents(
    status: Optional[str] = None,
    parent: Optional[str] = None,
    team: Optional[str] = None,
    model_prefix: Optional[str] = None,
) -> dict:
    """List agents with optional filters.

    Args:
        status: Filter by status: 'running', 'done', 'failed', 'killed'. Omit for all.
        parent: Only return agents with this parent (direct children only).
        team: Only return agents belonging to this team.
        model_prefix: Filter by model prefix, e.g. 'claude', 'hetzner', 'ollama'.

    Returns:
        count: number of matching agents
        agents: list of agent summaries (name, model, status, task_preview, duration_s)
        running_names: convenience list of currently-running agent names
    """
    all_agents = load_agents()
    records = list(all_agents.values())

    if status:
        records = [r for r in records if r.status == status]
    if parent:
        records = [r for r in records if r.parent == parent]
    if team:
        records = [r for r in records if r.team == team]
    if model_prefix:
        records = [r for r in records if r.model.startswith(model_prefix)]

    summaries = [_agent_summary(r) for r in records]

    running_names = [
        r.name for r in all_agents.values() if r.status == "running"
    ]

    return {
        "success": True,
        "count": len(summaries),
        "agents": summaries,
        "running_names": running_names,
    }


@mcp.tool()
def get_agent(name: str) -> dict:
    """Get full details for a single agent including output preview.

    Returns all agent fields plus a 500-character preview of result.md if available.

    Args:
        name: Agent name to inspect.

    Returns:
        found: bool
        agent: full AgentRecord dict
        output_preview: first 500 chars of result.md (if done)
        children: list of child agent names
    """
    rec = get_agent(name)
    if rec is None:
        return {"found": False, "error": f"Agent '{name}' not found"}

    result = {"found": True, "agent": asdict(rec)}

    # Output preview
    workspace = Path(rec.workspace)
    for candidate in [workspace / "output" / "result.md", workspace / "result.md"]:
        if candidate.exists():
            try:
                content = candidate.read_text(encoding="utf-8")
                result["output_preview"] = content[:500] + ("…" if len(content) > 500 else "")
                result["output_size"] = len(content)
            except OSError:
                pass
            break

    # Children
    children = get_children(name)
    result["children"] = [c.name for c in children]

    return result


@mcp.tool()
def collect_output(name: str) -> dict:
    """Read the full output/result.md from a completed agent's workspace.

    Use after an agent's status is 'done'. Returns the complete output.
    For large outputs, consider reading specific sections after inspection.

    Args:
        name: The agent name whose output to collect.

    Returns:
        found: bool
        content: full content of result.md
        path: absolute path to result.md
        size: character count
        status: agent status at time of collection
    """
    rec = get_agent(name)
    if rec is None:
        return {"found": False, "error": f"Agent '{name}' not found"}

    workspace = Path(rec.workspace)
    candidates = [workspace / "output" / "result.md", workspace / "result.md"]
    if rec.output_file:
        candidates.insert(0, Path(rec.output_file))

    for path in candidates:
        if path.exists():
            try:
                content = path.read_text(encoding="utf-8")
                return {
                    "found": True,
                    "content": content,
                    "path": str(path),
                    "size": len(content),
                    "status": rec.status,
                }
            except OSError as e:
                return {"found": False, "error": str(e)}

    return {
        "found": False,
        "error": f"No result.md in {workspace}",
        "status": rec.status,
        "workspace": str(workspace),
        "tip": "Agent may still be running, or output path is non-standard.",
    }


@mcp.tool()
def capture_live(name: str) -> dict:
    """Capture the current live output from an agent's tmux window (snapshot).

    Useful for monitoring a running agent's progress without waiting for completion.
    Returns what is currently visible on screen plus recent scrollback.

    Args:
        name: Agent name to capture.

    Returns:
        success: bool
        output: terminal content (last ~200 lines)
        status: agent status
    """
    rec = get_agent(name)
    if rec is None:
        return {"success": False, "error": f"Agent '{name}' not found"}

    # Use tmux capture-pane on agent's window
    result = _run_oa("collect", name, "--live", timeout=10)
    if result["success"]:
        return {"success": True, "output": result["stdout"], "status": rec.status}

    # Fallback: direct tmux capture
    window = getattr(rec, "tmux_window", None)
    if window:
        try:
            r = subprocess.run(
                ["tmux", "capture-pane", "-pt", window, "-S", "-200"],
                capture_output=True, text=True, timeout=5
            )
            return {"success": True, "output": r.stdout, "status": rec.status}
        except Exception as e:
            return {"success": False, "error": str(e), "status": rec.status}

    return {"success": False, "error": "No tmux window found", "status": rec.status}


@mcp.tool()
def kill_agent(name: str) -> dict:
    """Kill a running agent (sends SIGTERM to tmux window, marks as killed).

    Args:
        name: Agent name to kill.

    Returns:
        success: bool
        message: result of kill operation
    """
    result = _run_oa("kill", name)
    return {
        "success": result["success"],
        "message": result["stdout"] or result.get("error", result["stderr"]),
    }


@mcp.tool()
def clean_agents(status: str = "done") -> dict:
    """Remove workspace directories for finished agents to free disk space.

    Args:
        status: Which agents to clean. Options:
                'done'   — completed successfully (default)
                'failed' — failed agents
                'killed' — killed agents
                'all'    — all non-running agents

    Returns:
        success: bool
        cleaned: number of workspaces removed
        message: details
    """
    args = ["clean"]
    if status != "done":
        args.append(status)
    result = _run_oa(*args)
    return {
        "success": result["success"],
        "message": result["stdout"] or result.get("error", result["stderr"]),
    }


# ===========================================================================
# CATEGORY 3: MESSAGING
# ===========================================================================

@mcp.tool()
def send_message(to: str, message: str, from_agent: str = "orchestrator") -> dict:
    """Send a direct message to an agent's inbox.

    Agents can read messages via oa inbox inside their tmux window. Use this
    to send instructions, corrections, or context to a running agent.

    Args:
        to: Recipient agent name.
        message: Message content. Be specific — agents act on these.
        from_agent: Sender name shown in recipient's inbox (default: 'orchestrator').

    Returns:
        success: bool
        message_path: path to written message file
    """
    try:
        path = _send_message(sender=from_agent, recipient=to, content=message)
        return {"success": True, "message_path": str(path), "to": to}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def send_feedback(
    to: str,
    feedback: str,
    from_agent: str = "orchestrator",
    wait_seconds: int = 0,
) -> dict:
    """Send improvement feedback to an agent, optionally waiting for updated output.

    Use after reviewing an agent's result.md that needs improvement. The feedback
    is injected into the agent's inbox as a correction request.

    Args:
        to: Agent name to send feedback to.
        feedback: Specific improvement instructions. Be concrete:
                  "The output is missing section X. Add it."
        from_agent: Sender name (default: 'orchestrator').
        wait_seconds: If > 0, poll for updated output up to this many seconds.
                      Set to 120+ for agents that need time to revise.

    Returns:
        success: bool
        feedback_sent: bool
        updated_output: new result.md content (if wait_seconds > 0 and agent responded)
    """
    try:
        path = _send_message(sender=from_agent, recipient=to, content=f"FEEDBACK:\n{feedback}")
        response = {"success": True, "feedback_sent": True, "message_path": str(path)}

        if wait_seconds > 0:
            # Poll for output update
            rec = get_agent(to)
            if rec:
                ws = Path(rec.workspace)
                output_path = ws / "output" / "result.md"
                if not output_path.exists():
                    output_path = ws / "result.md"

                original_mtime = output_path.stat().st_mtime if output_path.exists() else 0
                deadline = time.time() + wait_seconds

                while time.time() < deadline:
                    time.sleep(3)
                    if output_path.exists():
                        new_mtime = output_path.stat().st_mtime
                        if new_mtime > original_mtime:
                            response["updated_output"] = output_path.read_text(encoding="utf-8")
                            response["output_updated"] = True
                            break
                else:
                    response["output_updated"] = False
                    response["tip"] = f"No update after {wait_seconds}s. Agent may still be working."

        return response
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def broadcast(message: str, from_agent: str = "orchestrator", exclude: Optional[list] = None) -> dict:
    """Send a message to ALL running agents at once.

    Useful for session-wide announcements: "Priority changed", "Use new format",
    "Stop current work and report status."

    Args:
        message: Message content to broadcast.
        from_agent: Sender name (default: 'orchestrator').
        exclude: List of agent names to exclude from broadcast.

    Returns:
        success: bool
        delivered_to: list of agent names that received the message
        count: number of agents messaged
    """
    try:
        paths = _broadcast_message(
            sender=from_agent,
            content=message,
            exclude=exclude or [],
        )
        delivered = [p.parent.parent.name for p in paths]  # inbox/…/agent-name
        return {
            "success": True,
            "delivered_to": delivered,
            "count": len(delivered),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def read_inbox(name: str, unread_only: bool = True, mark_as_read: bool = True) -> dict:
    """Read messages from an agent's inbox.

    Args:
        name: Agent name whose inbox to read.
        unread_only: If True (default), only return unread messages.
        mark_as_read: If True (default), mark returned messages as read.

    Returns:
        success: bool
        messages: list of message dicts (id, from, content, sent_at)
        count: number of messages returned
        total_unread: remaining unread after this call
    """
    try:
        msgs = _read_inbox(name, unread_only=unread_only)
        if mark_as_read:
            _mark_read(name)
        remaining = _unread_count(name)
        return {
            "success": True,
            "messages": msgs,
            "count": len(msgs),
            "total_unread": remaining,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def inbox_summary() -> dict:
    """Get unread message counts for all agents with pending messages.

    Quick overview of which agents need attention. Use before deciding
    which agent to poll or respond to.

    Returns:
        success: bool
        agents_with_unread: list of {agent, unread_count} sorted by count desc
        total_unread: sum of all unread messages
    """
    all_agents = load_agents()
    result = []
    total = 0
    for name in all_agents:
        try:
            n = _unread_count(name)
            if n > 0:
                result.append({"agent": name, "unread": n})
                total += n
        except Exception:
            pass

    result.sort(key=lambda x: x["unread"], reverse=True)
    return {
        "success": True,
        "agents_with_unread": result,
        "total_unread": total,
    }


# ===========================================================================
# CATEGORY 4: PIPELINE
# ===========================================================================

@mcp.tool()
def spawn_pipeline(task: str, model: str = "claude/sonnet") -> dict:
    """Spawn a multi-agent pipeline: planner → parallel workers → combiner.

    Automatically decomposes the task, spawns worker agents in parallel,
    and combines their output. Best for tasks that can be parallelized.

    Args:
        task: High-level task description. The planner will decompose this
              into parallel sub-tasks for workers.
        model: Model for all agents in the pipeline (default: claude/sonnet).

    Returns:
        success: bool
        message: pipeline spawn output
        tip: how to monitor the pipeline
    """
    result = _run_oa("pipeline", task, "--model", model, timeout=30)
    return {
        "success": result["success"],
        "message": result["stdout"] or result.get("error", result["stderr"]),
        "tip": "Monitor with: list_agents() | Pipeline agents are prefixed with 'pipeline-'",
    }


@mcp.tool()
def quality_chain(agent_name: str) -> dict:
    """Run a quality chain on a completed agent: writer → reviewer → fixer.

    Spawns a reviewer agent to evaluate the output, then (if needed) a fixer
    agent to improve it. Ideal for QA-critical deliverables.

    Args:
        agent_name: Name of the completed agent whose output to review.

    Returns:
        success: bool
        message: quality chain spawn output
    """
    result = _run_oa("quality-chain", agent_name, timeout=30)
    return {
        "success": result["success"],
        "message": result["stdout"] or result.get("error", result["stderr"]),
    }


# ===========================================================================
# CATEGORY 5: TEAMS
# ===========================================================================

@mcp.tool()
def create_team(name: str, members: Optional[list] = None) -> dict:
    """Create a new agent team for coordinated work.

    Teams group agents for messaging and task assignment. Useful when
    multiple agents work on related tasks and need shared coordination.

    Args:
        name: Team name (e.g. 'frontend', 'research', 'sprint-30').
        members: Initial list of agent names to add. Can be added later.

    Returns:
        success: bool
        team: created team config
    """
    try:
        team = _create_team(name, members or [])
        return {"success": True, "team": team}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def list_teams() -> dict:
    """List all teams with their members and task counts.

    Returns:
        success: bool
        teams: list of team configs
        count: number of teams
    """
    try:
        teams = _list_teams()
        return {"success": True, "teams": teams, "count": len(teams)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def add_team_member(team: str, agent_name: str) -> dict:
    """Add an agent to a team.

    Args:
        team: Team name.
        agent_name: Agent to add.

    Returns:
        success: bool
        team: updated team config
    """
    try:
        updated = _add_member(team, agent_name)
        return {"success": True, "team": updated}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def delete_team(name: str) -> dict:
    """Delete a team (does not affect member agents).

    Args:
        name: Team name to delete.

    Returns:
        success: bool
    """
    try:
        ok = _delete_team(name)
        return {"success": ok, "deleted": name}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ===========================================================================
# CATEGORY 6: TASKS
# ===========================================================================

@mcp.tool()
def create_task(
    team: str,
    title: str,
    description: str = "",
    assign_to: Optional[str] = None,
    blocked_by: Optional[list] = None,
) -> dict:
    """Create a task in a team's task board.

    Tasks are the unit of work coordination between agents. An orchestrator
    creates tasks; worker agents claim and complete them.

    Args:
        team: Team name this task belongs to.
        title: Short task title (shown in list).
        description: Detailed task description for the agent that claims it.
        assign_to: Pre-assign to a specific agent name. Otherwise left for claim.
        blocked_by: List of task IDs that must be done first.

    Returns:
        success: bool
        task: created task dict with id, status, etc.
    """
    try:
        task = _create_task(
            team=team,
            title=title,
            description=description,
            assigned_to=assign_to,
            blocked_by=blocked_by or [],
        )
        return {"success": True, "task": task}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def list_tasks(team: str, status: Optional[str] = None) -> dict:
    """List tasks for a team, optionally filtered by status.

    Args:
        team: Team name.
        status: Filter by: 'todo', 'claimed', 'done', 'blocked'. Omit for all.

    Returns:
        success: bool
        tasks: list of task dicts
        count: number of tasks
        by_status: counts per status
    """
    try:
        tasks = _list_tasks(team)
        if status:
            tasks = [t for t in tasks if t.get("status") == status]

        by_status: dict = {}
        for t in tasks:
            s = t.get("status", "unknown")
            by_status[s] = by_status.get(s, 0) + 1

        return {
            "success": True,
            "tasks": tasks,
            "count": len(tasks),
            "by_status": by_status,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def claim_task(team: str, task_id: str, agent_name: str) -> dict:
    """Claim a task — marks it as in-progress by the given agent.

    Args:
        team: Team name.
        task_id: Task ID (from list_tasks).
        agent_name: Name of the agent claiming the task.

    Returns:
        success: bool
        task: updated task dict
    """
    try:
        task = _claim_task(team=team, task_id=task_id, agent=agent_name)
        return {"success": True, "task": task}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def complete_task(team: str, task_id: str) -> dict:
    """Mark a task as done.

    Args:
        team: Team name.
        task_id: Task ID to complete.

    Returns:
        success: bool
        task: updated task dict
    """
    try:
        task = _update_task(team=team, task_id=task_id, status="done")
        return {"success": True, "task": task}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ===========================================================================
# CATEGORY 7: LIBRARY & SKILLS
# ===========================================================================

@mcp.tool()
def list_templates(category: Optional[str] = None) -> dict:
    """List available agent templates from the agents/library/.

    Templates provide pre-built prompts for common agent roles. Use them
    via spawn_agent(template='template-id') to inject proven instructions.

    Args:
        category: Filter by category subfolder (e.g. 'research', 'code-dev',
                  'aec-blender'). Omit for all templates.

    Returns:
        success: bool
        templates: list of {id, name, category, model_hint, description}
        count: number of templates
    """
    result = _run_oa("templates", timeout=20)
    if not result["success"]:
        return {"success": False, "error": result.get("error", result["stderr"])}

    # Parse the output — templates command returns a table
    lines = result["stdout"].splitlines()
    templates = []
    for line in lines:
        if line.strip() and not line.startswith("─") and not line.startswith("Name"):
            parts = [p.strip() for p in line.split("│") if p.strip()]
            if len(parts) >= 2:
                templates.append({"id": parts[0], "description": parts[1] if len(parts) > 1 else ""})

    if category:
        templates = [t for t in templates if category.lower() in t.get("id", "").lower()]

    return {"success": True, "templates": templates, "count": len(templates)}


@mcp.tool()
def list_skills() -> dict:
    """List available oa skills and their descriptions.

    Skills are context-injection tools that load domain knowledge into agents.
    Pass skill names via spawn_agent(context_skills=['skill-name']).

    Returns:
        success: bool
        skills: list of {name, description, type}
        count: number of skills
    """
    result = _run_oa("skill", "list", timeout=15)
    return {
        "success": result["success"],
        "output": result["stdout"],
        "error": result.get("error", result["stderr"]) if not result["success"] else None,
    }


# ===========================================================================
# CATEGORY 8: CANVAS & META
# ===========================================================================

@mcp.tool()
def get_canvas() -> dict:
    """Get the full agent graph as nodes and edges for visualization.

    Returns a snapshot of the entire agent hierarchy: who spawned who,
    what each is doing, and connection relationships.

    Returns:
        success: bool
        nodes: list of agent nodes with {id, label, status, model, task_preview, depth}
        edges: list of {from, to} parent→child relationships
        stats: {total, running, done, failed, max_depth}
    """
    all_agents = load_agents()
    nodes = []
    edges = []
    max_depth = 0

    for name, rec in all_agents.items():
        depth = getattr(rec, "depth", 0)
        max_depth = max(max_depth, depth)
        task_preview = rec.task[:100] + "…" if len(rec.task) > 100 else rec.task
        nodes.append({
            "id": name,
            "label": name,
            "status": rec.status,
            "model": rec.model,
            "task_preview": task_preview,
            "depth": depth,
            "parent": rec.parent,
            "team": getattr(rec, "team", ""),
            "task_type": getattr(rec, "task_type", ""),
            "created_at": rec.created_at,
            "finished_at": rec.finished_at,
        })
        if rec.parent:
            edges.append({"from": rec.parent, "to": name})

    status_counts = {}
    for node in nodes:
        s = node["status"]
        status_counts[s] = status_counts.get(s, 0) + 1

    return {
        "success": True,
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total": len(nodes),
            "max_depth": max_depth,
            **status_counts,
        },
    }


@mcp.tool()
def get_config() -> dict:
    """Get the current oa configuration (from ~/.oa/config.json).

    Returns all config values including model defaults, timeout, depth limits,
    remote execution settings, and machine definitions.

    Returns:
        success: bool
        config: full config dict
        machines: list of configured remote machines
    """
    try:
        cfg = load_config()

        # Load machines separately
        from .config import load_machines_config
        machines = load_machines_config()

        return {
            "success": True,
            "config": cfg,
            "machines": machines,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def get_metrics() -> dict:
    """Get runtime statistics: agent counts, duration averages, model distribution.

    Use to understand system performance and agent behaviour patterns.

    Returns:
        success: bool
        total_agents: all-time agent count
        by_status: counts per status
        by_model: counts per model
        avg_duration_seconds: average completion time for 'done' agents
        success_rate: done / (done + failed) ratio
        recent_agents: last 5 agents sorted by creation time
    """
    all_agents = load_agents()
    records = list(all_agents.values())

    by_status: dict = {}
    by_model: dict = {}
    durations = []

    for rec in records:
        s = rec.status
        by_status[s] = by_status.get(s, 0) + 1
        m = rec.model or "unknown"
        by_model[m] = by_model.get(m, 0) + 1
        if rec.status == "done" and rec.created_at and rec.finished_at:
            durations.append(rec.finished_at - rec.created_at)

    done = by_status.get("done", 0)
    failed = by_status.get("failed", 0)
    success_rate = round(done / (done + failed), 2) if (done + failed) > 0 else None

    recent = sorted(records, key=lambda r: r.created_at or 0, reverse=True)[:5]

    return {
        "success": True,
        "total_agents": len(records),
        "by_status": by_status,
        "by_model": by_model,
        "avg_duration_seconds": round(sum(durations) / len(durations), 1) if durations else None,
        "success_rate": success_rate,
        "recent_agents": [
            {"name": r.name, "status": r.status, "model": r.model}
            for r in recent
        ],
    }


@mcp.tool()
def doctor() -> dict:
    """Run a full system health check on the oa environment.

    Checks: tmux session, claude CLI auth, Python version, oa binary,
    ~/.oa/ directory, agents.json integrity, and remote SSH connectivity.

    Returns:
        success: bool (True only if all checks pass)
        checks: list of {name, ok, message} per check
        summary: human-readable status line
    """
    result = _run_oa("doctor", timeout=30)
    return {
        "success": result["success"],
        "output": result["stdout"],
        "error": result.get("error", result["stderr"]) if not result["success"] else None,
    }


# ===========================================================================
# CATEGORY 9: HETZNER REMOTE SERVER
# ===========================================================================

def _ssh(host: str, cmd: str, timeout: int = 15) -> dict:
    """Run a command on a remote host via SSH."""
    try:
        result = subprocess.run(
            ["ssh", "-o", "ConnectTimeout=8", "-o", "BatchMode=yes", host, cmd],
            capture_output=True, text=True, timeout=timeout,
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "stdout": "", "stderr": f"SSH timeout after {timeout}s"}
    except Exception as e:
        return {"success": False, "stdout": "", "stderr": str(e)}


def _get_hetzner_host() -> Optional[str]:
    """Resolve default Hetzner host from machines.json."""
    try:
        from .config import load_machines_config, get_default_machine
        machine = get_default_machine()
        if machine:
            return machine.get("host") or machine.get("ssh_host")
    except Exception:
        pass
    return None


@mcp.tool()
def hetzner_status(host: Optional[str] = None) -> dict:
    """Check full health of the Hetzner remote agent server.

    Verifies SSH connectivity, GPU availability, Claude CLI authentication,
    Ollama service, disk space, and running oa agents on the remote.

    Args:
        host: SSH host string (e.g. 'oa@95.217.x.x'). Omit to use default from
              machines.json.

    Returns:
        success: bool (True if SSH connection works)
        ssh_ok: bool
        gpu: {name, vram_total_mb, vram_free_mb, vram_used_mb} or error
        claude_auth: bool — Claude CLI authenticated on remote?
        ollama_running: bool
        disk: {used_gb, free_gb, total_gb}
        oa_agents_running: number of oa agent processes on remote
        remote_host: which host was checked
    """
    h = host or _get_hetzner_host()
    if not h:
        return {"success": False, "error": "No Hetzner host configured. Set in ~/.oa/machines.json or pass host argument."}

    result = {"success": False, "remote_host": h}

    # SSH ping
    ping = _ssh(h, "echo pong", timeout=10)
    result["ssh_ok"] = ping["success"]
    if not ping["success"]:
        result["error"] = f"SSH failed: {ping['stderr']}"
        return result
    result["success"] = True

    # GPU via nvidia-smi
    gpu_r = _ssh(h, "nvidia-smi --query-gpu=name,memory.total,memory.free,memory.used --format=csv,noheader,nounits 2>/dev/null || echo NO_GPU")
    if gpu_r["success"] and "NO_GPU" not in gpu_r["stdout"] and gpu_r["stdout"]:
        parts = [p.strip() for p in gpu_r["stdout"].split(",")]
        if len(parts) >= 4:
            try:
                result["gpu"] = {
                    "name": parts[0],
                    "vram_total_mb": int(parts[1]),
                    "vram_free_mb": int(parts[2]),
                    "vram_used_mb": int(parts[3]),
                }
            except ValueError:
                result["gpu"] = {"raw": gpu_r["stdout"]}
        else:
            result["gpu"] = {"raw": gpu_r["stdout"]}
    else:
        result["gpu"] = {"available": False}

    # Claude CLI auth (use credentials.json presence as proxy)
    creds_r = _ssh(h, "test -f ~/.claude/.credentials.json && echo OK || echo MISSING")
    result["claude_credentials_synced"] = creds_r["stdout"] == "OK"

    # Claude CLI actual auth check
    auth_r = _ssh(h, "claude --version 2>/dev/null && echo CLAUDE_OK || echo CLAUDE_MISSING", timeout=10)
    result["claude_cli_installed"] = "CLAUDE_OK" in auth_r.get("stdout", "")

    # Ollama running
    ollama_r = _ssh(h, "curl -s http://localhost:11434/api/tags 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d.get(\"models\",[]))," + '"models"' + ")' 2>/dev/null || echo OLLAMA_DOWN")
    result["ollama_running"] = "OLLAMA_DOWN" not in ollama_r.get("stdout", "OLLAMA_DOWN")
    if result["ollama_running"]:
        result["ollama_info"] = ollama_r["stdout"]

    # Disk space
    disk_r = _ssh(h, "df -BG / | awk 'NR==2 {print $2,$3,$4}'")
    if disk_r["success"] and disk_r["stdout"]:
        parts = disk_r["stdout"].replace("G", "").split()
        if len(parts) == 3:
            try:
                result["disk"] = {
                    "total_gb": int(parts[0]),
                    "used_gb": int(parts[1]),
                    "free_gb": int(parts[2]),
                }
            except ValueError:
                result["disk"] = {"raw": disk_r["stdout"]}

    # Running oa agents
    agents_r = _ssh(h, "pgrep -c 'claude' 2>/dev/null || echo 0")
    try:
        result["claude_processes_running"] = int(agents_r["stdout"].strip())
    except ValueError:
        result["claude_processes_running"] = 0

    return result


@mcp.tool()
def hetzner_gpu_status(host: Optional[str] = None) -> dict:
    """Check GPU VRAM availability on Hetzner for model routing decisions.

    Use before spawning a large model to confirm enough VRAM is free.
    The Hetzner server has an RTX 4000 SFF Ada with 20GB VRAM.

    Args:
        host: SSH host. Omit to use default.

    Returns:
        success: bool
        vram_free_mb: free VRAM in MB
        vram_total_mb: total VRAM
        vram_used_mb: used VRAM
        utilization_pct: GPU utilization percentage
        models_loaded: list of Ollama models currently loaded
        can_fit: rough model fit suggestions based on free VRAM
    """
    h = host or _get_hetzner_host()
    if not h:
        return {"success": False, "error": "No Hetzner host configured."}

    # VRAM
    vram_r = _ssh(h, "nvidia-smi --query-gpu=memory.total,memory.free,memory.used,utilization.gpu --format=csv,noheader,nounits 2>/dev/null")
    if not vram_r["success"] or not vram_r["stdout"]:
        return {"success": False, "error": "nvidia-smi failed — GPU not available?"}

    parts = [p.strip() for p in vram_r["stdout"].split(",")]
    if len(parts) < 4:
        return {"success": False, "error": f"Unexpected nvidia-smi output: {vram_r['stdout']}"}

    try:
        total = int(parts[0])
        free = int(parts[1])
        used = int(parts[2])
        util = int(parts[3])
    except ValueError:
        return {"success": False, "error": f"Could not parse GPU stats: {parts}"}

    # Ollama loaded models
    models_r = _ssh(h, "curl -s http://localhost:11434/api/ps 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); [print(m['name']) for m in d.get('models',[])]\" 2>/dev/null")
    loaded_models = [l for l in models_r["stdout"].splitlines() if l] if models_r["success"] else []

    # Rough fit suggestions (VRAM in MB)
    can_fit = []
    vram_requirements = {
        "mistral:7b": 5000,
        "mistral-nemo": 8000,
        "codestral:22b": 14000,
        "mixtral:8x7b": 26000,  # needs offload if >20GB
        "olmo2:7b": 5000,
    }
    for model, req in vram_requirements.items():
        can_fit.append({
            "model": model,
            "required_mb": req,
            "fits": free >= req,
        })

    return {
        "success": True,
        "vram_total_mb": total,
        "vram_free_mb": free,
        "vram_used_mb": used,
        "utilization_pct": util,
        "models_loaded": loaded_models,
        "can_fit": can_fit,
    }


@mcp.tool()
def hetzner_sync_credentials(host: Optional[str] = None) -> dict:
    """Sync local Claude credentials to Hetzner so remote agents can authenticate.

    Copies ~/.claude/.credentials.json to the remote server via SCP.
    Run this at session start or after credentials expire (401 errors).

    The 401 authentication error on remote agents is caused by expired/missing
    credentials on the remote server. This is the fix.

    Args:
        host: SSH host (e.g. 'oa@95.217.x.x'). Omit to use default.

    Returns:
        success: bool
        message: result of SCP operation
        tip: how to verify auth on remote
    """
    h = host or _get_hetzner_host()
    if not h:
        return {"success": False, "error": "No Hetzner host configured."}

    # Use the sync script if available
    sync_script = Path.home() / "Documents" / "GitHub" / "Open-Agents" / "scripts" / "sync-claude-credentials.sh"
    # WSL path
    wsl_script = Path("/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/scripts/sync-claude-credentials.sh")

    if wsl_script.exists():
        try:
            result = subprocess.run(
                ["bash", str(wsl_script), h],
                capture_output=True, text=True, timeout=30,
            )
            return {
                "success": result.returncode == 0,
                "message": result.stdout.strip() or result.stderr.strip(),
                "tip": f"Verify with: hetzner_status(host='{h}')",
            }
        except Exception as e:
            pass  # Fall through to direct SCP

    # Direct SCP fallback
    creds_src = Path.home() / ".claude" / ".credentials.json"
    if not creds_src.exists():
        return {
            "success": False,
            "error": f"Local credentials not found at {creds_src}. Run 'claude auth login' locally first.",
        }

    try:
        result = subprocess.run(
            ["scp", str(creds_src), f"{h}:~/.claude/.credentials.json"],
            capture_output=True, text=True, timeout=30,
        )
        return {
            "success": result.returncode == 0,
            "message": result.stdout.strip() or (result.stderr.strip() if result.returncode != 0 else "Credentials synced successfully."),
            "tip": f"Verify auth with: hetzner_status(host='{h}')",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def hetzner_list_models(host: Optional[str] = None) -> dict:
    """List all Ollama models available on Hetzner GPU server.

    Use to know which models are ready to use without a download wait.
    Cross-reference with hetzner_gpu_status to pick the best model for
    available VRAM.

    Args:
        host: SSH host. Omit to use default.

    Returns:
        success: bool
        models: list of {name, size_gb, modified} available models
        count: number of models
        recommended: model routing suggestions per task type
    """
    h = host or _get_hetzner_host()
    if not h:
        return {"success": False, "error": "No Hetzner host configured."}

    models_r = _ssh(
        h,
        "curl -s http://localhost:11434/api/tags 2>/dev/null | python3 -c \""
        "import sys,json; d=json.load(sys.stdin); "
        "[print(m['name'],'|',round(m.get('size',0)/1e9,1),'|',m.get('modified_at','?')) "
        "for m in d.get('models',[])]\" 2>/dev/null || echo OLLAMA_DOWN",
        timeout=15,
    )

    if not models_r["success"] or "OLLAMA_DOWN" in models_r["stdout"]:
        return {"success": False, "error": "Ollama not running or unreachable on Hetzner."}

    models = []
    for line in models_r["stdout"].splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 2:
            try:
                models.append({
                    "name": parts[0],
                    "size_gb": float(parts[1]) if parts[1] else 0,
                    "modified": parts[2] if len(parts) > 2 else "?",
                    "oa_prefix": f"hetzner/{parts[0]}",
                })
            except ValueError:
                models.append({"name": parts[0], "raw": line})

    # Model routing recommendations
    recommended = {
        "text_analysis": "hetzner/mixtral:8x7b",
        "code_writing": "hetzner/codestral:22b",
        "long_context": "hetzner/mistral-nemo",
        "quick_tasks": "hetzner/mistral:7b",
        "open_source_strong": "hetzner/olmo2:7b",
    }
    # Filter to only recommend models that are actually available
    available_names = {m["name"] for m in models}
    recommended = {
        k: v for k, v in recommended.items()
        if v.replace("hetzner/", "") in available_names
    }

    return {
        "success": True,
        "models": models,
        "count": len(models),
        "recommended": recommended,
    }


@mcp.tool()
def hetzner_ssh_exec(command: str, host: Optional[str] = None, timeout: int = 30) -> dict:
    """Execute a shell command on the Hetzner server via SSH.

    Use for ad-hoc operations: checking logs, restarting services, inspecting
    agent workspaces, or running diagnostics.

    ⚠️ Commands run as the configured SSH user. Avoid destructive operations.

    Args:
        command: Shell command to execute on the remote server.
        host: SSH host. Omit to use default from machines.json.
        timeout: Max seconds to wait (default 30).

    Returns:
        success: bool
        stdout: command output
        stderr: error output
        returncode: exit code
    """
    h = host or _get_hetzner_host()
    if not h:
        return {"success": False, "error": "No Hetzner host configured."}

    result = _ssh(h, command, timeout=timeout)
    return {
        "success": result["success"],
        "stdout": result["stdout"],
        "stderr": result["stderr"],
        "remote_host": h,
    }


# ===========================================================================
# Entry point
# ===========================================================================

def main() -> None:
    """Entry point: run the MCP server (stdio transport for Claude Code)."""
    mcp.run()


if __name__ == "__main__":
    main()
