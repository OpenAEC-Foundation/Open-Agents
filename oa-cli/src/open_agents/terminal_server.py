"""WebSocket PTY terminal server integrated with Flask via flask-sock.

Each WebSocket connection gets its own bash PTY session.
Messages:
  browser -> server: JSON {type: 'input', data: '<keystrokes>'}
                     JSON {type: 'resize', cols: N, rows: N}
                     JSON {type: 'close'}
  server -> browser: raw terminal output (bytes decoded as UTF-8)
"""

from __future__ import annotations

import json
import threading

try:
    from flask_sock import Sock
    _sock_ok = True
except ImportError:
    _sock_ok = False

try:
    import ptyprocess
    _pty_ok = True
except ImportError:
    _pty_ok = False


def register_terminal_routes(app) -> bool:
    """Register /ws/terminal WebSocket route on the Flask app.

    Returns True if registration succeeded, False if dependencies are missing.
    """
    if not _sock_ok or not _pty_ok:
        print(
            "[terminal] WARNING: flask-sock or ptyprocess not installed. "
            "Interactive terminal disabled. Run: pip install flask-sock ptyprocess"
        )
        return False

    sock = Sock(app)

    @sock.route("/ws/terminal")
    def ws_terminal(ws):
        """Handle one interactive PTY terminal session per WebSocket connection."""
        proc = None
        try:
            # Spawn a bash shell in a PTY
            proc = ptyprocess.PtyProcess.spawn(
                ["/bin/bash"],
                env=_clean_env(),
                dimensions=(24, 80),
            )
        except Exception as exc:
            _safe_send(ws, f"[terminal] Failed to spawn shell: {exc}\r\n")
            return

        # Background thread: PTY stdout → WebSocket
        def _pty_reader():
            try:
                while proc.isalive():
                    try:
                        data = proc.read(4096)
                        if data:
                            _safe_send(ws, data.decode("utf-8", errors="replace"))
                    except EOFError:
                        break
                    except Exception:
                        break
            finally:
                _safe_close(ws)

        reader = threading.Thread(target=_pty_reader, daemon=True)
        reader.start()

        # Main loop: WebSocket → PTY stdin
        try:
            while True:
                msg = ws.receive()
                if msg is None:
                    break
                _handle_message(proc, msg)
        except Exception:
            pass
        finally:
            _kill_proc(proc)

    return True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _handle_message(proc, msg: str | bytes) -> None:
    """Parse and dispatch a message from the browser."""
    try:
        data = json.loads(msg)
        msg_type = data.get("type")
        if msg_type == "input":
            raw = data.get("data", "")
            if raw:
                proc.write(raw.encode("utf-8"))
        elif msg_type == "resize":
            rows = int(data.get("rows", 24))
            cols = int(data.get("cols", 80))
            proc.setwinsize(rows, cols)
        elif msg_type == "close":
            _kill_proc(proc)
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        # Treat raw string as direct input (fallback)
        if isinstance(msg, str):
            proc.write(msg.encode("utf-8"))
        elif isinstance(msg, bytes):
            proc.write(msg)


def _safe_send(ws, data: str) -> None:
    try:
        ws.send(data)
    except Exception:
        pass


def _safe_close(ws) -> None:
    try:
        ws.close()
    except Exception:
        pass


def _kill_proc(proc) -> None:
    try:
        if proc and proc.isalive():
            proc.terminate(force=True)
    except Exception:
        pass


def _clean_env() -> dict:
    """Return a minimal environment for the shell."""
    import os
    env = dict(os.environ)
    env.setdefault("TERM", "xterm-256color")
    env.setdefault("LANG", "en_US.UTF-8")
    return env
