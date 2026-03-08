# test-workspace

Development sandbox for the Open-Agents VS Code Bridge extension.

## Purpose

Open this folder in VS Code to test the bridge extension in a clean environment:

```bash
code packages/vscode-bridge/test-workspace
```

Then press **F5** to launch the Extension Development Host with the bridge active.

## Quick test

```bash
# Verify bridge is running
curl http://localhost:7483/health

# Expected response:
# {"status":"ok","version":"0.1.0","port":7483,"uptime":...,"workspaceCount":1}
```

## Structure

```
test-workspace/
  CLAUDE.md   ← Bridge quick-reference for agents working in this workspace
  README.md   ← This file
```

Add test files here as needed. Nothing in this folder affects the extension source.
