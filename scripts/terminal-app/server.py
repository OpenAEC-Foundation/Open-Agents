#!/usr/bin/env python3
"""Multi-terminal web dashboard — FastAPI + real PTY per terminal."""

import asyncio
import fcntl
import json
import os
import pty
import signal
import struct
import termios
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

app = FastAPI()

# { terminal_id: { pid, master_fd, type } }
terminals: dict[str, dict] = {}


def _set_winsize(fd: int, rows: int, cols: int) -> None:
    try:
        winsize = struct.pack("HHHH", rows, cols, 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
    except Exception:
        pass


def _spawn(cmd: str, rows: int = 50, cols: int = 220) -> tuple[int, int]:
    """Spawn cmd in a new PTY. Returns (pid, master_fd)."""
    master_fd, slave_fd = pty.openpty()
    _set_winsize(master_fd, rows, cols)

    pid = os.fork()
    if pid == 0:
        # Child: set up slave as controlling terminal
        os.close(master_fd)
        os.setsid()
        fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
        for fd in (0, 1, 2):
            os.dup2(slave_fd, fd)
        os.close(slave_fd)
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        os.execvpe("bash", ["bash", "-c", cmd], env)
        os._exit(1)
    else:
        os.close(slave_fd)
        # Make master_fd non-blocking
        fl = fcntl.fcntl(master_fd, fcntl.F_GETFL)
        fcntl.fcntl(master_fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)
        return pid, master_fd


@app.get("/")
async def index():
    return FileResponse(
        os.path.join(os.path.dirname(__file__), "index.html"),
        media_type="text/html",
    )


@app.get("/api/terminals")
async def list_terminals():
    return JSONResponse([
        {"id": tid, "type": info["type"]}
        for tid, info in terminals.items()
    ])


@app.post("/api/terminals")
async def create_terminal(cmd_type: str = "bash", rows: int = 50, cols: int = 220):
    tid = uuid.uuid4().hex[:8]

    if cmd_type == "claude":
        cmd = "claude --dangerously-skip-permissions"
    else:
        cmd = "bash"
        cmd_type = "bash"

    pid, master_fd = _spawn(cmd, rows=rows, cols=cols)
    terminals[tid] = {"pid": pid, "master_fd": master_fd, "type": cmd_type}
    return JSONResponse({"id": tid, "type": cmd_type})


@app.delete("/api/terminals/{terminal_id}")
async def kill_terminal(terminal_id: str):
    info = terminals.pop(terminal_id, None)
    if info:
        try:
            os.kill(info["pid"], signal.SIGKILL)
        except ProcessLookupError:
            pass
        try:
            os.close(info["master_fd"])
        except OSError:
            pass
        return JSONResponse({"status": "killed"})
    return JSONResponse({"status": "not_found"}, status_code=404)


@app.websocket("/ws/{terminal_id}")
async def ws_terminal(websocket: WebSocket, terminal_id: str):
    await websocket.accept()

    info = terminals.get(terminal_id)
    if not info:
        await websocket.close(code=1008, reason="Terminal not found")
        return

    master_fd = info["master_fd"]
    loop = asyncio.get_event_loop()

    async def pty_to_ws():
        """Read bytes from PTY master → send to browser."""
        try:
            while True:
                await asyncio.sleep(0.02)
                try:
                    data = os.read(master_fd, 4096)
                    if data:
                        await websocket.send_bytes(data)
                except BlockingIOError:
                    pass
                except OSError:
                    break
        except Exception:
            pass

    async def ws_to_pty():
        """Read input from browser → write to PTY master."""
        try:
            while True:
                msg = await websocket.receive()
                if "bytes" in msg:
                    os.write(master_fd, msg["bytes"])
                elif "text" in msg:
                    data = json.loads(msg["text"])
                    if data.get("type") == "resize":
                        _set_winsize(master_fd, data["rows"], data["cols"])
                    elif data.get("type") == "input":
                        os.write(master_fd, data["data"].encode())
        except WebSocketDisconnect:
            pass
        except Exception:
            pass

    r = asyncio.create_task(pty_to_ws())
    w = asyncio.create_task(ws_to_pty())
    done, pending = await asyncio.wait([r, w], return_when=asyncio.FIRST_COMPLETED)
    for t in pending:
        t.cancel()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7127)
