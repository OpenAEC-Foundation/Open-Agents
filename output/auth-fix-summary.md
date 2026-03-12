# Auth Fix Summary — Hetzner 401 Problem

## Root Cause

`claude auth status` reports `loggedIn: true` based on **cached credentials** in `.credentials.json`, but the actual **OAuth token is expired**. When agents call `claude --print` or `claude -p`, they get:

```
Failed to authenticate. API Error: 401 {"type":"error","error":{"type":"authentication_error","message":"OAuth token has expired. Please obtain a new token or refresh your existing token."}}
```

This means `auth status` is **unreliable** as a pre-flight check — the only way to know if auth works is to make an actual API call.

## SSH Diagnostic Results

| Check | Result |
|-------|--------|
| `claude auth status` | `loggedIn: true`, email: freek@3bm.co.nl, subscriptionType: max |
| `.claude/` directory | Exists, `.credentials.json` present (452 bytes) |
| `env \| grep -i claude` | No CLAUDE_API_KEY or other conflicting vars |
| `echo test \| claude --print` | **401 — OAuth token expired** |

## Fixes Implemented

### Fix 1: Pre-flight auth check in `spawner.py`
- Added **real API call** auth check before spawning Claude agents on remote hosts
- If auth is expired, automatically runs `claude-auth-headless.py` to refresh
- If auto-refresh fails, raises a clear RuntimeError with manual fix instructions
- Location: `spawn_remote_agent()`, after root detection (step 3b)

### Fix 2: `CLAUDE_API_KEY` unset in remote environment
- Changed `unset CLAUDECODE` → `unset CLAUDECODE CLAUDE_API_KEY` in remote spawn command
- Prevents potential conflicts between OAuth and API key authentication

### Fix 3: `claude-auth-headless.py` improvements
- Added `--check-only` flag: validates auth via actual API call, exit 0/1
- Added `--retries` flag (default 3): retries the full refresh flow
- Checks if auth already works before attempting refresh (skip if valid)
- Uses real API call (`echo ping | claude --print`) instead of `claude auth status`
- Proper argparse with help text

## Immediate Action Required

The OAuth token on Hetzner is currently expired. To fix:

```bash
python3 scripts/claude-auth-headless.py hetzner-agent
```

Then click "Authorize" in the browser window that opens. The script will poll and confirm when the token is refreshed.

## Architecture Note

The `claude auth status` → `loggedIn: true` discrepancy is a Claude CLI design issue. The CLI caches the OAuth grant but doesn't validate the token expiry when reporting status. Our fix works around this by doing a real API call check.
