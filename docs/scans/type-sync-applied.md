# Type Sync Applied — 2026-03-08

## File modified
`oa-cli/web/src/types/index.ts` — `Agent` interface

## Fields added to `Agent` interface

| Field | TypeScript type | Python type |
|-------|----------------|-------------|
| `pid` | `number \| null` | `Optional[int]` |
| `output_file` | `string \| null` | `Optional[str]` |
| `depth` | `number` | `int = 0` |
| `lineage` | `string[]` | `list = []` |
| `task_hash` | `string` | `str = ""` |
| `max_children` | `number` | `int = 10` |
| `shared_results_dir` | `string \| null` | `Optional[str]` |
| `last_activity` | `number` | `float = 0.0` |
| `auto_cleanup_minutes` | `number` | `int = 20` |
| `project_root` | `string \| null` | `Optional[str]` |

## Fields kept (UI-only, not in Python backend)

| Field | Note |
|-------|------|
| `live_output?` | Computed/injected by API layer |
| `result?` | Computed/injected by API layer |
| `unread_messages?` | Computed/injected by API layer |

## Fields unchanged (already correct)

`name`, `task`, `workspace`, `tmux_window`, `model`, `status`, `parent`, `created_at`, `finished_at`

## Source

Python: `oa-cli/src/open_agents/state.py` — `AgentRecord` dataclass
