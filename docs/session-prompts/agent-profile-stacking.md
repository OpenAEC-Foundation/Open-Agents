# Sessie Prompt: Agent Profile Stacking

> Geef deze prompt aan een nieuwe Claude Code sessie in de Open-Agents repo.
> De sessie gebruikt oa-cli actief — spawn agents, delegeer alles, doe niets zelf.

---

## Start deze sessie zo

```
Je bent de META-ORCHESTRATOR van het Open-Agents project.

Voer eerst het volgende uit:
1. tail -30 /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/LESSONS.md
2. oa start --no-chat
3. oa status
4. oa core status

Dan ga je aan de slag met de taak hieronder.
```

---

## Context: wat er al staat

Het Open-Agents project heeft een oa-cli (Python CLI, tmux-based multi-agent orchestrator).
Deze sessie bouwt voort op het volgende dat al geïmplementeerd is:

- `agent_selector.py` — scant 1613 agent templates, keyword filter + AI ranking
- `oa suggest "taak"` — toont beste agents + skills voor een taak
- `oa run --template <id>` — spawnt agent met één template
- `oa run --skills a,b,c` — injecteert meerdere skills als context

**Wat ontbreekt (jouw taak):**
Agents krijgen nu maximaal één template-profiel. Maar profielen kunnen gestacked worden:
`ifc-validator` + `report-writer` + `quality-checker` = één composiet agent die alle drie kan.
Dit bestaat nog niet. Jij bouwt het.

---

## Taak: Agent Profile Stacking

### Wat je bouwt

**1. Template stacking in `oa run`**
`--template a,b,c` → meerdere systemPrompts worden samengevoegd tot één composiet prompt.
Merge-strategie:
- systemPrompts: aaneengevoegd met duidelijke scheiding (`## Role: <name>\n<prompt>`)
- tools: union van alle tools-lijsten
- modelHint: zwaarste model uit de stack (opus > sonnet > haiku)
- name: `<eerste-template>+<n-meer>`

**2. Profile registry**
Een profiel is een benoemde stack van templates + skills:
```json
{
  "id": "ifc-full-pipeline",
  "name": "IFC Full Pipeline",
  "description": "Valideert, analyseert en rapporteert over IFC modellen",
  "templates": ["aec-bonsai-bonsai-agents-ifc-validator", "aec-ifcopenshell-ifcos-impl-creation"],
  "skills": ["aec-core-bim-workflows", "bonsai-agents-ifc-validator"],
  "modelHint": "claude/opus",
  "tags": ["ifc", "aec", "validation", "reporting"]
}
```
Opslaan in: `agents/library/profiles/`
Laden via: `oa run --profile ifc-full-pipeline`

**3. Auto-compositie in `oa suggest`**
`oa suggest "taak"` toont nu ook een aanbevolen stack:
```
Aanbevolen profiel:
  ifc-validator + report-writer (2 templates)
  → oa run "..." --template aec-bonsai-ifc-validator,report-writer --direct
```

**4. `oa profile` subcommand**
```bash
oa profile list                          # toon alle profielen
oa profile show <id>                     # toon profiel details
oa profile create <id> --templates a,b --skills x,y  # maak nieuw profiel
oa profile save "taak" --from-suggest    # maak profiel van oa suggest output
```

---

## Bestanden die je moet lezen voor je begint

```bash
# Architectuur begrijpen:
cat /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/agent_selector.py
cat /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/cli.py | grep -A 30 "def run("
cat /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/spawner.py | head -80

# Bestaande template structuur:
cat /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/agents/library/aec-bonsai/bonsai-agents-ifc-validator.json

# Architectuurbeslissingen:
grep -A 5 "D-105" /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/DECISIONS.md
```

---

## Hoe je werkt (VERPLICHT)

**Jij bent het doorgeefluik. Spawn agents voor alles.**

```bash
# Sessie starten
oa start --no-chat
oa status

# Agents spawnen (ALTIJD --direct --model)
oa run "taak" --name <naam> --model claude/sonnet --direct

# Output ophalen
oa collect <naam>

# Commit en push (na elke werkende feature)
git add <files>
git commit -m "feat(...): ..."
git push <token-url> main
```

**Flat spawning — NOOIT nested:**
```
✅ Jij → worker-1 (oa run)
✅ Jij → worker-2 (oa run)
❌ Jij → orchestrator → worker (werkt NIET)
```

**Altijd --direct. Altijd --model.**

---

## Spawn plan (voer dit exact uit)

Start met drie parallelle agents:

### Agent 1: profile-composer (sonnet)
Bouwt de merge-logica en profile registry module.

```bash
oa run 'Je bent een CODE WORKER.

## Input
Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/agent_selector.py
Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/cli.py (de _load_template functie, rond regel 57-93)

## Output
Schrijf naar: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/profile_composer.py

## Scope
Bouw profile_composer.py met:

1. merge_templates(template_ids: list[str], library_dir: Path) -> dict
   - Laadt elk template JSON op
   - systemPrompt: aaneengevoegd met "## Role: <name>\n<prompt>\n---\n" separator
   - tools: union van alle tools lijsten (dedupliceren)
   - modelHint: zwaarste model (opus > sonnet > haiku > default)
   - Retourneert merged dict klaar voor spawn_agent

2. load_profile(profile_id: str, profiles_dir: Path = None) -> dict
   - Laadt agents/library/profiles/<id>.json
   - Retourneert: {templates, skills, modelHint, description, ...}

3. save_profile(profile_id: str, templates: list[str], skills: list[str], description: str, profiles_dir: Path = None) -> Path
   - Schrijft naar agents/library/profiles/<id>.json
   - Voegt automatisch tags toe op basis van template-categorieën

4. list_profiles(profiles_dir: Path = None) -> list[dict]
   - Scant agents/library/profiles/*.json
   - Retourneert gesorteerde lijst

## Regels
- Python 3.10+, geen nieuwe externe dependencies
- Robuust: als template niet bestaat → skip met waarschuwing
- modelHint priority: opus=3, sonnet=2, haiku=1, default=0
- Schrijf ./output/result.md met samenvatting en voorbeeldoutput
' --name profile-composer --model claude/sonnet --direct
```

