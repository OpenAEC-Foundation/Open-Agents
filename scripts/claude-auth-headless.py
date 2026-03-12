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
  python3 scripts/claude-auth-headless.py --check-only [ssh-host]

Exit codes:
  0 — Auth is valid (--check-only) or refresh succeeded
  1 — Auth is invalid (--check-only) or refresh failed

Geen extra dependencies nodig (alleen standaard Python + SSH toegang).
"""

import argparse
import re
import subprocess
import sys
import time


def ssh_run(host: str, cmd: str, timeout: int = 30) -> str:
    r = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", host, cmd],
        capture_output=True, text=True, timeout=timeout,
    )
    return r.stdout + r.stderr


def check_auth(host: str) -> bool:
    """Verify that Claude CLI auth actually works (not just cached status).

    claude auth status can report loggedIn: true even when the OAuth token
    is expired. The only reliable check is to actually call the API.
    """
    try:
        output = ssh_run(host, 'echo "ping" | claude --print 2>&1 | head -5', timeout=45)
        if "401" in output or "authentication_error" in output or "expired" in output.lower():
            return False
        if "Failed to authenticate" in output:
            return False
        # If we got any non-error response, auth works
        return bool(output.strip())
    except (subprocess.TimeoutExpired, OSError) as e:
        print(f"⚠ SSH check failed: {e}")
        return False


def open_in_windows_browser(url: str):
    """Open URL in Windows default browser via explorer.exe (werkt altijd vanuit WSL)."""
    try:
        subprocess.run(["explorer.exe", url], check=False, timeout=5)
        print("→ URL geopend in Windows browser")
    except Exception as e:
        print(f"⚠ Kon browser niet automatisch openen: {e}")
        print(f"  Open handmatig:\n  {url}")


def poll_server_auth(host: str, max_wait: int = 120) -> bool:
    """Poll claude auth op server via actual API call. Geeft True als auth werkt."""
    print(f"→ Wachten op Authorize-klik + token opslag (max {max_wait}s)...")
    for i in range(max_wait // 3):
        time.sleep(3)
        if check_auth(host):
            print("✅ Auth succesvol vernieuwd!")
            return True
        if i % 5 == 0 and i > 0:
            print(f"   Wachten... ({i * 3}s) — klik Authorize in je browser")
    print(f"❌ Timeout — token niet opgeslagen binnen {max_wait}s")
    return False


def do_auth_refresh(host: str) -> bool:
    """Run one attempt of claude auth login + browser open + poll."""
    print(f"→ claude auth login starten op {host}...")
    ssh_run(host, "pkill -f 'claude auth login' 2>/dev/null || true")
    ssh_run(host, "rm -f /tmp/claude-auth.log")
    subprocess.Popen(["ssh", host,
                      "nohup claude auth login > /tmp/claude-auth.log 2>&1 &"])
    time.sleep(8)

    # Haal OAuth URL op uit log
    auth_log = ssh_run(host, "cat /tmp/claude-auth.log")
    url_match = re.search(r"https://claude\.ai/oauth/authorize[^\s]+", auth_log)
    if not url_match:
        url_match = re.search(r"https://[^\s]*claude\.ai[^\s]*", auth_log)
    if not url_match:
        print(f"❌ Auth URL niet gevonden in log:\n{auth_log}")
        return False

    auth_url = url_match.group(0)
    print(f"→ OAuth URL gevonden: {auth_url[:70]}...")

    # Open URL in Windows browser
    print("\n→ Browser wordt geopend — klik op 'Authorize' om door te gaan...\n")
    open_in_windows_browser(auth_url)

    # Poll server voor token
    return poll_server_auth(host)


def main():
    parser = argparse.ArgumentParser(description="Claude CLI OAuth refresh for remote servers")
    parser.add_argument("host", nargs="?", default="hetzner-agent",
                        help="SSH host alias (default: hetzner-agent)")
    parser.add_argument("--check-only", action="store_true",
                        help="Only check if auth is valid, don't attempt refresh")
    parser.add_argument("--retries", type=int, default=3,
                        help="Number of refresh attempts (default: 3)")
    args = parser.parse_args()

    host = args.host

    # Check-only mode: validate and exit
    if args.check_only:
        print(f"🔍 Checking Claude auth for {host}...")
        if check_auth(host):
            print("✅ Auth is valid")
            sys.exit(0)
        else:
            print("❌ Auth is invalid or expired")
            sys.exit(1)

    # Full refresh mode
    print(f"🔐 Claude auth refresh voor {host}...")

    # First check if auth already works
    print("→ Checking current auth status...")
    if check_auth(host):
        print("✅ Auth is already valid — no refresh needed")
        sys.exit(0)

    # Try refresh with retries
    for attempt in range(1, args.retries + 1):
        print(f"\n--- Attempt {attempt}/{args.retries} ---")
        if do_auth_refresh(host):
            sys.exit(0)
        if attempt < args.retries:
            print(f"⚠ Attempt {attempt} failed, retrying...")
            time.sleep(5)

    print(f"\n❌ Auth refresh failed after {args.retries} attempts")
    sys.exit(1)


if __name__ == "__main__":
    main()
