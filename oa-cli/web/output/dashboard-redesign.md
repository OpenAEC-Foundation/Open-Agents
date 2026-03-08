# Dashboard Redesign Summary

## Changes Made

### SpawnForm.tsx
- **Model as pills**: Replaced dropdown with pill buttons for haiku/sonnet/opus (colored: cyan/blue/violet). Ollama toggle shows sub-select when active.
- **Task textarea** is now the visual focal point (5 rows, prominent border, focus highlight).
- **Template** moved to inline select in the header row — less visual noise.
- **Name + Parent** hidden behind an "advanced" toggle (ChevronDown) — reduces clutter for the 90% case.
- **Spawn button** full-width, orange gradient, bold, with Zap icon.
- Overall spacing tightened (px-3/py-2 vs px-4/pt-4).

### AgentPanel.tsx
- **Info tab** — redesigned:
  - **Status badge** + **Model badge** inline with color-coded borders.
  - **Duration** shown as monospace pill aligned to the right.
  - **Hierarchy breadcrumb**: If agent has ancestors, renders `parent → grandparent → agent` chain with ChevronRight separators in cyan.
  - Depth indicator shown below if depth > 0.
  - Children count shown if max_children > 0.
- **Output tab** — terminal redesign:
  - Line numbers in a fixed-width left column (styled like VS Code gutter — dim, right-aligned, border separator).
  - Line count shown in header.
  - Hover highlight per line.
  - Output rendered as `<table>` for precise column alignment.

### ActivityFeed.tsx
- **Compact dot indicator** (1.5×1.5 colored dot) instead of icon — saves horizontal space.
- **Timestamp** moved to the **right** of each row, hidden until hover (group-hover).
- **Event colors** clarified: added `AlertTriangle` for timeout/yellow, separated `XCircle` (red = error) from `neutral-500` (killed/cleaned).
- Header row shows count of recent events.
- Uses `min-h-0` + `flex-1` for proper flex overflow scrolling.

### DashboardTab.tsx
- Added **thin stats bar** at top of center canvas area (not full width):
  - Pills: `{N} running` (cyan), `{N} done` (green), `{N} failed` (red), `{N} total` (neutral, right-aligned).
  - Only shows pills when count > 0 (no clutter when idle).
  - "No agents yet" placeholder when total = 0.
- Center column is now `flex flex-col` with stats bar + LiveCanvas below.

## Design Principles Applied
- **Dense, intentional** — developer tool aesthetics, no consumer padding.
- **Hierarchy of attention**: Task textarea → Spawn button → Model pills → Advanced options.
- **Progressive disclosure**: Advanced fields (name/parent) hidden by default.
- **Consistent tokens**: Only existing Tailwind classes (oa-bg, oa-border, oa-accent, neutral-*, cyan-*, green-*, red-*, violet-*).
- **No new dependencies**: Only lucide-react icons already installed.
