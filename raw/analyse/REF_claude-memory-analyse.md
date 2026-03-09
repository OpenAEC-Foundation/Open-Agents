# Analyse: REF_claude-code-memory-system.md

**Datum:** 2026-03-09
**Analist:** ref-claude-memory (document-analist agent)
**Bron:** `raw/REF_claude-code-memory-system.md`

---

## Samenvatting (max 5 regels)

Dit document beschrijft de twee officiële geheugensystemen van Claude Code: (1) CLAUDE.md-bestanden in drie lagen (globaal / project / lokaal) voor persistente instructies, en (2) Auto Memory — door Claude zelf geschreven notities per project. Daarnaast behandelt het de volledige settings-hiërarchie, modulaire `.claude/rules/` bestanden, en het Memory Tool-patroon voor API-gebaseerde agents. Het document bevat vijf concrete onderzoeksvragen specifiek gericht op het Open-Agents project.

---

## Kern boodschap

Claude's geheugen is configureerbaar en gelaagd. CLAUDE.md is het werkcontract (door mensen geschreven), Auto Memory is het kennislogboek (door Claude geschreven). Beide laden automatisch bij sessiestart. De optimale aanpak: root CLAUDE.md klein en stabiel houden, details uitlageren naar `.claude/rules/` (path-scoped), en Auto Memory gebruiken als levend projectgeheugen per sessie.

---

## Relevantie voor Open-Agents

**Relevantie: HOOG**

Open-Agents bouwt een platform waarmee gebruikers agent-workspaces configureren via een 6-layer stack: CLAUDE.md, skills, rules, MCP, hooks. Dit document definieert precies hoe de CLAUDE.md- en rules-lagen technisch werken — het is de officiële specificatie achter wat Open-Agents als product aanbiedt.

Concrete relevantie:

- **Workspace Builder** (`oa workspace create --skills ...`) genereert CLAUDE.md en `.claude/rules/` — dit document specificeert de grenzen en structuur daarvan (token-limieten, prioriteitsregels, path-scoping)
- **Auto Memory** is al actief in alle oa-agents (elk agent draait in `/tmp/oa-agent-*/`) — weten hoe memory wordt geladen en opgeslagen is essentieel voor sessie-herstel en continuïteit
- **Memory Tool pattern** (gestructureerd recovery via memory-artifacts) is direct toepasbaar op de `oa pipeline` en multi-sessie orchestratie
- De `.claude/rules/` path-scoped aanpak biedt een schaalbare manier om skill-kennis context-bewust te laden — relevant voor het skill-backed agent architectuurpatroon

---

## Gerakte issues / features

| Issue/Feature | Verband |
|---------------|---------|
| **#10** (output verdwijnt in /tmp) | Auto Memory is machine-lokaal en project-gebonden — begrijpen hoe memory-paden werken helpt bij het ontwerpen van persistente agent-output |
| **#14–#25** (niet gespecificeerd in bronbestand) | Het gestructureerde recovery-patroon (memory-artifacts initialiseren, herstellen, updaten) is direct toepasbaar op het sessie-overdracht probleem dat in meerdere issues speelt |
| **Workspace Builder** (gepland) | CLAUDE.md token-limieten (~10-15K), 20-200 regelrichtlijnen, en modulaire rules-structuur moeten worden verwerkt in de workspace-generator logica |
| **Skill-backed agents** | Path-scoped rules zijn een alternatief/aanvulling op skills voor context-bewuste kennisactivatie |

---

## Aanbevolen actie

**→ Verwerken in bestaand document: `docs/DECISIONS.md` + `docs/research/`**

1. **Plaatsen in `docs/research/`** als technische referentie — dit is primaire Anthropic-documentatie die de basis legt voor workspace-configuratie-ontwerp
2. **Verwerken in `DECISIONS.md`**: De token-limiet (~10-15K per CLAUDE.md), de 20-200 regelrichtlijn, en het "root klein — details naar rules" structuurprincipe zijn concrete ontwerpbeslissingen voor de Workspace Builder
3. **Onderzoeksvragen uit het document** (5 stuks) overnemen in `docs/OPEN-QUESTIONS.md` — ze zijn specifiek en actionable voor Open-Agents

**Niet archiveren** — dit document blijft actueel zolang Claude Code's memory-systeem stabiel is.
