# Result: oa run --template <name> (Issue #67)

## Status: DONE

## What was found

The `--template` feature was already largely implemented in `cli.py`:
- `--template` option on the `run` command (line 390)
- `_load_template()` function (lines 57-72)
- `oa templates` command to list all templates (lines 588-631)
- Template loading in `run`: systemPrompt used as task, modelHint as default model (lines 424-432)

## What was changed

**File:** `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/cli.py`

Enhanced `_load_template()` to support 3 lookup strategies:

1. **Stem match** (already worked): `--template api-contract-validator`
2. **Path match** (new): `--template code-dev/api-contract-validator`
3. **ID field match** (new): `--template code-dev-api-contract-validator`

Also added:
- Normalization: strips leading slash and `.json` suffix if user accidentally includes them
- Better error message: "Run 'oa templates' to see all available templates."

## How to test

```bash
# List all templates
oa templates

# Run by stem
oa run --template api-contract-validator "Check /path/to/openapi.yaml against /path/to/routes/"

# Run by category/name path
oa run --template code-dev/api-contract-validator "Check /path/to/openapi.yaml"

# Run by id field
oa run --template code-dev-api-contract-validator "Check /path/to/openapi.yaml"

# Filter templates by category
oa templates --category code-dev
```

## Lines changed

- `_load_template` function: expanded from ~15 lines to ~35 lines
- No changes to the `run` command signature or other commands
- No breaking changes
