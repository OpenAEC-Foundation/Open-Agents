"""Node Daemon — persistent agent node that polls inbox and board, forwards responses.

Usage:
    python -m open_agents.node_daemon <name> [--system "system prompt"] [--category researcher]

A node is a long-running process that:
- Creates ~/.oa/nodes/<name>/ with inbox/, history.json, connections.json, system.txt
- Polls inbox/ every 2s for incoming .msg files (JSON protocol)
- Per message: loads history → builds prompt (Human/Assistant format) → claude -p → saves response
- Forwards response to all connected nodes AND answers board questions
- Polls ~/.oa/board/<category>/ if registered with a category
- Prints live status to stdout
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from threading import Lock

NODE_BASE = Path.home() / ".oa" / "nodes"
BOARD_BASE = Path.home() / ".oa" / "board"
HISTORY_MAX = 50
POLL_INTERVAL = 2  # seconds
_inbox_lock = Lock()
_board_lock = Lock()


def _atomic_write(path: Path, content: str) -> None:
    """Write content atomically: write to tmp file, then os.replace."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=str(path.parent), suffix=".tmp", prefix=".atomic_"
    )
    try:
        with os.fdopen(tmp_fd, "w") as f:
            f.write(content)
        os.replace(tmp_path, str(path))
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def node_dir(name: str) -> Path:
    """Return the directory for a given node."""
    return NODE_BASE / name


def ensure_node_dir(name: str) -> Path:
    """Create and return the node directory structure."""
    d = node_dir(name)
    d.mkdir(parents=True, exist_ok=True)
    (d / "inbox").mkdir(exist_ok=True)
    if not (d / "history.json").exists():
        (d / "history.json").write_text("[]")
    if not (d / "connections.json").exists():
        (d / "connections.json").write_text("[]")
    return d


def load_history(d: Path) -> list[dict]:
    """Load conversation history from disk."""
    try:
        return json.loads((d / "history.json").read_text())
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def save_history(d: Path, history: list[dict]) -> None:
    """Save conversation history, truncating to HISTORY_MAX."""
    if len(history) > HISTORY_MAX:
        history = history[-HISTORY_MAX:]
    _atomic_write(d / "history.json", json.dumps(history, indent=2))


def load_connections(d: Path) -> list[str]:
    """Load connected node names."""
    try:
        return json.loads((d / "connections.json").read_text())
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def build_prompt(system_prompt: str, history: list[dict], new_message: dict) -> str:
    """Build a full prompt string from history and new message for claude -p."""
    parts = []
    if system_prompt:
        parts.append(f"System: {system_prompt}\n")

    for entry in history:
        role = entry.get("role", "unknown")
        content = entry.get("content", "")
        sender = entry.get("from", "")
        if role == "human":
            prefix = f"[{sender}] " if sender else ""
            parts.append(f"Human: {prefix}{content}")
        elif role == "assistant":
            parts.append(f"Assistant: {content}")

    # Add the new message
    sender = new_message.get("from", "unknown")
    parts.append(f"Human: [{sender}] {new_message['content']}")
    parts.append("Assistant:")

    return "\n\n".join(parts)


