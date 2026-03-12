#!/usr/bin/env python3
"""
claude-auth-headless.py — Automatische Claude CLI OAuth refresh.

Flow:
  1. Start `claude auth login` op remote server → vang OAuth URL op
  2. Open URL automatisch in Windows browser (explorer.exe)
  3. Gebruiker klikt Authorize (1 klik — al ingelogd op claude.ai)
  4. Poll server tot loggedIn: true

Gebruik:
  python3 scripts/claude-auth-headless.py [ssh-host]
  python3 scripts/claude-auth-headless.py hetzner-agent

Geen extra dependencies nodig (alleen standaard Python + SSH toegang).
"""

import re, subprocess, sys, time
from pathlib import Path

SSH_HOST = sys.argv[1] if len(sys.argv) > 1 else "hetzner-agent"


def ssh_run(cmd: str, timeout: int = 30) -> str:
    r = subprocess.run(["ssh", SSH_HOST, cmd], capture_output=True, text=True, timeout=timeout)
    return r.stdout + r.stderr


def open_in_windows_browser(url: str):
    """Open URL in Windows default browser via explorer.exe (werkt altijd vanuit WSL)."""
    try:
        subprocess.run(["explorer.exe", url], check=False, timeout=5)
        print("→ URL geopend in Windows browser")
    except Exception as e:
        print(f"⚠ Kon browser niet automatisch openen: {e}")
        print(f"  Open handmatig:\n  {url}")


def poll_server_auth(max_wait: int = 120) -> bool:
    """Poll claude auth status op server. Geeft True als loggedIn: true."""
    print(f"→ Wachten op Authorize-klik + token opslag (max {max_wait}s)...")
    for i in range(max_wait // 3):
        time.sleep(3)
        status = ssh_run("claude auth status 2>/dev/null")
        if '"loggedIn": true' in status:
            print("✅ Auth succesvol vernieuwd!")
            return True
        if i % 5 == 0 and i > 0:
            print(f"   Wachten... ({(i)*3}s) — klik Authorize in je browser")
    print(f"❌ Timeout — token niet opgeslagen binnen {max_wait}s")
    return False


def main():
    print(f"🔐 Claude auth refresh voor {SSH_HOST}...")

    # 1. Start auth login op server
    print("→ claude auth login starten op server...")
    ssh_run("pkill -f 'claude auth login' 2>/dev/null || true")
    ssh_run("rm -f /tmp/claude-auth.log")
    subprocess.Popen(["ssh", SSH_HOST,
                      "nohup claude auth login > /tmp/claude-auth.log 2>&1 &"])
    time.sleep(6)

    # 2. Haal OAuth URL op uit log
    auth_log = ssh_run("cat /tmp/claude-auth.log")
    url_match = re.search(r"https://claude\.ai/oauth/authorize[^\s]+", auth_log)
    if not url_match:
        url_match = re.search(r"https://[^\s]*claude\.ai[^\s]*", auth_log)
    if not url_match:
        print(f"❌ Auth URL niet gevonden in log:\n{auth_log}")
        sys.exit(1)

    auth_url = url_match.group(0)
    print(f"→ OAuth URL gevonden: {auth_url[:70]}...")

    # 3. Open URL in Windows browser
    print("\n→ Browser wordt geopend — klik op 'Authorize' om door te gaan...\n")
    open_in_windows_browser(auth_url)

    # 4. Poll server voor token
    ok = poll_server_auth()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
