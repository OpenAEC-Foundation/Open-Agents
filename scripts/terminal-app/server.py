#!/usr/bin/env python3
"""Multi-terminal web dashboard — FastAPI + tmux + WebSocket."""

import asyncio
import os
import subprocess
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

app = FastAPI()

TMUX_SESSION = "oa"
terminals: dict[str, dict] = {}  # id -> {type, name}


def _tmux(*args: str) -> str:
    """Run a tmux command and return stdout."""
    result = subprocess.run(
        ["tmux"] + list(args),
        capture_output=True, text=True, timeout=5,
    )
    return result.stdout


def _ensure_session():
    """Ensure the tmux session exists."""
    result = subprocess.run(
        ["tmux", "has-session", "-t", TMUX_SESSION],
        capture_output=True, timeout=5,
    )
    if result.returncode != 0:
        subprocess.run(
            ["tmux", "new-session", "-d", "-s", TMUX_SESSION],
            capture_output=True, timeout=5,
        )


@app.get("/")
async def index():
    return FileResponse(
        os.path.join(os.path.dirname(__file__), "index.html"),
        media_type="text/html",
    )


@app.get("/api/terminals")
async def list_terminals():
    return JSONResponse(
        [{"id": tid, **info} for tid, info in terminals.items()]
    )


@app.post("/api/terminals")
async def create_terminal(cmd_type: str = "bash"):
    _ensure_session()
    tid = uuid.uuid4().hex[:8]
    window_name = f"terminal-{tid}"

    if cmd_type == "claude":
        shell_cmd = "claude"
    else:
        shell_cmd = "bash"
        cmd_type = "bash"

    _tmux("new-window", "-t", f"{TMUX_SESSION}:", "-n", window_name, shell_cmd)
    terminals[tid] = {"type": cmd_type, "name": window_name}
    return JSONResponse({"id": tid, "type": cmd_type, "name": window_name})


@app.delete("/api/terminals/{terminal_id}")
async def kill_terminal(terminal_id: str):
    info = terminals.pop(terminal_id, None)
    if info:
        _tmux("kill-window", "-t", f"{TMUX_SESSION}:{info['name']}")
        return JSONResponse({"status": "killed", "id": terminal_id})
    return JSONResponse({"status": "not_found"}, status_code=404)


@app.websocket("/ws/{terminal_id}")
async def ws_terminal(websocket: WebSocket, terminal_id: str):
    await websocket.accept()

    info = terminals.get(terminal_id)
    if not info:
        await websocket.close(code=1008, reason="Terminal not found")
        return

    target = f"{TMUX_SESSION}:{info['name']}"
    last_content = ""

    async def read_loop():
        """Poll tmux capture-pane and send diffs to the browser."""
        nonlocal last_content
        while True:
            try:
                result = subprocess.run(
                    ["tmux", "capture-pane", "-t", target, "-p", "-S", "-500"],
                    capture_output=True, text=True, timeout=5,
                )
                content = result.stdout
                if content != last_content:
                    last_content = content
                    await websocket.send_json({"type": "output", "data": content})
                await asyncio.sleep(0.15)
            except Exception:
                break

    async def write_loop():
        """Receive input from browser and send to tmux."""
        try:
            while True:
                msg = await websocket.receive_json()
                if msg.get("type") == "input":
                    data = msg["data"]
                    # send-keys with literal flag for special chars
                    _tmux("send-keys", "-t", target, "-l", data)
                elif msg.get("type") == "special":
                    # Non-literal keys like Enter, C-c, etc.
                    _tmux("send-keys", "-t", target, msg["key"])
        except WebSocketDisconnect:
            pass
        except Exception:
            pass

    read_task = asyncio.create_task(read_loop())
    write_task = asyncio.create_task(write_loop())

    done, pending = await asyncio.wait(
        [read_task, write_task], return_when=asyncio.FIRST_COMPLETED
    )
    for task in pending:
        task.cancel()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7127)
