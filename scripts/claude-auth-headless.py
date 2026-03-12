#!/usr/bin/env python3
"""
claude-auth-headless.py — Volledig automatische Claude CLI OAuth refresh.

Flow:
  1. Start `claude auth login` op remote server → vang OAuth URL op
  2. Playwright headless: laad Chrome cookies → navigeer → klik Authorize
  3. Redirect gaat naar platform.claude.com → claude CLI op server pikt token op automatisch
  4. Poll claude auth status tot loggedIn: true

Gebruik:
  python3 scripts/claude-auth-headless.py [ssh-host]
  python3 scripts/claude-auth-headless.py hetzner-agent

Vereisten:
  pip install playwright pycryptodome && playwright install chromium
"""

import os, re, shutil, sqlite3, subprocess, sys, tempfile, time, json, base64
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


def ssh_run(cmd: str, timeout: int = 30) -> str:
    r = subprocess.run(["ssh", SSH_HOST, cmd], capture_output=True, text=True, timeout=timeout)
    return r.stdout + r.stderr


def get_chrome_encryption_key() -> bytes:
    local_state = json.loads(CHROME_LOCAL_STATE.read_text(encoding="utf-8"))
    encrypted_key_b64 = local_state["os_crypt"]["encrypted_key"]
    encrypted_key = base64.b64decode(encrypted_key_b64)[5:]  # strip "DPAPI" prefix
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-Command",
         f"[System.Convert]::ToBase64String("
         f"[System.Security.Cryptography.ProtectedData]::Unprotect("
         f"[System.Convert]::FromBase64String('{base64.b64encode(encrypted_key).decode()}'),"
         f"$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser))"],
        capture_output=True, text=True, timeout=15
    )
    return base64.b64decode(result.stdout.strip())


def decrypt_cookie_value(encrypted_value: bytes, key: bytes) -> str:
    try:
        from Crypto.Cipher import AES
        if encrypted_value[:3] == b"v10":
            nonce = encrypted_value[3:15]
            ciphertext_tag = encrypted_value[15:]
            cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
            return cipher.decrypt_and_verify(ciphertext_tag[:-16], ciphertext_tag[-16:]).decode("utf-8")
    except Exception:
        pass
    return ""


def get_claude_cookies() -> list[dict]:
    print("→ Chrome cookies lezen voor claude.ai...")
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    shutil.copy2(str(CHROME_COOKIES_PATH), tmp.name)
    try:
        key = get_chrome_encryption_key()
    except Exception as e:
        print(f"⚠ DPAPI decrypt mislukt: {e}")
        key = None
    cookies = []
    conn = sqlite3.connect(tmp.name)
    cur = conn.cursor()
    cur.execute(
        "SELECT host_key, name, encrypted_value, path, expires_utc, is_secure "
        "FROM cookies WHERE host_key LIKE '%claude.ai%' OR host_key LIKE '%anthropic.com%'"
    )
    for host, name, enc_val, path, expires, secure in cur.fetchall():
        value = decrypt_cookie_value(enc_val, key) if key and enc_val else ""
        if value:
            cookies.append({"name": name, "value": value, "domain": host,
                            "path": path, "secure": bool(secure),
                            "httpOnly": False, "sameSite": "Lax"})
    conn.close()
    os.unlink(tmp.name)
    print(f"→ {len(cookies)} cookies gevonden (claude.ai + anthropic.com)")
    return cookies


def main():
    print(f"🔐 Headless Claude auth refresh voor {SSH_HOST}...")

    # 1. Start auth op server
    print("→ claude auth login starten op server...")
    ssh_run("rm -f /tmp/claude-auth.log")
    subprocess.Popen(["ssh", SSH_HOST,
                      "nohup claude auth login > /tmp/claude-auth.log 2>&1 &"])
    time.sleep(6)

    # 2. Haal OAuth URL op (geen localhost poort nodig — gaat via platform.claude.com)
    auth_log = ssh_run("cat /tmp/claude-auth.log")
    url_match = re.search(r"https://claude\.ai/oauth/authorize[^\s]+", auth_log)
    if not url_match:
        # Fallback: elke claude.ai URL
        url_match = re.search(r"https://[^\s]*claude\.ai[^\s]*", auth_log)
    if not url_match:
        print(f"❌ Auth URL niet gevonden in log:\n{auth_log}")
        sys.exit(1)

    auth_url = url_match.group(0)
    print(f"→ OAuth URL: {auth_url[:80]}...")

    # 3. Playwright headless — laad Chrome cookies, klik Authorize
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("❌ Run: pip install playwright && playwright install chromium")
        sys.exit(1)

    cookies = get_claude_cookies()
    if not cookies:
        print("⚠ Geen cookies — log eenmalig in op claude.ai in Chrome")
        sys.exit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        ctx.add_cookies(cookies)
        page = ctx.new_page()

        print("→ Navigeren naar OAuth URL (headless)...")
        page.goto(auth_url, timeout=30000)
        time.sleep(2)

        # Klik Authorize / Allow / Approve knop
        clicked = False
        for selector in [
            "button:has-text('Authorize')",
            "button:has-text('Allow')",
            "button:has-text('Approve')",
            "button:has-text('Yes')",
            "[data-testid='authorize-button']",
            "form button[type='submit']",
        ]:
            try:
                btn = page.wait_for_selector(selector, timeout=4000)
                if btn and btn.is_visible():
                    btn.click()
                    print(f"→ Geklikt: {selector}")
                    clicked = True
                    break
            except Exception:
                continue

        if not clicked:
            print(f"⚠ Knop niet gevonden. Pagina titel: '{page.title()}'")
            print("  Mogelijk al geautoriseerd of andere paginalayout.")

        # Wacht even op redirect / verwerking
        time.sleep(3)
        browser.close()

    # 4. Poll claude auth status op server (max 60s)
    print("→ Wachten op token opslag door server...")
    for i in range(20):
        time.sleep(3)
        status = ssh_run("claude auth status 2>/dev/null")
        if '"loggedIn": true' in status:
            print("✅ Auth succesvol vernieuwd!")
            return True
        if i % 3 == 0:
            print(f"   Wachten... ({(i+1)*3}s)")

    print("❌ Timeout — token niet opgeslagen binnen 60s")
    return False


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
