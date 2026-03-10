"""Cross-platform desktop notifications (WSL2 → Windows toast, Linux → notify-send)."""

import os
import shutil
import subprocess
import sys


def send_notification(title: str, message: str) -> bool:
    """Send a desktop notification. Returns True if sent, False otherwise.

    Respects OA_SILENT=1 env var. Fails silently if tools are unavailable.
    """
    if os.environ.get("OA_SILENT") == "1":
        return False

    if sys.platform != "linux":
        return False

    try:
        ps = shutil.which("powershell.exe")
        if ps:  # WSL2: send Windows toast via BurntToast
            safe_title = title.replace("'", "''")
            safe_msg = message.replace("'", "''")
            subprocess.Popen(
                [ps, "-Command", f"New-BurntToastNotification -Text '{safe_title}', '{safe_msg}'"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return True

        ns = shutil.which("notify-send")
        if ns:  # Native Linux with display server
            subprocess.Popen(
                [ns, title, message],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return True
    except Exception:
        pass  # Fail silently

    return False
