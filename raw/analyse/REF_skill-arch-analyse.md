# Analyse: REF_skill-architecture.md

**Datum:** 2026-03-09
**Analist:** ref-skill-arch (oa agent)
**Bron:** `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/raw/REF_skill-architecture.md`

---

## Samenvatting (max 5 regels)

Dit document beschrijft de anatomie, triggering-mechanismen en ontwerpprincipes van Claude Code skills. Skills zijn modulaire kennisblokken die via progressive disclosure (metadata altijd, body bij trigger, resources on-demand) efficiënt contextruimte besparen. Het belicht het 7-staps creatieproces, beschrijvingsoptimalisatie via eval-loops, en praktijkervaring van een gebruiker met 40+ skills.

---

## Kernboodschap

Skills zijn het primaire context-engineering mechanisme in Claude Code. De beschrijving in de frontmatter bepaalt het triggering-gedrag — te passief leidt tot "undertriggering". Goed ontworpen skills laden alleen wanneer relevant, houden het contextvenster schoon, en zijn opgebouwd uit drie lagen (metadata / body / bundled resources). De sleutel is een "pushy" beschrijving die actief aangeeft wanneer de skill van toepassing is.

---

## Relevantie voor Open-Agents: **HOOG**

**Waarom hoog:**
- Open-Agents bouwt een skill-backed agent architectuur waarbij elke atomaire agent 1:1 mapped naar een SKILL.md. De triggering- en structuurprincipes uit dit document zijn direct toepasbaar op hoe agents hun systemPrompt en skills opbouwen.
- Het progressive disclosure model (metadata altijd in context) sluit aan op het bestaande `--direct` en context-isolatie patroon van oa-cli.
- De `run_loop.py` beschrijvingsoptimalisatie (60/40 train/test split, max 5 iteraties) is relevant voor toekomstige skill-evaluatie automatisering binnen Open-Agents.
- De onderzoeksvragen in het document (zelflerende evaluatiecyclus, meta-skill die andere skills beoordeelt) overlappen direct met de autonome/zelfverbeterende doelen van Open-Agents.

---

## Raakvlakken met Issues/Features

| Issue | Raakvlak |
|-------|----------|
| **#14–#16** (skill package integratie) | Progressive disclosure principe direct toepasbaar op skill package SKILL.md bestanden |
| **#17–#18** (agent library uitbreiding) | `skillRef` en `skillPackage` velden in agent JSON zijn consistent met de anatomie beschreven hier |
| **#19** (workspace builder `oa workspace create`) | Bundled resources structuur (scripts/, references/, assets/) geeft input voor workspace-generatie |
| **#20–#22** (evaluatie/kwaliteitsborging) | `run_loop.py` eval-set aanpak kan als blauwdruk dienen voor een oa-native skill-evaluatie pipeline |
| **#23–#25** (meta-skill / zelflerende systemen) | Concept "meta-skill die andere skills evalueert" is expliciet benoemd als onderzoeksvraag in het document |

> Opmerking: Precieze issue-nummers zijn gebaseerd op de nummering uit de taakbeschrijving (#14–#25). Valideer tegen de actuele GitHub issues.

---

## Aanbevolen Actie

**Verwerken in bestaand doc** — Specifiek:

1. **Verwerk** de triggering best practices (pushy descriptions, undertriggering-risico) in `docs/PRINCIPLES.md` als aanvullend ontwerpprincipe voor skill-backed agents.
2. **Voeg toe** aan `LESSONS.md`: de eval-loop aanpak (run_loop.py) als kandidaat-patroon voor skill-kwaliteitsborging (tag: skill-evaluatie).
3. **Bewaar** dit document in `docs/research/` voor referentie bij de bouw van `oa workspace create` en de skill evaluatie pipeline.
4. **Archiveer** het ruwe REF-bestand in `raw/archive/` na verwerking.
