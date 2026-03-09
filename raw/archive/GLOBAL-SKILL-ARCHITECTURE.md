# Architectuur: Globaal Skill-Pakket met Zelflerende Mechanismen

**Status:** Ontwerp v1.0  
**Datum:** 8 maart 2026

---

## 1. Ontwerpfilosofie

We bouwen een **gelaagd systeem** dat twee problemen tegelijk oplost:

1. **Directe waarde:** Skills die Claude effectiever maken in elke workspace
2. **Evolutie:** Het systeem verbetert zichzelf over tijd op basis van gebruik

Het ontwerp volgt drie principes uit onze bronnen:
- **Progressive disclosure** (Anthropic) — laad alleen wat nodig is
- **Accumulatie boven vervanging** (ACE) — voeg toe, herschrijf niet
- **Isolatie** (LangChain) — verschillende taken, verschillende context

---

## 2. Globale CLAUDE.md — Het Werkcontract

De globale `~/.claude/CLAUDE.md` is het fundament. Op basis van best practices (Anthropic docs, José Parreo's analyse, Freek Van der Herten's setup) moet dit bestand:

- **Klein en stabiel** blijven (20-80 regels)
- Aanvoelen als **werkcontract**, niet als documentatie
- Alleen bevatten wat **materieel invloed heeft** op Claude's beslissingen

### Voorgestelde Structuur

```markdown
# Globale Instructies

## Identiteit & Context
- Primaire taal: Nederlands voor communicatie, Engels voor code
- Werkomgeving: WSL2/Linux, Claude Code + Claude.ai Projects
- Domeinen: AEC/BIM, software-architectuur, procesoptimalisatie

## Werkwijze
- Optimaliseer voor correctheid en duidelijkheid boven snelheid
- Wees kritisch en direct — geen sycofantie
- Bij complexe taken: denk eerst, plan dan, implementeer daarna
- Thinking mode: altijd aan

## Architectuurprincipes
- Compositie boven overerving
- Progressive disclosure in alle systemen
- Context als eindige bron behandelen
- Documenteer beslissingen, niet alleen resultaten

## Tools & Conventions
- Git: gebruik gh CLI voor alle GitHub-operaties
- Python: virtual environments voor complexe projecten
- Bestanden: UTF-8, LF line endings

## Zelfreferentie
- Log significante patronen en inzichten naar auto-memory
- Verwijs naar skills bij domein-specifieke taken
- Bij herhaling van correcties: stel voor om het als memory op te slaan
```

