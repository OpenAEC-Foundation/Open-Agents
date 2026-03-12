#!/usr/bin/env python3
"""
claude-auth-headless.py — Volledig automatische Claude CLI OAuth refresh.

Werking:
  1. Start `claude auth login` op de remote server → vang URL + poort op
  2. Open SSH tunnel: local:PORT → server:PORT
  3. Lees claude.ai cookies uit Chrome (SQLite, Windows DPAPI decrypt)
  4. Playwright headless: laad cookies → navigeer naar auth URL → klik Approve
  5. OAuth callback gaat via tunnel naar server → token opgeslagen
  6. Verifieer + rapporteer

Gebruik:
  python3 scripts/claude-auth-headless.py [ssh-host]
  python3 scripts/claude-auth-headless.py hetzner-agent

Vereisten:
  pip install playwright pycryptodome pywin32  (of: pip install -r scripts/auth-requirements.txt)
  playwright install chromium
"""

import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from pathlib import Path

SSH_HOST = sys.argv[1] if len(sys.argv) > 1 else "hetzner-agent"

CHROME_COOKIES_PATH = Path(
    "/mnt/c/Users/Freek Heijting/AppData/Local/Google/Chrome"
    "/User Data/Default/Network/Cookies"
)
CHROME_LOCAL_STATE = Path(
    "/mnt/c/Users/Freek Heijting/AppData/Local/Google/Chrome"
    "/User Data/Local State"
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def ssh_run(cmd: str, timeout: int = 30) -> str:
    r = subprocess.run(["ssh", SSH_HOST, cmd], capture_output=True, text=True, timeout=timeout)
    return r.stdout + r.stderr


def get_chrome_encryption_key() -> bytes:
    """Haal Chrome encryptie-sleutel op via Windows DPAPI (werkt vanuit WSL)."""
    import json, base64
    local_state = json.loads(CHROME_LOCAL_STATE.read_text(encoding="utf-8"))
    encrypted_key_b64 = local_state["os_crypt"]["encrypted_key"]
    encrypted_key = base64.b64decode(encrypted_key_b64)[5:]  # strip "DPAPI" prefix

    # Roep PowerShell aan om DPAPI te decrypten (werkt vanuit WSL)
    ps_cmd = (
        f"[System.Text.Encoding]::UTF8.GetString("
        f"[System.Security.Cryptography.ProtectedData]::Unprotect("
        f"[System.Convert]::FromBase64String('{base64.b64encode(encrypted_key).decode()}'),"
        f"$null,"
        f"[System.Security.Cryptography.DataProtectionScope]::CurrentUser))"
    )
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-Command", ps_cmd],
        capture_output=True, timeout=15
    )
    # PowerShell geeft raw bytes terug als string → decodeer
    # Alternatief: gebruik directe byte-output
    key_hex = subprocess.run(
        ["powershell.exe", "-NoProfile", "-Command",
         f"[System.Convert]::ToBase64String("
         f"[System.Security.Cryptography.ProtectedData]::Unprotect("
         f"[System.Convert]::FromBase64String('{base64.b64encode(encrypted_key).decode()}'),"
         f"$null,"
         f"[System.Security.Cryptography.DataProtectionScope]::CurrentUser))"],
        capture_output=True, text=True, timeout=15
    )
    import base64 as b64
    return b64.b64decode(key_hex.stdout.strip())


def decrypt_cookie_value(encrypted_value: bytes, key: bytes) -> str:
    """Decrypt een Chrome cookie value (AES-256-GCM)."""
    try:
        from Crypto.Cipher import AES
        # Chrome v80+: b"v10" prefix + 12-byte nonce + ciphertext + 16-byte tag
        if encrypted_value[:3] == b"v10":
            nonce = encrypted_value[3:15]
            ciphertext_tag = encrypted_value[15:]
            ciphertext = ciphertext_tag[:-16]
            tag = ciphertext_tag[-16:]
            cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
            return cipher.decrypt_and_verify(ciphertext, tag).decode("utf-8")
    except Exception:
        pass
    return ""


