# feat: Skill System per Agent Type — modulaire expertise per agent

**Labels:** `self-improvement` `priority-medium` `context-engineering`  
**Depends on:** niets (onafhankelijk)

## Probleem

Alle agent-kennis zit in monolithische CLAUDE.md bestanden. Dit schaalt niet: als een planner-agent beter moet worden in taakdecompositie, moet je de hele CLAUDE.md bewerken. Skills die voor meerdere agent-types relevant zijn, moeten gekopieerd worden.

## Oplossing

Skills als modulaire kennis-eenheden die per agent-type geladen worden, met progressive disclosure (alleen laden wanneer relevant).

### Structuur

```
agents/
├── planner/
│   ├── CLAUDE.md                     ← Kern: identiteit + gedrag
│   └── skills/
│       ├── task-decomposition/
│       │   └── SKILL.md              ← Hoe taken effectief opsplitsen
│       ├── estimation/
│       │   └── SKILL.md              ← Tijds- en complexiteitsinschatting
│       └── context-budget/
│           └── SKILL.md              ← Hoeveel context per worker alloceren
│
├── code-worker/
│   ├── CLAUDE.md
│   └── skills/
│       ├── testing/
│       │   └── SKILL.md              ← Testpatronen en coverage
│       ├── error-handling/
│       │   └── SKILL.md              ← Robuuste foutafhandeling
│       └── code-review/
│           └── SKILL.md              ← Zelf-review voor kwaliteit
│
└── shared-skills/                     ← Gedeeld over agent-types
    ├── file-management/
    │   └── SKILL.md
    └── communication/
        └── SKILL.md                   ← Hoe output structureren voor handoffs
```

### Agent CLAUDE.md wordt compact

```markdown
# Planner Agent

## Rol
Je decomposeert complexe taken in parallelle subtaken voor worker agents.

## Kerngedrag
- Analyseer eerst de scope voordat je decomposeert
- Produceer een tasks.json met gestructureerde subtaken
- Elke subtaak bevat: beschrijving, context_files, success_criteria, priority

## Skills
Raadpleeg skills/ voor gedetailleerde kennis over:
- task-decomposition: patronen voor effectieve decompositie
- estimation: hoe complexiteit en duur in te schatten  
- context-budget: hoeveel context per worker te alloceren
```

### Voordelen voor zelflering

Skills kunnen **onafhankelijk geëvolueerd** worden:
- Een verbetering in `shared-skills/communication/` verbetert alle agent-types
- Skills kunnen eigen success-metrics hebben
- De skill-evolver (#4 uit het architectuurdocument) kan per skill optimaliseren
- Nieuwe skills kunnen automatisch gegenereerd worden uit lessons (#5)

## Acceptatiecriteria

- [ ] Agent-templates ondersteunen een `skills/` subdirectory
- [ ] Skills worden geladen in de agent's CLAUDE.md context bij spawn
- [ ] Shared skills worden geresolved vanuit `agents/shared-skills/`
- [ ] `oa agent-info <name>` toont welke skills geladen zijn
- [ ] Skills zijn onafhankelijk bewerkbaar zonder de agent CLAUDE.md te wijzigen
