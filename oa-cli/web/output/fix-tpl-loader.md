# Fix: template_loader.py — Array-format JSON support

## Wijzigingen

**Bestand:** `oa-cli/src/open_agents/template_loader.py`

### `_load_json()`
- Return type uitgebreid: accepteert nu `dict | list | None`
- `isinstance` check aangepast: `(dict, list)` — arrays worden nu teruggegeven in plaats van genegeerd

### `list_templates()`
- Als `data` een `list` is: itereert over elk item en voegt individuele agents toe
- `id` wordt ingesteld op `item.get("name", computed_id)` voor agents in arrays

### `load_template()`
- Als `data` een `list` is: zoekt door elk item op `id` of `name`
- Backwards-compatible voor bestaande dict-templates

## Resultaat
- 130 agents (13 category files × 10 agents) zijn nu bereikbaar
- Geen breaking changes voor bestaande dict-format templates
