# Analyse: GLOBAL-SKILL-ARCHITECTURE.md

**Datum analyse:** 2026-03-09
**Analist:** design-skill agent
**Gerelateerd issue:** #22 (Skill System per Agent Type)

---

## Samenvatting (max 5 regels)

Het document beschrijft een gelaagd skill-systeem voor Claude Code workspaces met zelflerende mechanismen. Het definieert 6 globale skills (`~/.claude/skills/`) met een ACE-gebaseerde verbetercyclus (Generatie → Reflectie → Curatie → Benchmark). Workspace content management wordt geregeld via `.claudeignore` en INDEX.md-navigatie. Een beslisboom bepaalt wat globaal vs. lokaal hoort. De zelflerende cyclus vereist menselijke goedkeuring bij elke stap-5-toepassing.

---

## Kern boodschap

**Skills zijn niet statisch — ze moeten evolueren op basis van gebruik.**
Het document introduceert het concept van een zelfrefererende skill-stack waarbij skills zichzelf incrementeel verbeteren via gestructureerde feedback loops. De kern is: context engineering als discipline toepassen op het skill-systeem zelf.

---

## Relevantie voor Open-Agents

**Relevantie: HOOG**

- **Directe overlap met issue #22**: Het document beschrijft precies wat issue #22 beoogt — skills koppelen aan agent types. Sectie 3.1 (Skill Packages) en de agent-orchestrator skill sluiten direct aan op Open-Agents' atomaire agent architectuur.
- **Zelflerende cyclus = ontbrekende laag**: Open-Agents heeft agents en skills, maar geen mechanisme om skills te benchmarken en automatisch te verbeteren. Dit document levert dat ontwerp.
- **Workspace management patronen**: De `active/reference/archive/` structuur en `.claudeignore` aanpak zijn direct toepasbaar op Open-Agents workspaces die nu snel vervuilen.
- **Beslisboom globaal vs. lokaal**: Sluit aan op CC_007 (Settings Discipline) maar werkt dat verder uit met concrete beslisstappen.

---

## Wat voegt dit toe bovenop issue #22?

Issue #22 stelt de vraag *welke* skills per agent type gebruikt worden. Dit document voegt toe:

| Aspect | Issue #22 | Dit document |
|--------|-----------|--------------|
| Skill selectie per agent | ✓ Kern vraag | ✓ Beslisboom + type-indeling |
| Skill verbetering over tijd | ✗ Niet in scope | ✓ ACE-cyclus met benchmarks |
| Workspace vervuiling | ✗ Niet behandeld | ✓ Content management architectuur |
| Anti-collapse mechanismen | ✗ Niet behandeld | ✓ Append-only, versioning, max 20% delta |
| Meta-skill concept | ✗ Niet behandeld | ✓ `skill-evolver` als zelfverbeteraar |

**Nieuw inzicht**: De `skill-evolver` meta-skill is een patroon dat Open-Agents nog niet heeft — een skill die andere skills evalueert en verbetert.

---

## Aanbevolen actie

**→ Verwerken in issue #22 + plaatsen in `docs/design/`**

Concreet:
1. **Kopieer naar** `docs/design/skill-architecture.md` als referentie-ontwerp
2. **Voeg toe aan issue #22**: de 6 skill-categorieën (sectie 3.1) als kandidaat-structuur voor het globale skill-pakket
3. **Nieuw issue aanmaken**: zelflerende skill-cyclus (ACE benchmark workflow) — dit is een aparte feature buiten scope van #22
4. **Direct toepasbaar**: workspace content management (`active/reference/archive/` + `.claudeignore`) kan nu al worden toegepast op Open-Agents repo

**Archiveren: NEE** — te relevant en te concreet voor archief.
