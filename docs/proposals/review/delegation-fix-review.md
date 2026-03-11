# Delegation Fix — Code Review

**Reviewer:** review-delegation agent
**Date:** 2026-03-11
**Files reviewed:**
- `oa-cli/src/open_agents/workspace.py`
- `oa-cli/src/open_agents/spawner.py`

---

## Issues Found

### Issue 1 — Duplicate `--direct` flag in spawning instructions
- **Location:** `workspace.py:91` — `_spawning_instructions()`
- **Problem:** The example command has `--direct` twice: once from `{direct_flag}` (line 91) and once hardcoded at the end of the same line. When `project_root` is set, output is: `--parent agent-name --direct --direct`
- **Fix:** Remove the hardcoded `--direct` at end of line 91. The `{direct_flag}` conditional already handles it.
- **Priority:** P1

### Issue 2 — Hardcoded PATH for single user
- **Location:** `workspace.py:14-18` — `_AGENT_PATH`
- **Problem:** PATH includes `/home/freek/...` which breaks for any other user. This should dynamically resolve the current user's home or use `$HOME`.
- **Fix:** Use `Path.home()` or `os.environ.get("HOME")` to build the path, or include `$HOME/.local/bin` in the string (shell-expanded at runtime).
- **Priority:** P2 (works for current user, blocks adoption)

### Issue 3 — Hook matcher may be too broad
- **Location:** `workspace.py:39` — `"matcher": "Agent"`
- **Problem:** The matcher string `"Agent"` is a substring match. If Claude Code adds tools like `AgentStatus` or `AgentList`, those would also be blocked. The Claude Code hook docs indicate matcher supports regex.
- **Fix:** Use `"^Agent$"` as matcher for exact match, or verify Claude Code's matcher semantics match tool names exactly.
- **Priority:** P3 (no known tool collision today)

### Issue 4 — Hook script uses relative path
- **Location:** `workspace.py:41` — `"hooks": ["bash .claude/hooks/block-agent-tool.sh"]`
- **Problem:** The path `bash .claude/hooks/block-agent-tool.sh` is relative. This works only if Claude Code's CWD is the workspace root. If CWD changes mid-session (e.g., agent `cd`s somewhere), the hook fails silently and the Agent tool becomes unblocked.
- **Fix:** Use absolute path in the hook command. In `create_workspace()`, after determining `workspace`, write: `f"bash {workspace}/.claude/hooks/block-agent-tool.sh"`
- **Priority:** P2

### Issue 5 — Remote agent PATH not fully patched
- **Location:** `spawner.py:269` — `spawn_remote_agent()` remote_cmd
- **Problem:** Remote agents use `$HOME/.local/bin:$PATH` but not the full `_AGENT_PATH`. This means remote sub-agents won't find `oa` if it's installed elsewhere. Inconsistent with local agent PATH handling.
- **Fix:** Import and use `_AGENT_PATH` in `spawn_remote_agent()` the same way `_build_claude_command()` does.
- **Priority:** P2

### Issue 6 — No hook installation for remote agents
- **Location:** `spawner.py:254-258` — `spawn_remote_agent()`
- **Problem:** `sync_workspace_to_remote()` only uploads `CLAUDE.md`. The `.claude/settings.json` and `.claude/hooks/` directory are not synced. Remote agents can freely use the Agent tool, bypassing the delegation system entirely.
- **Fix:** Extend `sync_workspace_to_remote()` to rsync or scp the entire `.claude/` directory.
- **Priority:** P1

### Issue 7 — CLAUDE.md delegation instructions are clear but language-locked
- **Location:** `workspace.py:47-104` — all instruction strings
- **Problem:** Instructions are in Dutch. Agents running English Claude models may occasionally misinterpret or ignore Dutch instructions. This is a minor reliability concern.
- **Fix:** Consider English for machine-consumed instructions, Dutch for user-facing text only. Low priority — Claude handles Dutch well.
- **Priority:** P3

### Issue 8 — No fallback if `oa` binary is missing
- **Location:** `workspace.py:73-91` — spawning instructions reference `oa` commands
- **Problem:** If an agent's environment doesn't have `oa` on PATH despite the export, the agent has no guidance on what to do. It may fall back to the blocked Agent tool and get stuck in a loop.
- **Fix:** Add a note in CLAUDE.md: "If `oa` is not found, write the error to `./output/error.md` and create `.done`."
- **Priority:** P3

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P1 | 2 | Duplicate --direct flag; remote hooks not synced |
| P2 | 3 | Hardcoded PATH; relative hook path; remote PATH mismatch |
| P3 | 3 | Matcher breadth; Dutch instructions; missing oa fallback |

## Verdict: **NEEDS FIXES**

The core delegation system (CLAUDE.md instructions + PreToolUse hook + PATH injection) is well-designed and functional for local agents. The two P1 issues should be fixed before relying on this in production:

1. **Duplicate `--direct`** is a cosmetic bug but confuses agents reading the example.
2. **Remote agents bypass the hook entirely** — this defeats the purpose for distributed setups.

The P2 issues (hardcoded user path, relative hook path, remote PATH) should be addressed before multi-user or remote adoption.
