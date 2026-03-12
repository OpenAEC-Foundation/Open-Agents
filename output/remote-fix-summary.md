# Remote Path Fix — Summary

## Problem
Agents spawned on Hetzner (Ubuntu, user=oa-agent) receive prompts containing Windows/WSL paths like `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/...`. These paths don't exist on Hetzner, causing agents to fail silently.

## Changes Made

### Fix 1: Path Mapping (`spawner.py`)
Added `_map_paths_for_remote(text)` function that:
- Reads `remote_wsl_path_prefix` and `remote_repo_path` from `~/.oa/config.json`
- Replaces WSL project path with remote repo path in task text
- Fallback: maps the parent GitHub directory to the remote home directory (catches other repo references)
- Applied to the `task` string BEFORE workspace creation in `spawn_remote_agent()`

### Fix 2: Repo Sync (`spawner.py`)
Added `_ensure_remote_repo(host)` function that:
- Checks if `remote_repo_path` exists on Hetzner via SSH
- If missing: `git clone` from `remote_repo_git_url`
- If present: `git pull --ff-only` to update
- Errors are non-blocking (best-effort sync)
- Called at the start of `spawn_remote_agent()` for Claude agents (not Ollama-only)

### Fix 3: Config Schema (`config.py`)
Added three new keys to `DEFAULT_CONFIG`:
- `remote_repo_path`: `"/home/oa-agent/Open-Agents"` — target path on Hetzner
- `remote_wsl_path_prefix`: `"/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents"` — WSL path to map
- `remote_repo_git_url`: `"https://github.com/anthropics/Open-Agents.git"` — clone URL if repo missing

### Minor Fix: Remote PATH
Changed hardcoded `/root/.local/bin` to `$HOME/.local/bin` in the remote Claude command builder so it works for any remote user (not just root).

## How to Test

```bash
# 1. Verify config keys are available
python3 -c "from open_agents.config import load_config; c = load_config(); print(c.get('remote_repo_path'), c.get('remote_wsl_path_prefix'))"

# 2. Test path mapping function
python3 -c "
from open_agents.spawner import _map_paths_for_remote
test = 'Lees /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/spawner.py'
print(_map_paths_for_remote(test))
# Expected: 'Lees /home/oa-agent/Open-Agents/oa-cli/src/open_agents/spawner.py'
"

# 3. Test repo sync (requires SSH access)
ssh hetzner-agent "ls /home/oa-agent/Open-Agents/ 2>/dev/null || echo 'not found'"

# 4. Integration test: spawn a simple agent on Hetzner
oa run "Zeg precies: 'Pad-fix werkt!' en stop." --name test-path-fix --model claude/haiku
# Wait, then: oa collect test-path-fix
```

## Files Modified
1. `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/spawner.py`
2. `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/config.py`
