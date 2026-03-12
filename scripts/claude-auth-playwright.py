#!/usr/bin/env python3
"""
claude-auth-playwright.py — Volledig headless Claude OAuth refresh via Playwright
Vereist: pip install playwright && playwright install chromium
Gebruik:  python3 scripts/claude-auth-playwright.py [ssh-host]

Werkt met je bestaande Chrome sessie op Windows (via WSL path).
Als je al bent ingelogd op claude.ai in Chrome → volledig automatisch.
"""
import subprocess
import sys
import re
import time

SSH_HOST = sys.argv[1] if len(sys.argv) > 1 else "hetzner-agent"

# Windows Chrome profiel (via WSL mount)
CHROME_PROFILE = "/mnt/c/Users/Freek Heijting/AppData/Local/Google/Chrome/User Data"


def ssh(cmd: str, timeout: int = 30) -> str:
    result = subprocess.run(
        ["ssh", SSH_HOST, cmd],
        capture_output=True, text=True, timeout=timeout
    )
    return result.stdout + result.stderr


def main():
    print(f"🔐 Playwright OAuth refresh voor {SSH_HOST}...")

    # 1. Start auth op server
    ssh("rm -f /tmp/claude-auth.log")
    subprocess.Popen(["ssh", SSH_HOST, "nohup claude auth login > /tmp/claude-auth.log 2>&1 &"])
    print("→ claude auth login gestart, wachten op URL...")
    time.sleep(6)

    # 2. Haal URL en poort op
    auth_log = ssh("cat /tmp/claude-auth.log")
    url_match = re.search(r"https://[^\s]*claude\.ai[^\s]*", auth_log)
    port_match = re.search(r"localhost:(\d+)", auth_log)

    if not url_match or not port_match:
        print(f"❌ URL niet gevonden in auth log:\n{auth_log}")
        sys.exit(1)

    auth_url = url_match.group(0)
    port = port_match.group(1)
    print(f"→ URL: {auth_url}")
    print(f"→ Poort: {port}")

    # 3. SSH tunnel zodat de OAuth callback werkt
    print(f"→ SSH tunnel openen (local:{port} → server:{port})...")
    tunnel = subprocess.Popen(
        ["ssh", "-N", "-L", f"{port}:localhost:{port}", SSH_HOST]
    )
    time.sleep(2)

    # 4. Playwright met bestaand Chrome profiel (heeft claude.ai cookies)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("❌ Playwright niet geïnstalleerd. Run: pip install playwright && playwright install chromium")
        tunnel.terminate()
        sys.exit(1)

    try:
        with sync_playwright() as p:
            print("→ Chrome openen met bestaand profiel...")
            ctx = p.chromium.launch_persistent_context(
                user_data_dir=CHROME_PROFILE,
                channel="chrome",
                headless=True,  # Volledig headless — geen zichtbaar venster
                args=["--no-first-run", "--no-default-browser-check"]
            )
            page = ctx.new_page()
            print(f"→ Navigeren naar auth URL...")
            page.goto(auth_url, timeout=30000)

            # Probeer Approve/Authorize knop te klikken
            clicked = False
            for selector in [
                "button:has-text('Authorize')",
                "button:has-text('Allow')",
                "button:has-text('Approve')",
                "[data-testid='authorize-button']",
            ]:
                try:
                    page.wait_for_selector(selector, timeout=5000)
                    page.click(selector)
                    print(f"→ Knop geklikt: {selector}")
                    clicked = True
                    break
                except Exception:
                    continue

            if not clicked:
                print("⚠ Kon Approve knop niet automatisch vinden.")
                print("  Klik handmatig Approve in het browservenster...")
                # Wacht max 60s op handmatige actie
                try:
                    page.wait_for_url(f"*localhost:{port}*", timeout=60000)
                except Exception:
                    pass

            # Wacht op callback redirect
            try:
                page.wait_for_url(f"*localhost:{port}*", timeout=15000)
                print("→ OAuth callback ontvangen!")
            except Exception:
                pass

            time.sleep(2)
            ctx.close()
    finally:
        tunnel.terminate()

    # 5. Verifieer auth
    time.sleep(2)
    status = ssh("claude auth status")
    if '"loggedIn": true' in status:
        print("✅ Auth succesvol vernieuwd!")
    else:
        print(f"⚠ Auth status onduidelijk:\n{status}")


if __name__ == "__main__":
    main()
