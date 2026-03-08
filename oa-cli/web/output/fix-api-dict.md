# Fix: _agent_to_dict missing fields

## Wat is er gedaan

`_agent_to_dict()` in `bridge.py` is uitgebreid met alle ontbrekende velden die het TypeScript Agent interface verwacht.

## Toegevoegde velden

| Veld | Type | Default |
|------|------|---------|
| `pid` | `number \| null` | `None` |
| `output_file` | `string \| null` | `None` |
| `depth` | `number` | `0` |
| `lineage` | `string[]` | `[]` |
| `task_hash` | `string` | `""` |
| `max_children` | `number` | `10` |
| `shared_results_dir` | `string \| null` | `None` |
| `last_activity` | `number` | `0.0` |
| `auto_cleanup_minutes` | `number` | `20` |
| `project_root` | `string \| null` | `None` |

## Aanpak

Alle velden zijn toegevoegd via `getattr(rec, veldnaam, default)` zodat backwards compatibility gewaarborgd is voor AgentRecords die oudere versies van de dataclass zijn.

## Bestand gewijzigd

`/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/bridge.py` — alleen de `_agent_to_dict()` functie.
