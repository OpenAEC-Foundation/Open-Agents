# Project Declaration: Context Engineering & Agentic Workspace Architecture

**Versie:** 1.0  
**Datum:** 8 maart 2026  
**Auteur:** OpenAEC Foundation  
**Status:** Actief — Doorlopend onderzoek & kennisopbouw

---

## 1. Missie

Dit project is gewijd aan het systematisch doorgronden, documenteren en toepassen van **context engineering** — de discipline die bepaalt hoe AI-systemen presteren door het optimaal inrichten van de informatie die beschikbaar is binnen het contextvenster van een Large Language Model.

Wij geloven dat de volgende fase van AI-productiviteit niet wordt ontgrendeld door betere modellen alleen, maar door betere **architectuur rondom die modellen**: hoe je context samenstelt, beheert, isoleert, comprimeert en laat evolueren.

---

## 2. Intenties

### 2.1 Primair: Begrip & Kennis

> *Wie, wat, waarom, wanneer, hoe — zijn essentiële vragen. Systems engineering is essentieel.*

We willen op **abstract én praktisch niveau** begrijpen:

- **Wat is context engineering?** De overgang van prompt engineering naar de bredere discipline van het architectureel ontwerpen van informatiesystemen rond LLMs. Anthropic definieert het als *"de set van strategieën voor het cureren en onderhouden van de optimale set tokens tijdens LLM-inferentie"* — inclusief alle informatie die buiten de prompts in het contextvenster belandt.
- **Waarom is het kritiek?** Context rot — het verschijnsel dat modelperformance degradeert naarmate het contextvenster voller raakt — maakt context tot een *eindige bron met afnemende meeropbrengsten*. Een gefocuste context van 300 tokens presteert vaak beter dan een ongerichte context van 113.000 tokens.
- **Hoe werkt het mechanisch?** Het contextvenster als werkgeheugen (Karpathy's RAM-analogie), token-budgetten, aandachtsverdeling, en de vier kernstrategieën: **Write, Select, Compress, Isolate**.
- **Wie doet baanbrekend werk?** Anthropic, LangChain, Cognition AI (Devin), academisch onderzoek (ACE framework), individuele practitioners met productie-ervaring.

### 2.2 Secundair: Praktische Toepassing

We willen deze kennis direct toepassen op:

- Onze eigen workspaces (Claude Code, Claude.ai Projects, Cowork)
- Onze agent-architecturen (Open Agents CLI)
- Onze skill-bibliotheken en configuratiesystemen
- Productie-workflows voor BIM/AEC-toepassingen

### 2.3 Tertiair: Zelfreferentie & Zelflerend Systeem

We willen mechanismen bouwen waarin:

- Het systeem zichzelf documenteert en verbetert
- Kennis automatisch wordt geëxtraheerd uit conversatiegeschiedenis
- Content zichzelf organiseert en opbouwt over tijd
- Workspace-vervuiling wordt voorkomen door bewuste architectuurkeuzes

---

## 3. Onderzoeksdomeinen

### 3.1 Context Engineering — Fundamenten

| Aspect | Kernvraag |
|---|---|
| **Context Window** | Hoe werkt het als werkgeheugen? Wat zijn de limieten en trade-offs? |
| **Context Rot** | Hoe degradeert performance bij groeiende context? Meetmethoden? |
| **Write** | Hoe schrijf je effectief naar context? Scratchpads, geheugen, notities. |
| **Select** | Hoe selecteer je de juiste informatie? RAG, tool-beschrijvingen, dynamisch laden. |
| **Compress** | Hoe comprimeer je context? Samenvatting, trimming, heuristieken. |
| **Isolate** | Hoe isoleer je context? Sub-agents, sandboxing, state-objecten. |

**Bronnen:**
- Anthropic: [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- LangChain: [Context Engineering for Agents](https://blog.langchain.com/context-engineering-for-agents/)
- Academisch: [A Survey of Context Engineering for LLMs](https://arxiv.org/abs/2507.13334) (1400+ papers geanalyseerd)
- Academisch: [Agentic Context Engineering (ACE)](https://arxiv.org/abs/2510.04618) — zelflerende, evoluerende contexten

### 3.2 Workspace Architectuur

De architectuur van een AI-workspace is een **hiërarchisch configuratiesysteem** met meerdere scopes:

```
┌─────────────────────────────────────────────────┐
│  MANAGED (Hoogste prioriteit)                   │
│  Server-managed > MDM/OS > managed-settings.json│
├─────────────────────────────────────────────────┤
│  PROJECT LOCAL (.claude/settings.local.json)     │
│  Persoonlijke project-specifieke instellingen    │
├─────────────────────────────────────────────────┤
│  PROJECT SHARED (.claude/settings.json)          │
│  Team-gedeelde instellingen (version control)    │
├─────────────────────────────────────────────────┤
│  USER GLOBAL (~/.claude/settings.json)           │
│  Persoonlijke globale instellingen               │
└─────────────────────────────────────────────────┘
```

**Kernvraagstuk:** Wat stel je in op welk niveau?

- **Global level (`~/.claude/`):** Identiteit, algemene gedragsinstructies, cross-project tools, standaard permissies, globale CLAUDE.md
- **Project level (`.claude/`):** Project-specifieke agents, commands, MCP-servers, codeerstandaarden, teamafspraken
- **Local level (`.claude/settings.local.json`):** Persoonlijke overrides die niet in version control horen

**Bronnen:**
- Anthropic officieel: [Claude Code Settings](https://code.claude.com/docs/en/settings)
- Community: [ClaudeLog Configuration Guide](https://claudelog.com/configuration/)

### 3.3 Skills — Anatomie & Engineering

Skills zijn het mechanisme waarmee Claude modulaire expertise laadt, alleen wanneer relevant.

```
skill-name/
├── SKILL.md          (verplicht — YAML frontmatter + instructies)
│   ├── name          (identifier)
│   ├── description   (triggering-mechanisme — "pushy" formuleren)
│   └── body          (instructies, <500 regels ideaal)
└── Bundled Resources (optioneel)
    ├── scripts/      (uitvoerbare code voor deterministische taken)
    ├── references/   (documentatie, on-demand geladen)
    └── assets/       (templates, fonts, iconen)
```

**Drie-laags laden (Progressive Disclosure):**
1. **Metadata** — Altijd in context (~100 woorden): naam + beschrijving
2. **SKILL.md body** — Geladen bij trigger (<500 regels)
3. **Bundled resources** — On-demand (onbeperkt)

**Kernprincipe:** Skills houden het contextvenster schoon door alleen te laden wanneer nodig. Een ontwikkelaar met 40+ skills (zoals Freek Van der Herten van Spatie) ervaart geen context-overhead zolang de progressive disclosure correct werkt.

**Bronnen:**
- Anthropic Skill Creator: interne skill-documentatie (zie `/mnt/skills/examples/skill-creator/SKILL.md`)
- Community: [Freek Van der Herten's Claude Code Setup](https://freek.dev/3026-my-claude-code-setup)

### 3.4 Agentic Architectuur

| Concept | Beschrijving | Kernvraag |
|---|---|---|
| **Agent Spawning** | Sub-agents aanmaken met eigen context | Hoe isoleer je context per agent? |
| **Agent Pools** | Groepen agents die parallel werken | Hoe beheer je resource-allocatie? |
| **Agent Templates** | Herbruikbare agent-configuraties | Wat is de optimale template-structuur? |
| **Agent Workflows** | Geketende agent-taken | Hoe ontwerp je handoffs tussen agents? |
| **Open Agents** | CLI-extensie voor het spawnen van agents | Hoe integreert dit met het bredere ecosysteem? |

**Open Agents** ([github.com/OpenAEC-Foundation/Open-Agents](https://github.com/OpenAEC-Foundation/Open-Agents)) is onze eigen CLI-extensie die agents kan spawnen met eigen werkruimtes. Dit is een kernstuk van ons onderzoek naar hoe agent-isolatie in de praktijk werkt.

**Relevante concepten uit de industrie:**
- Cognition AI gebruikt fine-tuned modellen voor samenvatting bij agent-agent boundaries om tokengebruik te reduceren
- LangGraph behandelt contextstromen als code — prompts, tools en geheugen als programmeerbare ketens
- ACE (Agentic Context Engineering) behandelt contexten als *evoluerende playbooks* die strategieën accumuleren via generatie, reflectie en curatie

### 3.5 Globaal vs. Lokaal — Het Scope-Vraagstuk

Dit is een architectuurvraagstuk dat op meerdere niveaus speelt:

**Claude Code (filesystem-niveau):**
```
~/.claude/                          ← GLOBAAL
├── CLAUDE.md                       ← Identiteit, universele regels
├── settings.json                   ← Standaard permissies, model
├── commands/                       ← Globale slash commands
└── todolist.md                     ← Cross-project taken

~/project-x/.claude/                ← LOKAAL (project)
├── CLAUDE.md                       ← Project-specifieke context
├── settings.json                   ← Team-gedeeld (git tracked)
├── settings.local.json             ← Persoonlijk (gitignored)
├── commands/                       ← Project commands
└── agents/                         ← Project-specifieke agents
```

**Claude.ai (platform-niveau):**
- Geheugen (memory) = globaal cross-conversatie
- Projects = afgebakende contexten met eigen kennis
- Incognito = geen geheugen, geen persistentie

**Ontwerpprincipe:** Begin globaal, verfijn lokaal. Experimenteer lokaal, promoveer naar globaal wat bewezen werkt.

### 3.6 Workspace Vervuiling & Contextbeheer

**Probleem:** Een workspace accumuleert over tijd steeds meer bestanden — .md documentatie, .html visualisaties, tussenresultaten, oude versies. Vervuilt dit de context?

**Analyse:**
- Bestanden in een workspace worden **niet automatisch in het contextvenster geladen** — alleen wanneer expliciet gelezen of wanneer CLAUDE.md ernaar verwijst
- Echter: bij het scannen van de directorystructuur (wat agents doen om context op te bouwen) groeit de ruis
- **Mitigatie-strategieën:**
  - Duidelijke mappenstructuur met scheiding tussen actief/archief
  - `.claudeignore` bestanden om irrelevante mappen uit te sluiten
  - Periodieke opschoning en consolidatie
  - Indexbestanden die als navigatiekaart dienen (in plaats van dat de agent alles scant)

### 3.7 Zelfreferentie & Zelflerende Systemen

Dit is het meest ambitieuze vraagstuk: systemen die zichzelf verbeteren.

**Mechanismen die we onderzoeken:**

1. **Lessons Extraction** — Automatische kennisextractie uit conversatiegeschiedenis (zie onze `project-lessons-extractor` skill)
2. **Evolving Playbooks (ACE)** — Contexten die strategieën accumuleren, verfijnen en organiseren via generatie, reflectie en curatie — zonder het informatieverlies van naïeve samenvattingen
3. **Memory User Edits** — Het sturen van Claude's geheugen via expliciete instructies
4. **Self-documenting Workflows** — Agents die hun eigen beslissingen en resultaten vastleggen
5. **Feedback Loops** — Resultaten van agents gebruiken als input voor skill-optimalisatie

**Risico: Context Collapse** — Het verschijnsel dat iteratieve herschrijving details erodeert over tijd. Het ACE-framework adresseert dit met gestructureerde, incrementele updates die gedetailleerde kennis behouden.

---

## 4. Methode & Aanpak

### 4.1 Onderzoeksmethode

We hanteren een **iteratieve, evidence-based aanpak**:

1. **Bronnenonderzoek** — Officiële documentatie, academische papers, community-ervaringen
2. **Experimentatie** — Hands-on testen in onze eigen workspaces
3. **Documentatie** — Bevindingen vastleggen in gestructureerde .md bestanden
4. **Visualisatie** — Technische concepten visueel maken in HTML/SVG/Mermaid
5. **Validatie** — Terugkoppeling naar bronnen, peer review binnen het team

### 4.2 Deliverables

| Type | Formaat | Doel |
|---|---|---|
| Conceptuele uitleg | `.md` | Diep begrip van mechanismen |
| Visuele schema's | `.html` / `.svg` / `.mermaid` | Technische architectuurvisualisaties |
| Werkende voorbeelden | Code + configuratie | Reproduceerbare setups |
| Best practices | `.md` | Actionable richtlijnen |
| Skill templates | SKILL.md structuren | Herbruikbare patronen |
| Lessons databases | `LESSONS_V[x].md` | Geëxtraheerde kennis uit experimenten |

### 4.3 Organisatie van dit Project

```
project-root/
├── PROJECT_DECLARATION.md          ← Dit document
├── research/
│   ├── context-engineering/        ← Fundamenten & theorie
│   ├── workspace-architecture/     ← Configuratie & scopes
│   ├── skills/                     ← Skill engineering
│   ├── agentic-systems/            ← Agent architectuur
│   └── self-learning/              ← Zelfreferentie mechanismen
├── examples/
│   ├── visualizations/             ← HTML/SVG technische schema's
│   ├── configurations/             ← Werkende configs (global/local)
│   └── skills/                     ← Voorbeeld-skills
├── experiments/                    ← Hands-on tests & resultaten
└── LESSONS.md                      ← Doorlopende kennisextractie
```

---

## 5. Bronnenregister

### 5.1 Primaire Bronnen (Anthropic)

| Bron | URL | Onderwerp |
|---|---|---|
| Context Engineering Blog | [anthropic.com/engineering/...](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Officiële Anthropic visie op context engineering |
| Claude Code Settings | [code.claude.com/docs/en/settings](https://code.claude.com/docs/en/settings) | Hiërarchisch configuratiesysteem |
| Claude Code Docs Map | [docs.anthropic.com/.../claude_code_docs_map.md](https://docs.anthropic.com/en/docs/claude-code/claude_code_docs_map.md) | Navigatie door alle Claude Code documentatie |
| Prompt Engineering | [docs.claude.com/.../prompt-engineering](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview) | Fundamenten van prompt design |
| Claude.ai Help Center | [support.claude.com](https://support.claude.com) | Platform-specifieke documentatie |

### 5.2 Academische Bronnen

| Paper | Referentie | Kernbijdrage |
|---|---|---|
| Survey of Context Engineering | [arXiv:2507.13334](https://arxiv.org/abs/2507.13334) | Taxonomie over 1400+ papers |
| Agentic Context Engineering (ACE) | [arXiv:2510.04618](https://arxiv.org/abs/2510.04618) | Zelflerende, evoluerende contexten |

### 5.3 Industrie & Community

| Bron | URL | Relevantie |
|---|---|---|
| LangChain Blog | [blog.langchain.com/context-engineering-for-agents](https://blog.langchain.com/context-engineering-for-agents/) | Write/Select/Compress/Isolate framework |
| Prompting Guide | [promptingguide.ai/.../context-engineering-guide](https://www.promptingguide.ai/guides/context-engineering-guide) | Praktische gids met multi-agent voorbeeld |
| FlowHunt Definitive Guide | [flowhunt.io/blog/context-engineering](https://www.flowhunt.io/blog/context-engineering/) | Uitgebreide uitleg met historische context |
| Weaviate Blog | [weaviate.io/blog/context-engineering](https://weaviate.io/blog/context-engineering) | Memory & retrieval voor AI agents |
| Freek Van der Herten | [freek.dev/3026](https://freek.dev/3026-my-claude-code-setup) | Praktijkervaring: 40+ skills, config-filosofie |
| Open Agents | [github.com/OpenAEC-Foundation/Open-Agents](https://github.com/OpenAEC-Foundation/Open-Agents) | Eigen CLI voor agent spawning |

---

## 6. Kernprincipes

1. **Context is een eindige bron** — Behandel het contextvenster als schaars werkgeheugen met afnemende meeropbrengsten
2. **Architectuur boven prompts** — De structuur rondom het model bepaalt de uitkomst meer dan de individuele prompt
3. **Progressive disclosure** — Laad informatie alleen wanneer nodig, op het juiste abstractieniveau
4. **Scope-bewustzijn** — Weet wat globaal hoort en wat lokaal, en waarom
5. **Meetbaarheid** — Zonder observeerbaarheid (token-tracking, tracing) is optimalisatie giswerk
6. **Zelfreferentie** — Het systeem moet zichzelf kunnen documenteren, evalueren en verbeteren
7. **Isolatie als kracht** — Verschillende taken vereisen verschillende informatie; niet alles hoort in één context

---

*Dit document evolueert mee met het project. Elke bevinding, elk experiment en elke les die we leren wordt teruggekoppeld naar deze declaratie en de onderliggende kennisstructuur.*