### Agent 2: cli-profile-integration (sonnet)
Integreert stacking in `oa run` en bouwt `oa profile` subcommands.

```bash
oa run 'Je bent een CODE WORKER.

## Input
Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/cli.py
Focus op: de `run` functie (rond regel 408-600) en de bestaande subcommand patronen (team_app, skill_app, etc.)

## Output
Wijzig: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/cli.py

## Scope

### 1. Uitbreiding `run` functie
Voeg parameter toe: `templates: str = typer.Option("", "--templates", help="Komma-gescheiden template IDs om te stacken")`
Voeg parameter toe: `profile: str = typer.Option("", "--profile", help="Profile ID uit agents/library/profiles/")`

Logica (NA bestaande --template handling, VOOR spawn):
```python
# Profile loading (--profile heeft prioriteit boven --template)
if profile:
    from .profile_composer import load_profile, merge_templates
    prof = load_profile(profile)
    templates_list = prof.get("templates", [])
    if not context_skills:
        context_skills = ",".join(prof.get("skills", []))
    if model == "claude" and prof.get("modelHint"):
        model = prof["modelHint"]
    merged = merge_templates(templates_list, AGENTS_LIBRARY_DIR)
    system_prompt = merged.get("systemPrompt", "")
    task = (system_prompt + "\n\n" + task).strip() if task else system_prompt

# Template stacking (--templates met kommas)
elif templates and "," in templates:
    from .profile_composer import merge_templates
    template_list = [t.strip() for t in templates.split(",") if t.strip()]
    merged = merge_templates(template_list, AGENTS_LIBRARY_DIR)
    system_prompt = merged.get("systemPrompt", "")
    task = (system_prompt + "\n\n" + task).strip() if task else system_prompt
    if model == "claude" and merged.get("modelHint"):
        model = merged["modelHint"]
    console.print(f"[dim]Stacked {len(template_list)} templates → {merged.get(\"modelHint\", \"default\")} model[/dim]")
```

### 2. `oa profile` subcommand groep
Voeg toe aan einde van cli.py (voor `if __name__ == "__main__":`):
- `oa profile list` — tabel van alle profielen (id, name, templates count, model)
- `oa profile show <id>` — details van één profiel
- `oa profile create <id> --templates a,b --skills x,y --description "..."` — maak nieuw profiel
- `oa profile save --from-suggest "taak"` — run suggest, sla top-stack op als profiel

## Regels
- Gebruik profile_composer module (die door agent-1 gebouwd wordt)
- Backwards compatible: --template (enkelvoud) blijft werken zoals nu
- Schrijf ./output/result.md met samenvatting
' --name cli-profile-integration --model claude/sonnet --direct
```

### Agent 3: suggest-composer (haiku)
Breidt `oa suggest` uit met stack-aanbevelingen.

```bash
oa run 'Je bent een CODE WORKER.

## Input
Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/cli.py
Zoek de `suggest` functie (grep op "def suggest").

## Output
Wijzig: de suggest functie in cli.py

## Scope
Voeg na de bestaande Agent Suggestions sectie toe:

```python
    # Recommended stack (top 2-3 agents combined)
    if len(agents) >= 2:
        stack_ids = ",".join(a.agent_id for a in agents[:min(3, len(agents))])
        stack_names = " + ".join(a.name for a in agents[:min(3, len(agents))])
        console.print("\n[bold]Aanbevolen stack:[/bold]")
        console.print(f"  [cyan]{stack_names}[/cyan]")
        console.print(f"  [dim]→ oa run \"<taak>\" --templates {stack_ids} --direct[/dim]")
        if skills:
            skill_ids = ",".join(s.skill_id for s in skills[:3])
            console.print(f"  [dim]   --skills {skill_ids}[/dim]")
        console.print()
        console.print(f"[dim]Sla op als profiel: oa profile save --from-suggest \"{task}\"[/dim]")
```

## Regels
- Minimale wijziging: alleen toevoegen, niets verwijderen
- Schrijf ./output/result.md met samenvatting
' --name suggest-composer --model claude/haiku --direct
```

---

## Na de agents

```bash
# Wacht tot alle drie done zijn
oa status

# Collect in volgorde (profile-composer eerst — anderen hangen ervan af)
oa collect profile-composer
oa collect cli-profile-integration
oa collect suggest-composer

# Valideer
python3 -c "from open_agents.profile_composer import merge_templates, list_profiles; print('OK')"
python3 -c "from open_agents.cli import app; print('CLI OK')"

# Test
oa suggest "valideer IFC model" --no-ai
oa profile list

# Commit
git add -A
OA_PO_SKIP=1 git commit -m "feat(profiles): agent profile stacking — --templates, --profile, oa profile"
git push <token> main
```

---

## Kwaliteitsregels

- Spawn agents voor ELKE implementatietaak — doe niets zelf
- Verifieer altijd met python3 -c import na collect
- Fix crashes direct met een fix-agent, niet handmatig
- Commit na elke werkende feature, niet aan het einde

---

## Architectuurprincipe (D-105)

> Code enforceert, AI evalueert.
> merge_templates() is deterministisch (code).
> Welke templates je kiest is intelligent (AI via oa suggest).

De profile registry is code. De compositie-aanbeveling is AI.
