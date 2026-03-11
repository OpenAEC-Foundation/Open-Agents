"""MCP Server — exposes oa-cli agent management as MCP tools for Claude Code."""

from __future__ import annotations

import json
import subprocess
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from mcp.server.fastmcp import FastMCP

from .state import load_agents, get_agent
from .messaging import send_message as _send_message

mcp = FastMCP("open-agents")

OA_BIN = "oa"


def _run_oa(*args: str, timeout: int = 30) -> dict:
    """Run oa CLI command and return stdout/stderr as dict."""
    cmd = [OA_BIN, *args]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "returncode": result.returncode,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "success": result.returncode == 0,
        }
    except subprocess.TimeoutExpired:
        return {"returncode": -1, "stdout": "", "stderr": "Timeout expired", "success": False}
    except FileNotFoundError:
        return {"returncode": -1, "stdout": "", "stderr": f"'{OA_BIN}' not found in PATH", "success": False}


@mcp.tool()
def create_agent(task: str, name: str, model: str = "claude/sonnet") -> dict:
    """Spawn a new oa-cli agent with the given task, name, and model.

    Args:
        task: The task description for the agent.
        name: Unique name for the agent.
        model: Model to use, e.g. 'claude/sonnet', 'claude/opus', 'claude/haiku'.

    Returns:
        dict with success status and output from oa run.
    """
    result = _run_oa("run", task, "--name", name, "--model", model, "--direct")
    return result


@mcp.tool()
def list_agents(status_filter: str = "all") -> dict:
    """List all agents, optionally filtered by status.

    Args:
        status_filter: Filter by status: 'all', 'running', 'done', 'failed', 'killed'.

    Returns:
        dict with 'agents' list of agent records.
    """
    agents = load_agents()
    records = list(agents.values())

    if status_filter != "all":
        records = [r for r in records if r.status == status_filter]

    return {
        "count": len(records),
        "agents": [asdict(r) for r in records],
    }


@mcp.tool()
def get_agent_status(name: str) -> dict:
    """Get status and details for a single agent by name.

    Args:
        name: The agent name to look up.

    Returns:
        dict with agent record, or error if not found.
    """
    agent = get_agent(name)
    if agent is None:
        return {"error": f"Agent '{name}' not found", "found": False}
    return {"found": True, "agent": asdict(agent)}


@mcp.tool()
def collect_output(name: str) -> dict:
    """Read the output/result.md from a completed agent's workspace.

    Args:
        name: The agent name whose output to collect.

    Returns:
        dict with 'content' of result.md, or error if not found.
    """
    agent = get_agent(name)
    if agent is None:
        return {"error": f"Agent '{name}' not found", "found": False}

    workspace = Path(agent.workspace)

    # Try output/result.md first, then result.md at workspace root
    candidates = [
        workspace / "output" / "result.md",
        workspace / "result.md",
    ]

    # Also check output_file if set
    if agent.output_file:
        candidates.insert(0, Path(agent.output_file))

    for path in candidates:
        if path.exists():
            try:
                content = path.read_text(encoding="utf-8")
                return {"found": True, "path": str(path), "content": content}
            except OSError as e:
                return {"error": str(e), "found": False}

    return {
        "found": False,
        "error": f"No result.md found in {workspace}",
        "workspace": str(workspace),
        "status": agent.status,
    }


@mcp.tool()
def kill_agent(name: str) -> dict:
    """Kill a running agent by name.

    Args:
        name: The agent name to kill.

    Returns:
        dict with success status and output from oa kill.
    """
    result = _run_oa("kill", name)
    return result


@mcp.tool()
def send_message(to: str, message: str, from_agent: str = "mcp") -> dict:
    """Send an inter-agent message to a named agent.

    Args:
        to: Recipient agent name.
        message: Message content to send.
        from_agent: Sender identity (default: 'mcp').

    Returns:
        dict with success status and path of written message.
    """
    try:
        path = _send_message(
            sender=from_agent,
            recipient=to,
            content=message,
        )
        return {"success": True, "message_path": str(path)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def get_canvas_state() -> dict:
    """Get the current agent canvas state: all agents as nodes with their relationships.

    Returns:
        dict with 'nodes' (agent records) and 'edges' (parent→child relationships).
    """
    agents = load_agents()
    nodes = []
    edges = []

    for name, rec in agents.items():
        nodes.append({
            "id": name,
            "label": name,
            "status": rec.status,
            "model": rec.model,
            "task_preview": rec.task[:80] + "..." if len(rec.task) > 80 else rec.task,
            "depth": rec.depth,
            "parent": rec.parent,
            "created_at": rec.created_at,
            "finished_at": rec.finished_at,
        })
        if rec.parent:
            edges.append({"from": rec.parent, "to": name})

    running = [n for n in nodes if n["status"] == "running"]
    done = [n for n in nodes if n["status"] == "done"]

    return {
        "total": len(nodes),
        "running": len(running),
        "done": len(done),
        "nodes": nodes,
        "edges": edges,
    }


@mcp.tool()
def compact_agents(dry_run: bool = False) -> dict:
    """Check and trigger context compaction for running agents above threshold.

    Args:
        dry_run: If True, only report what would be compacted without triggering.

    Returns:
        dict with 'results' list per agent and count of compacted agents.
    """
    try:
        from .compaction import check_and_compact_all
        results = check_and_compact_all(dry_run=dry_run)
        compacted = [r for r in results if r["action"] == "compacted"]
        return {
            "success": True,
            "compacted": len(compacted),
            "results": results,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def main() -> None:
    """Entry point for running the MCP server."""
    mcp.run()


if __name__ == "__main__":
    main()