**Wat er NIET in hoort:**
- Project-specifieke configuratie
- Veranderlijke informatie (planningen, todo's)
- Uitgebreide codestandaarden (→ skills of .claude/rules/)
- Persoonlijkheidsontwerp

---

## 3. Globaal Skill-Pakket — Ontwerp

### 3.1 Overzicht

```
~/.claude/skills/                          ← Globale skills directory
├── context-engineering/
│   ├── SKILL.md                           ← Wanneer/hoe context optimaliseren
│   └── references/
│       ├── strategies.md                  ← Write/Select/Compress/Isolate
│       └── anti-patterns.md              ← Context rot, poisoning, confusion
│
├── workspace-architect/
│   ├── SKILL.md                           ← Workspace inrichting & structuur
│   └── references/
│       ├── directory-patterns.md          ← Bewezen mapstructuren
│       └── config-templates.md           ← settings.json templates
│
├── skill-evolver/
│   ├── SKILL.md                           ← Meta-skill: skills evalueren & verbeteren
│   └── scripts/
│       ├── benchmark.sh                   ← Trigger-test runner
│       └── analyze-usage.sh              ← Skill-gebruik analyseren
│
├── knowledge-curator/
│   ├── SKILL.md                           ← Bronnen verwerken tot referenties
│   └── references/
│       └── source-template.md            ← Template voor REF_*.md bestanden
│
├── agent-orchestrator/
│   ├── SKILL.md                           ← Agent spawning, workflows, pools
│   └── references/
│       ├── isolation-patterns.md         ← Context-isolatie per agent
│       └── handoff-protocols.md          ← Informatie-overdracht tussen agents
│
└── self-learning-engine/
    ├── SKILL.md                           ← Zelflerende mechanismen coördineren
    └── references/
        ├── ace-patterns.md               ← ACE framework implementatie
        └── feedback-loops.md             ← Executie-feedback → skill verbetering
```

### 3.2 Skill Beschrijvingen (Pushy, voor Triggering)

#### context-engineering
> "Gebruik deze skill wanneer je nadenkt over context management, token-budget, context window optimalisatie, informatie-architectuur voor LLMs, of wanneer een agent langlopende taken uitvoert. Ook triggeren bij vragen over context rot, compaction, of wanneer gesprekken lang worden. Gebruik bij elke architectuurbeslissing die invloed heeft op wat er in het contextvenster belandt."

#### workspace-architect
> "Gebruik deze skill bij het opzetten, herstructureren, of evalueren van een workspace, project-directory, of CLAUDE.md configuratie. Triggert bij vragen over mapstructuur, .claude/ configuratie, settings-hiërarchie, globaal vs. lokaal, .claudeignore, of workspace-vervuiling. Gebruik ook wanneer een nieuw project wordt gestart of wanneer een bestaande workspace 'rommelig' aanvoelt."

#### skill-evolver
> "Meta-skill voor het evalueren, benchmarken en verbeteren van andere skills. Gebruik wanneer een skill niet goed triggert, suboptimale resultaten geeft, of wanneer je wilt meten hoe effectief een skill is. Ook triggeren bij verzoeken om skill-beschrijvingen te optimaliseren, trigger-rates te analyseren, of een skill-evaluatie cyclus uit te voeren. Dit is de zelflerende component van het skill-systeem."

#### knowledge-curator
> "Gebruik deze skill wanneer externe bronnen (URLs, papers, blogposts, documentatie) moeten worden verwerkt tot gestructureerde referentie-.md bestanden. Triggert bij 'sla deze bron op', 'maak een referentie van', 'voeg toe aan bronnen', of wanneer nieuwe kennis systematisch moet worden opgeslagen voor toekomstig gebruik."

#### agent-orchestrator
> "Gebruik deze skill bij het ontwerpen, spawnen of beheren van agent-workflows. Triggert bij vragen over sub-agents, agent-pools, parallelle agents, agent-templates, handoff-protocollen, context-isolatie tussen agents, of bij gebruik van Open Agents CLI. Gebruik ook bij multi-agent taken of wanneer werk verdeeld moet worden over meerdere parallelle processen."

#### self-learning-engine
> "Gebruik deze skill wanneer het systeem zichzelf moet evalueren en verbeteren. Triggert bij vragen over zelflerende mechanismen, feedback loops, lessons extraction, kennisaccumulatie, auto-verbetering van prompts of configuratie, of wanneer resultaten van eerdere runs moeten worden geanalyseerd om toekomstige prestaties te verbeteren. Dit is de coördinator van alle zelfrefererende processen."

---

## 4. Zelflerende Cyclus

### 4.1 Het ACE-Patroon Toegepast

```
┌─────────────────────────────────────────────┐
│             GENERATIE                        │
│  Agent voert taak uit → produceert output    │
│  + executie-metadata (tokens, tijd, fouten)  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│             REFLECTIE                        │
│  Analyseer: wat werkte? wat faalde?          │
│  Vergelijk met verwachte uitkomst            │
│  Identificeer patronen over meerdere runs    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│             CURATIE                           │
│  Gestructureerde, incrementele update:       │
│  - Voeg nieuwe inzichten toe aan skill       │
│  - Verfijn bestaande instructies             │
│  - Verwijder bewezen ineffectieve patronen   │
│  NOOIT: volledige herschrijving              │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           BENCHMARK (periodiek)              │
│  OA agent / OA workflow voert uit:           │
│  - Trigger-rate tests per skill              │
│  - Kwaliteitstest op outputs                 │
│  - Token-efficiency meting                   │
│  - Vergelijking met vorige benchmark         │
└─────────────────────────────────────────────┘
```

### 4.2 OA Agent Benchmark Workflow

Een Open Agents workflow die periodiek draait:

```
oa-benchmark-workflow/
├── 1_collect.sh        ← Verzamel recente agent-runs en outputs
├── 2_analyze.sh        ← Analyseer token-gebruik, faalpatronen, trigger-rates
├── 3_reflect.md        ← Template voor reflectie-prompt aan Claude
├── 4_propose.md        ← Template voor verbetervoorstel
└── 5_apply.sh          ← Pas goedgekeurde wijzigingen toe (na menselijke review)
```

**Belangrijk:** Stap 5 vereist altijd menselijke goedkeuring. Het systeem stelt voor, de mens beslist. Dit voorkomt runaway optimalisatie en onbedoelde drift.

### 4.3 Anti-Collapse Mechanismen

Om te voorkomen dat iteratieve verbetering kennis erodeert:

1. **Append-only updates:** Nieuwe inzichten worden toegevoegd, niet in bestaande tekst gemerged
2. **Versioning:** Elke significante wijziging krijgt een versienummer en datum
3. **Origineel behoud:** De oorspronkelijke kernformulering blijft altijd bewaard
4. **Maximale delta:** Eén benchmark-cyclus mag maximaal 20% van een skill wijzigen
5. **Rollback-punt:** Vorige versie altijd beschikbaar voor herstel

---

## 5. Workspace Content Management

### 5.1 Het Vervuilingsprobleem

Over tijd groeien workspaces met:
- Referentie .md bestanden (zoals deze)
- HTML visualisaties
- Tussenresultaten en experimentele outputs
- Verouderde documentatie

### 5.2 Oplossingsarchitectuur

```
workspace/
├── .claudeignore                    ← Sluit archief uit van scans
├── CLAUDE.md                        ← Klein, stabiel, index-functie
├── active/                          ← Actief werk (in context)
│   ├── current-research.md
│   └── current-experiment/
├── reference/                       ← Referentiemateriaal (on-demand)
│   ├── INDEX.md                     ← Navigatiekaart
│   └── sources/                     ← REF_*.md bestanden
├── archive/                         ← Voltooid werk (uit context)
│   ├── 2026-Q1/
│   └── ...
└── outputs/                         ← Deliverables
```

**.claudeignore voorbeeld:**
```
archive/
*.tmp
*.bak
node_modules/
.git/
```

### 5.3 Index als Navigatiekaart

In plaats van dat de agent de hele directory scant, verwijst CLAUDE.md naar INDEX.md bestanden die als kaart dienen. De agent leest de kaart, niet het terrein — tenzij specifiek nodig.

---

## 6. Globaal vs. Lokaal — Beslisboom

```
Moet dit in ELKE workspace werken?
├── JA → Is het stabiel (verandert <1x per maand)?
│   ├── JA → GLOBAAL (~/.claude/)
│   │   ├── Identiteit/werkstijl → CLAUDE.md
│   │   ├── Breed toepasbare skill → skills/
│   │   ├── Universeel commando → commands/
│   │   └── Standaard permissies → settings.json
│   └── NEE → GLOBAAL maar met versioning
│       └── Auto-memory → ~/.claude/projects/
│
└── NEE → Is het team-gedeeld?
    ├── JA → PROJECT SHARED (.claude/settings.json)
    │   ├── Codeerstandaarden → .claude/rules/
    │   ├── Project-agents → .claude/agents/
    │   └── Build/test commando's → CLAUDE.md
    └── NEE → PROJECT LOCAL
        └── .claude/settings.local.json
        └── CLAUDE.local.md
```

---

## 7. Volgende Stappen

### Fase 1: Fundament (nu)
- [x] Project declaratie geschreven
- [x] Essentiële bronnen opgeslagen als .md
- [ ] Globale CLAUDE.md ontwerpen en installeren
- [ ] Eerste 2-3 skills bouwen (context-engineering, workspace-architect)

### Fase 2: Skills Bouwen
- [ ] Alle 6 skills uit sectie 3.1 implementeren
- [ ] Trigger-beschrijvingen testen en optimaliseren
- [ ] Referentie-materiaal per skill invullen

### Fase 3: Zelflerende Cyclus
- [ ] OA benchmark workflow ontwerpen
- [ ] Eerste benchmark-run uitvoeren
- [ ] Anti-collapse mechanismen implementeren
- [ ] Feedback loop testen op 1 skill

### Fase 4: Schaling
- [ ] Workspace-management patronen toepassen op alle projecten
- [ ] Agent-orchestratie met Open Agents verfijnen
- [ ] Cross-project kennisdeling via globale skills valideren
