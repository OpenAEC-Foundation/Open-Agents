# Canvas ↔ CLI Integratie

> **Issue #61** — Uitwisselingsformaat + `oa import` command voor Canvas-naar-CLI pipeline export.

---

## Overzicht

De Canvas UI stelt gebruikers in staat om visueel pipelines te ontwerpen als gerichte grafen van agent-nodes.
Via `oa import` kan zo'n pipeline rechtstreeks vanuit de CLI worden uitgevoerd, zonder handmatige omzetting.

```
Canvas UI  ──export──►  canvas-export.json  ──oa import──►  oa agents (tmux)
```

Omgekeerd kunnen resultaten van `oa` agents via het bestaande bridge-protocol (SSE) worden teruggestuurd
naar de Canvas UI voor visualisatie.

---

## Uitwisselingsformaat — JSON Schema

Het formaat is gedefinieerd in [`docs/schemas/canvas-export.json`](schemas/canvas-export.json).

### Structuur

```json
{
  "version": "1.0",
  "name": "pipeline-naam",
  "description": "Optionele beschrijving",
  "created_at": "2026-03-11T10:00:00Z",
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

### Node (type = agent)

```json
{
  "id": "researcher-a",
  "type": "agent",
  "position": { "x": 100, "y": 100 },
  "config": {
    "name": "researcher-a",
    "task": "Volledige taakomschrijving voor de agent...",
    "model": "claude/sonnet",
    "agent_type": "researcher"
  }
}
```

| Veld | Verplicht | Beschrijving |
|------|-----------|--------------|
| `id` | ja | Unieke node-ID (`[a-z0-9-]`, max 62 tekens) |
| `type` | ja | `agent`, `note`, `trigger`, of `output` — alleen `agent` wordt gespawnt |
| `config.name` | nee | oa agent-naam (valt terug op `id`) |
| `config.task` | ja | Volledige taakomschrijving |
| `config.model` | nee | Modelstring (default: `claude/sonnet`) |
| `config.agent_type` | nee | Label voor het type agent |

### Edge (afhankelijkheid)

```json
{ "id": "e1", "source": "researcher-a", "target": "combiner" }
```

Een edge `source → target` betekent: de `target`-agent is afhankelijk van `source`.
De CLI verwerkt dit als topologische volgorde bij het spawnen.

---

## Canvas → CLI Workflow

### Stap 1: Exporteer vanuit Canvas

Gebruik de Canvas UI om een pipeline te exporteren:

1. Ontwerp je pipeline in de Canvas UI (nodes verbinden met edges).
2. Klik op **Export → oa JSON**.
3. Sla het bestand op, bijv. `~/my-pipeline.json`.

### Stap 2: Importeer via CLI

```bash
oa import ~/my-pipeline.json
```

De CLI:
1. Valideert het JSON-formaat.
2. Sorteert nodes topologisch op basis van edges.
3. Spawnt elke agent-node in volgorde via `oa run`.

#### Opties

```bash
oa import <bestand>           # importeer en spawn pipeline
oa import <bestand> --dry-run # toon stappen zonder te spawnen
oa import <bestand> --model claude/opus  # overschrijf model voor alle agents
```

### Stap 3: Monitor agents

```bash
oa status          # bekijk alle lopende agents
oa collect <naam>  # haal output op van een afgeronde agent
oa attach <naam>   # volg een agent live
```

---

## CLI → Canvas Workflow

Resultaten van `oa` agents kunnen worden teruggekoppeld naar de Canvas UI via de bestaande
bridge-server (`oa web` of `oa vscode-bridge`).

### Agent output terugsturen

De bridge server exposeert een SSE-endpoint dat Canvas kan abonneren:

```
GET http://localhost:5174/api/events
```

Zodra een agent `.done` aanmaakt, stuurt de bridge een event:

```json
{
  "type": "agent_done",
  "agent": "researcher-a",
  "status": "completed",
  "result_path": "/tmp/oa-agent-researcher-a/output/result.md"
}
```

Canvas kan de node-status bijwerken op basis van deze events (groen = klaar, rood = fout).

### Handmatige export naar Canvas

Om een bestaande `oa run`-configuratie te exporteren als Canvas-formaat:

1. Kopieer de agent-namen en taken uit `oa status`.
2. Maak handmatig een `canvas-export.json` aan (zie schema hierboven).
3. Importeer in Canvas UI via **Import → oa JSON**.

---

## End-to-End Voorbeeldworkflow

Dit voorbeeld bouwt een onderzoekspipeline met twee parallelle onderzoekers en één combiner.

### 1. Canvas export (research-pipeline.json)

```json
{
  "version": "1.0",
  "name": "async-language-comparison",
  "nodes": [
    {
      "id": "researcher-python",
      "type": "agent",
      "config": {
        "name": "researcher-python",
        "task": "Onderzoek Python async patterns. Schrijf bevindingen naar /tmp/out/python.md",
        "model": "claude/sonnet"
      }
    },
    {
      "id": "researcher-rust",
      "type": "agent",
      "config": {
        "name": "researcher-rust",
        "task": "Onderzoek Rust async patterns. Schrijf bevindingen naar /tmp/out/rust.md",
        "model": "claude/sonnet"
      }
    },
    {
      "id": "combiner",
      "type": "agent",
      "config": {
        "name": "combiner",
        "task": "Lees /tmp/out/python.md en /tmp/out/rust.md. Schrijf vergelijking naar /tmp/out/comparison.md",
        "model": "claude/opus"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "researcher-python", "target": "combiner" },
    { "id": "e2", "source": "researcher-rust",   "target": "combiner" }
  ]
}
```

### 2. Importeer en voer uit

```bash
# Zorg dat oa sessie actief is
oa start

# Importeer de pipeline
oa import research-pipeline.json
```

Output:

```
Canvas import: 'async-language-comparison' — 3 stap(pen)
  Spawning: researcher-python (model: claude/sonnet)
  Spawning: researcher-rust (model: claude/sonnet)
  Spawning: combiner (model: claude/opus)
```

### 3. Volg de voortgang

```bash
oa status
# researcher-python   running
# researcher-rust     running
# combiner            running

oa collect combiner
# Toont de vergelijking zodra combiner klaar is
```

---

## Implementatiedetails

| Module | Locatie |
|--------|---------|
| Importlogica | `oa-cli/src/open_agents/canvas_import.py` |
| CLI-commando | `oa-cli/src/open_agents/cli.py` (`oa import`) |
| JSON Schema | `docs/schemas/canvas-export.json` |

### canvas_import.py — publieke API

```python
parse_canvas_export(file_path: str) -> dict
convert_to_pipeline(canvas_data: dict) -> list[dict]
import_and_run(file_path: str) -> None
```

### Topologische sortering

De `convert_to_pipeline` functie gebruikt Kahn's algoritme om nodes te sorteren op basis van
hun afhankelijkheden (edges). Nodes zonder inkomende edges worden als eerste gespawnt.
Cyclische afhankelijkheden worden niet expliciet gedetecteerd — ontbrekende nodes worden
overgeslagen.

---

## Beperkingen (v1.0)

- Parallelle uitvoering van onafhankelijke nodes wordt nog niet ondersteund — alle agents worden
  sequentieel gespawnt in topologische volgorde. Toekomstige versie: batch-spawning per niveau.
- `oa import` wacht niet op afronding van eerder gespawnte agents voor de volgende laag.
  Gebruik `oa collect` of `oa status` om voortgang te bewaken.
- Alleen nodes van `type: "agent"` worden verwerkt; `note`, `trigger`, en `output` nodes worden
  overgeslagen.