def get_claude_cookies() -> list[dict]:
    """Lees claude.ai cookies uit Chrome's SQLite database."""
    print("→ Chrome cookies lezen...")

    # Kopieer database (Chrome houdt file locked)
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    shutil.copy2(str(CHROME_COOKIES_PATH), tmp.name)

    try:
        key = get_chrome_encryption_key()
    except Exception as e:
        print(f"⚠ DPAPI decrypt mislukt ({e}) — probeer zonder decryptie")
        key = None

    cookies = []
    conn = sqlite3.connect(tmp.name)
    cur = conn.cursor()
    cur.execute(
        "SELECT host_key, name, encrypted_value, path, expires_utc, is_secure "
        "FROM cookies WHERE host_key LIKE '%claude.ai%'"
    )
    for host, name, enc_val, path, expires, secure in cur.fetchall():
        value = ""
        if key and enc_val:
            value = decrypt_cookie_value(enc_val, key)
        if value:
            cookies.append({
                "name": name,
                "value": value,
                "domain": host,
                "path": path,
                "secure": bool(secure),
                "httpOnly": False,
                "sameSite": "Lax",
            })
    conn.close()
    os.unlink(tmp.name)

    print(f"→ {len(cookies)} claude.ai cookies gevonden")
    return cookies


# ── Hoofdflow ─────────────────────────────────────────────────────────────────

def main():
    print(f"🔐 Headless Claude auth refresh voor {SSH_HOST}...")

    # 1. Start claude auth login op server
    print("→ claude auth login starten op server...")
    ssh_run("rm -f /tmp/claude-auth.log")
    subprocess.Popen(["ssh", SSH_HOST, "nohup claude auth login > /tmp/claude-auth.log 2>&1 &"])
    time.sleep(6)

    # 2. Haal URL en poort op
    auth_log = ssh_run("cat /tmp/claude-auth.log")
    url_match = re.search(r"https://[^\s]*claude\.ai[^\s]*", auth_log)
    port_match = re.search(r"localhost:(\d+)", auth_log)

    if not url_match or not port_match:
        print(f"❌ URL niet gevonden:\n{auth_log}")
        sys.exit(1)

    auth_url = url_match.group(0)
    port = port_match.group(1)
    print(f"→ URL: {auth_url}")
    print(f"→ Callback poort: {port}")

    # 3. SSH tunnel
    print(f"→ SSH tunnel openen (:{port})...")
    tunnel = subprocess.Popen(["ssh", "-N", "-L", f"{port}:localhost:{port}", SSH_HOST])
    time.sleep(2)

    # 4. Playwright headless met Chrome cookies
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("❌ Playwright niet geïnstalleerd:")
        print("   pip install playwright && playwright install chromium")
        tunnel.terminate()
        sys.exit(1)

    cookies = get_claude_cookies()
    if not cookies:
        print("⚠ Geen cookies gevonden — je bent mogelijk niet ingelogd in Chrome op claude.ai")
        print("  Log eenmalig handmatig in op claude.ai in Chrome, dan werkt dit automatisch.")
        tunnel.terminate()
        sys.exit(1)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context()

            # Laad claude.ai cookies
            ctx.add_cookies(cookies)
            page = ctx.new_page()

            print("→ Navigeren naar auth URL (headless)...")
            page.goto(auth_url, timeout=30000)

            # Klik Approve / Authorize knop
            clicked = False
            for selector in [
                "button:has-text('Authorize')",
                "button:has-text('Allow')",
                "button:has-text('Approve')",
                "[data-testid='authorize-button']",
                "button[type='submit']",
            ]:
                try:
                    page.wait_for_selector(selector, timeout=4000)
                    page.click(selector)
                    print(f"→ Geklikt: {selector}")
                    clicked = True
                    break
                except Exception:
                    continue

            if not clicked:
                print("⚠ Approve knop niet gevonden — controleer of je ingelogd bent op claude.ai")
                # Dump page content voor debugging
                print("--- Page title:", page.title())

            # Wacht op OAuth callback
            try:
                page.wait_for_url(f"*localhost:{port}*", timeout=20000)
                print("→ OAuth callback ontvangen!")
            except Exception:
                pass

            time.sleep(2)
            browser.close()
    finally:
        tunnel.terminate()

    # 5. Verifieer
    time.sleep(3)
    status = ssh_run("claude auth status")
    if '"loggedIn": true' in status:
        print("✅ Auth succesvol vernieuwd!")
        return True
    else:
        print(f"❌ Auth mislukt:\n{status}")
        return False


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
