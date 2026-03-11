# Installation

This guide walks you through installing Open-Agents on your system step by step.

---

## Prerequisites

Before you begin, make sure you have:

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Python** | 3.10 or higher | `python3 --version` to check |
| **tmux** | Any recent version | `tmux -V` to check |
| **Claude Code CLI** | Latest | Active subscription required |
| **git** | Any recent version | For cloning the repo |

!!! note "Windows users"
    Open-Agents does **not** support native Windows. Use [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) (Windows Subsystem for Linux) instead. All commands should be run inside your WSL2 terminal.

### Installing tmux

=== "Ubuntu / Debian / WSL2"
    ```bash
    sudo apt update && sudo apt install tmux
    ```

=== "macOS"
    ```bash
    brew install tmux
    ```

=== "Fedora / RHEL"
    ```bash
    sudo dnf install tmux
    ```

### Installing Claude Code

Claude Code CLI must be installed and you need an active Claude subscription:

```bash
npm install -g @anthropic-ai/claude-code
```

Log in with your Claude account and verify it works:

```bash
claude --version
```

---

## Install Open-Agents

### Option 1: install.sh (recommended)

Clone the repository and run the install script:

```bash
git clone https://github.com/OpenAEC-Foundation/Open-Agents.git
cd Open-Agents
./install.sh
```

The install script will:

1. Create a Python virtual environment
2. Install `open-agents-cli` and all dependencies
3. Add `oa` to your `PATH` (via `~/.local/bin`)
4. Create `~/.oa/` configuration directory

### Option 2: pip install

```bash
pip install open-agents-cli
```

!!! warning
    If you use pip install directly, you'll need to clone the repo separately to get the agent templates library (1612+ templates).

---

## Verify the installation

Run the doctor check to confirm everything is set up correctly:

```bash
oa doctor
```

Expected output:

```
✅ Python 3.11.4
✅ tmux 3.3a
✅ Claude Code CLI v1.x.x
✅ oa v0.3.1
✅ agents/library: 1612 templates found
```

If you see any ❌ errors, fix the indicated dependency before continuing.

Check the version:

```bash
oa version
```

---

## Start your first session

Open-Agents uses tmux to manage agent processes. Start a session:

```bash
oa start
```

This creates a tmux session named `oa` that all agents will live in. You should see:

```
✅ Session 'oa' started
```

Verify the session is running:

```bash
oa status
```

If no agents have been spawned yet, you'll see an empty table — that's expected.

---

## Next steps

→ [5-minute quickstart](quickstart.md) — Spawn your first agent and collect output
→ [Your First Agent](first-agent.md) — Understand what's happening under the hood