def call_claude(prompt: str) -> str:
    """Call claude -p with the given prompt. Returns response or error string."""
    try:
        result = subprocess.run(
            ["claude", "-p", prompt],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return f"[ERROR] claude exited {result.returncode}: {result.stderr.strip()}"
    except subprocess.TimeoutExpired:
        return "[ERROR] claude -p timed out after 120s"
    except FileNotFoundError:
        return "[ERROR] claude command not found"
    except Exception as e:
        return f"[ERROR] {e}"


MAX_HOPS = 3  # prevent infinite loops between nodes


def forward_to_connections(name: str, connections: list[str], response: str, hops: int = 0, discuss: int = 0) -> None:
    """Write the response as a .msg file to each connected node's inbox."""
    ts = int(time.time() * 1000)
    for conn in connections:
        inbox = NODE_BASE / conn / "inbox"
        if not inbox.exists():
            continue
        msg = {
            "from": name,
            "content": response,
            "type": "response",
            "timestamp": ts,
            "hops": hops + 1,
            "discuss": discuss,
        }
        msg_file = inbox / f"{name}_{ts}.msg"
        _atomic_write(msg_file, json.dumps(msg))


def answer_board_question(name: str, question_file: Path, response: str) -> None:
    """Write a response to a board question back to the questioner's inbox."""
    try:
        question = json.loads(question_file.read_text())
    except (json.JSONDecodeError, OSError):
        return

    sender = question.get("from", "")
    if not sender:
        return

    ts = int(time.time() * 1000)
    answer = {
        "from": name,
        "content": response,
        "type": "answer",
        "in_reply_to": question.get("id", str(question_file.name)),
        "timestamp": ts,
    }

    # Write answer to the questioner's inbox (try node inbox first, then messages)
    node_inbox = NODE_BASE / sender / "inbox"
    msg_inbox = Path.home() / ".oa" / "messages" / sender / "inbox"

    for inbox in [node_inbox, msg_inbox]:
        if inbox.exists():
            _atomic_write(inbox / f"{name}_{ts}.msg", json.dumps(answer))
            break
    else:
        # Create node inbox as fallback
        node_inbox.mkdir(parents=True, exist_ok=True)
        _atomic_write(node_inbox / f"{name}_{ts}.msg", json.dumps(answer))


def _parse_msg(msg_file: Path) -> dict | None:
    """Parse a .msg file. Supports both JSON format and plain text + .from file."""
    try:
        raw = msg_file.read_text().strip()
        # Try JSON first
        if raw.startswith("{"):
            return json.loads(raw)
        # Plain text format: content in .msg, sender in .from
        from_file = msg_file.with_suffix(".from")
        sender = "unknown"
        if from_file.exists():
            sender = from_file.read_text().strip()
            try:
                from_file.unlink()
            except OSError:
                pass
        return {
            "from": sender,
            "content": raw,
            "type": "message",
            "timestamp": int(time.time() * 1000),
        }
    except (json.JSONDecodeError, OSError):
        return None


def poll_inbox(d: Path) -> list[dict]:
    """Read and remove all .msg files from the inbox, sorted by filename (timestamp)."""
    inbox = d / "inbox"
    messages = []
    with _inbox_lock:
        for f in sorted(inbox.glob("*.msg")):
            msg = _parse_msg(f)
            if msg:
                messages.append(msg)
            try:
                f.unlink()
            except OSError:
                pass
    return messages


def poll_board(category: str, name: str) -> list[tuple[dict, Path]]:
    """Poll the board for unanswered questions in this node's category.

    Returns list of (message_dict, file_path) tuples.
    Only picks up questions not already claimed by this node.
    """
    board_dir = BOARD_BASE / category
    if not board_dir.exists():
        return []

    results = []
    with _board_lock:
        for f in sorted(board_dir.glob("*.msg")):
            try:
                msg = json.loads(f.read_text())
            except (json.JSONDecodeError, OSError):
                continue

            # Skip if this node posted it
            if msg.get("from") == name:
                continue

            # Skip if already claimed (claim file exists for this node)
            claim_file = f.with_suffix(f".claimed_by_{name}")
            if claim_file.exists():
                continue

            # Only handle questions
            if msg.get("type") != "question":
                continue

            # Claim it
            try:
                claim_file.write_text(str(int(time.time())))
            except OSError:
                continue

            results.append((msg, f))

    return results


def register_on_board(name: str, category: str) -> None:
    """Register this node on the board for a category."""
    board_dir = BOARD_BASE / category
    board_dir.mkdir(parents=True, exist_ok=True)
    reg_file = board_dir / f"_node_{name}.reg"
    reg = {
        "node": name,
        "category": category,
        "registered_at": time.time(),
        "pid": os.getpid(),
    }
    _atomic_write(reg_file, json.dumps(reg, indent=2))


def unregister_from_board(name: str, category: str) -> None:
    """Remove node registration from board."""
    reg_file = BOARD_BASE / category / f"_node_{name}.reg"
    try:
        reg_file.unlink()
    except OSError:
        pass


def write_pid(d: Path) -> None:
    """Write current PID to node directory."""
    (d / "pid").write_text(str(os.getpid()))


def write_status(d: Path, status: str) -> None:
    """Write node status."""
    (d / "status").write_text(status)


def _status_line(name: str, d: Path, category: str, msg_count: int, uptime_start: float) -> str:
    """Build a live status line."""
    uptime = int(time.time() - uptime_start)
    h, remainder = divmod(uptime, 3600)
    m, s = divmod(remainder, 60)
    uptime_str = f"{h:02d}:{m:02d}:{s:02d}"

    connections = load_connections(d)
    inbox_count = len(list((d / "inbox").glob("*.msg")))

    parts = [
        f"[node-{name}]",
        f"up={uptime_str}",
        f"msgs={msg_count}",
        f"inbox={inbox_count}",
        f"conns={len(connections)}",
    ]
    if category:
        parts.append(f"board={category}")
    return " | ".join(parts)


def run_node(name: str, system_prompt: str = "", category: str = "") -> None:
    """Main loop for a node daemon."""
    d = ensure_node_dir(name)
    write_pid(d)
    write_status(d, "running")
    uptime_start = time.time()
    msg_count = 0

    # Save system prompt for reference
    if system_prompt:
        _atomic_write(d / "system.txt", system_prompt)

    # Register on board if category specified
    if category:
        register_on_board(name, category)

    print(f"[node-{name}] Started (pid={os.getpid()})")
    print(f"[node-{name}] Inbox: {d / 'inbox'}")
    print(f"[node-{name}] System: {system_prompt[:80] or '(none)'}")
    if category:
        print(f"[node-{name}] Board category: {category}")
    print(f"[node-{name}] Polling every {POLL_INTERVAL}s...")
    print()

    try:
        while True:
            # Poll inbox for direct messages
            messages = poll_inbox(d)

            # Poll board for questions (if registered)
            board_questions: list[tuple[dict, Path]] = []
            if category:
                board_questions = poll_board(category, name)

            if not messages and not board_questions:
                # Print status line (overwrite)
                status = _status_line(name, d, category, msg_count, uptime_start)
                sys.stdout.write(f"\r{status}  ")
                sys.stdout.flush()
                time.sleep(POLL_INTERVAL)
                continue

            # Clear the status line
            sys.stdout.write("\r" + " " * 120 + "\r")

            history = load_history(d)
            connections = load_connections(d)

            # Process inbox messages
            for msg in messages:
                msg_count += 1
                sender = msg.get("from", "?")
                content = msg.get("content", "")
                msg_type = msg.get("type", "message")

                print(f"[node-{name}] #{msg_count} from={sender} type={msg_type}")
                print(f"  > {content[:120]}")

                # Add incoming message to history
                history.append({
                    "role": "human",
                    "content": content,
                    "from": sender,
                    "timestamp": msg.get("timestamp", int(time.time() * 1000)),
                })

                # Build prompt and call claude
                prompt = build_prompt(system_prompt, history[:-1], msg)
                response = call_claude(prompt)

                print(f"  < {response[:120]}")

                # Add response to history
                history.append({
                    "role": "assistant",
                    "content": response,
                    "from": name,
                    "timestamp": int(time.time() * 1000),
                })

                # Save history after each exchange
                save_history(d, history)

                # Forward response to connected nodes only when discuss mode is on
                discuss = msg.get("discuss", 0)  # number of allowed inter-node hops
                current_hops = msg.get("hops", 0)
                if connections and discuss > 0 and current_hops < discuss:
                    forward_to_connections(name, connections, response, hops=current_hops, discuss=discuss)
                    print(f"  -> discussing with: {', '.join(connections)} (hop {current_hops+1}/{discuss})")
                else:
                    # Reply directly back to sender instead
                    if sender != name:
                        sender_inbox = NODE_BASE / sender / "inbox"
                        if sender_inbox.exists():
                            ts = int(time.time() * 1000)
                            reply = {
                                "from": name,
                                "content": response,
                                "type": "response",
                                "timestamp": ts,
                                "discuss": 0,
                                "hops": 0,
                            }
                            _atomic_write(sender_inbox / f"{name}_{ts}.msg", json.dumps(reply))
                            print(f"  -> replied to: {sender}")

                # If this was a question type, also answer back to sender
                if msg_type == "question":
                    ts = int(time.time() * 1000)
                    answer = {
                        "from": name,
                        "content": response,
                        "type": "answer",
                        "in_reply_to": msg.get("id", ""),
                        "timestamp": ts,
                    }
                    sender_inbox = NODE_BASE / sender / "inbox"
                    if sender_inbox.exists():
                        _atomic_write(
                            sender_inbox / f"{name}_{ts}.msg",
                            json.dumps(answer),
                        )
                        print(f"  -> answered question back to {sender}")

            # Process board questions
            for question, q_file in board_questions:
                msg_count += 1
                sender = question.get("from", "?")
                content = question.get("content", "")

                print(f"[node-{name}] #{msg_count} BOARD from={sender}")
                print(f"  > {content[:120]}")

                # Build prompt with board context
                board_msg = {
                    "from": sender,
                    "content": f"[BOARD/{category}] {content}",
                }
                prompt = build_prompt(system_prompt, history, board_msg)
                response = call_claude(prompt)

                print(f"  < {response[:120]}")

                # Add to history
                history.append({
                    "role": "human",
                    "content": f"[BOARD/{category}] {content}",
                    "from": sender,
                    "timestamp": question.get("timestamp", int(time.time() * 1000)),
                })
                history.append({
                    "role": "assistant",
                    "content": response,
                    "from": name,
                    "timestamp": int(time.time() * 1000),
                })
                save_history(d, history)

                # Answer back to the questioner
                answer_board_question(name, q_file, response)
                print(f"  -> board answer sent to {sender}")

            print()

    except KeyboardInterrupt:
        print(f"\n[node-{name}] Shutting down.")
    finally:
        write_status(d, "stopped")
        if category:
            unregister_from_board(name, category)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run an OA node daemon")
    parser.add_argument("name", help="Node name")
    parser.add_argument("--system", default="", help="System prompt for this node")
    parser.add_argument(
        "--category", default="", help="Board category to subscribe to (e.g. researcher)"
    )
    args = parser.parse_args()
    run_node(args.name, args.system, args.category)


if __name__ == "__main__":
    main()
