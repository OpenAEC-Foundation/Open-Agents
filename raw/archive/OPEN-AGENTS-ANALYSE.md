# Open-Agents: Status Analyse & Verbeterplan

**Repository:** https://github.com/OpenAEC-Foundation/Open-Agents  
**Datum analyse:** 8 maart 2026  
**118 commits | 2 stars | 4 open issues | Apache-2.0**

---

## 1. Wat IS Open-Agents?

Een **multi-agent orchestrator voor Claude Code** — een tmux-gebaseerde CLI (`oa`) die meerdere Claude Code agents parallel spawnt en coördineert. Geen API-key nodig, draait direct op je Claude Code abonnement.

### Kernarchitectuur (twee lagen)

```
┌─────────────────────────────────────────────────────────┐
│  LAAG 1: oa CLI (primair)                               │
│  tmux-gebaseerd · Python ≥3.11                          │
│                                                         │
│  oa start → oa run "taak" → oa status → oa watch        │
│  oa pipeline → oa delegate → oa team → oa dashboard     │
│                                                         │
│  Elke agent = eigen tmux window + workspace + CLAUDE.md │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  LAAG 2: Visual Canvas (geavanceerd)                    │
│  React Flow · Node.js backend · Assembly engine         │
│                                                         │
│  Drag-and-drop workflow builder                         │
│  160+ pre-built library agents (73 AEC-domein)          │
│  Node.js ≥20 + pnpm ≥9 vereist                         │
└─────────────────────────────────────────────────────────┘
```

### Bestaande Features

| Feature | Beschrijving | Status |
|---|---|---|
| **Parallel execution** | Meerdere agents simultaan, elk geïsoleerd | ✅ Werkt |
| **Nested spawning** | Agents maken child-agents, parent/child relaties | ✅ Werkt |
| **Proposal mode** | Agents schrijven voorstellen i.p.v. direct wijzigen | ✅ Werkt |
| **Pipeline orchestration** | Planner → parallel Workers → Combiner flow | ✅ Werkt |
| **Delegate mode** | Orchestrator-agent beheert eigen workers autonoom | ✅ Werkt |
| **Agent Teams** | Gedeelde taaklijsten, inter-agent messaging | ✅ Werkt |
| **TUI Dashboard** | Textual-gebaseerd terminal dashboard | ✅ Werkt |
| **Web UI** | Lokale React UI voor monitoring | ✅ Werkt |
| **Visual Canvas** | Drag-and-drop workflow builder | ✅ Beschikbaar |
| **160+ library agents** | Pre-built agents incl. 73 AEC-domein | ✅ Beschikbaar |
| **Templates** | Agent-templates directory | ✅ Aanwezig |
| **LESSONS.md** | Geleerde lessen vastgelegd | ✅ Aanwezig |

---

## 2. De Wie/Wat/Wanneer/Hoe/Waarom Analyse

### WIE gebruikt dit?

- **Primair:** Jijzelf als solo-developer/architect binnen OpenAEC Foundation
- **Potentieel:** Andere Claude Code gebruikers die multi-agent workflows willen
- **Probleem:** 2 stars, 0 forks — minimale community-adoptie tot nu toe

**Vraag:** Is dit een intern productiviteitstool of een open-source product voor anderen? Die keuze bepaalt alles.

### WAT doet het precies?

Het bouwt een **orchestratielaag bovenop Claude Code** via tmux. In essentie:

1. `oa run "taak"` → spawnt `claude` CLI proces in een nieuwe tmux window
2. Elke agent krijgt een eigen werkdirectory + eigen CLAUDE.md
3. `oa pipeline` → splitst complexe taken automatisch op in parallelle subtaken
4. `oa delegate` → geeft een orchestrator-agent de autonomie om zelf workers te spawnen

Dit is fundamenteel een **Isolate-strategie** uit het context engineering framework: elke agent heeft zijn eigen contextvenster, waardoor context rot wordt voorkomen.

### WANNEER is het nuttig?

- Taken die te groot zijn voor één Claude Code sessie
- Taken die paralleliseerbaar zijn (bv. tests schrijven + code schrijven + docs schrijven)
- Complexe workflows die meerdere stappen en handoffs vereisen
- Wanneer je context wilt isoleren per deeltaak

### HOE werkt het technisch?

```
Gebruiker
   │
   ▼
oa CLI (Python)
   │
   ├─→ tmux session "oa-agents"
   │      ├─→ window: agent-1 (claude CLI + workspace-1)
   │      ├─→ window: agent-2 (claude CLI + workspace-2)
   │      └─→ window: agent-3 (claude CLI + workspace-3)
   │
   ├─→ Status tracking (JSON/filesystem)
   │
   └─→ Web UI / TUI Dashboard (optioneel)
```

**Kernmechanisme:** tmux als process-isolatie. Elke agent is een apart `claude` CLI-proces. Communicatie gaat via het filesystem (gedeelde bestanden, taaklijsten).

### WAAROM bestaat het?

Claude Code heeft native sub-agents (via SDK), maar:
- Die zijn beperkt tot programmatische aanroep
- Geen visuele monitoring
- Geen persistent teams/pools
- Geen drag-and-drop workflow builder

Open-Agents vult dit gat door een **gebruikersgerichte orchestratielaag** te bieden.

---

## 3. Sterkte-analyse

### Wat is GOED

1. **Architectuurkeuze tmux** — Simpel, robuust, zero-dependency proces-isolatie. Geen complexe IPC nodig.

2. **Agent-isolatie = Context Engineering best practice** — Elke agent krijgt eigen workspace + CLAUDE.md. Dit is precies de "Isolate"-strategie die Anthropic en LangChain aanbevelen.

3. **Proposal mode** — Agents schrijven voorstellen in plaats van direct te wijzigen. Dit is de "human-in-the-loop" gate die voorkomt dat agents onbedoelde schade aanrichten.

4. **Pipeline als architectuurpatroon** — Planner → Workers → Combiner is een bewezen patroon uit de distributed systems wereld.

5. **160+ pre-built agents** — Significante investering in herbruikbare agent-templates, inclusief AEC-domein specifiek.

6. **Bestaande infra** — CLAUDE.md, LESSONS.md, CONTRIBUTING.md, CHANGELOG.md, SECURITY.md, .claude/ directory, .github/, docker/ — de basis is professioneel opgezet.

7. **Dual interface** — CLI voor power users + Web UI voor visueel ingestelden. Visual Canvas voor workflow design.

### Wat ONTBREEKT (kritiek)

1. **Geen zelflerende cyclus** — Agents leren niets van hun runs. Resultaten verdwijnen na voltooiing. Geen feedback loop naar templates of configuratie.

2. **Geen context engineering bewustzijn** — Geen token-tracking, geen compaction-strategie, geen monitoring van context rot over langlopende agent-runs.

3. **Geen gestructureerde agent-output logging** — Hoe goed presteerde een agent? Hoeveel tokens verbruikt? Welke fouten gemaakt? Dit wordt niet systematisch vastgelegd.

4. **Agent-agent communicatie is primitief** — Via filesystem. Geen gestructureerd protocol voor handoffs, geen formele interface-contracten.

5. **Geen skill-integratie** — De agents gebruiken geen skill-systeem. Elke agent krijgt een CLAUDE.md maar geen modulaire skills die progressive disclosure toepassen.

6. **Documentatie is code-gericht** — README beschrijft features en commando's, niet de *waarom* en *wanneer*. Geen architectuurdocumentatie die het conceptuele model uitlegt.

7. **Visual Canvas is losstaand** — De twee lagen (oa CLI + Visual Canvas) voelen als aparte projecten in dezelfde repo. Onduidelijk hoe ze samenhangen.

---

## 4. Verbeterplan — Gekoppeld aan Context Engineering Principes

### 4.1 Zelflerende Agent Cyclus (ACE-patroon)

**Probleem:** Agents leren niets van hun runs.  
**Oplossing:** Implementeer het ACE-patroon (Generatie → Reflectie → Curatie).

```
oa run "taak"
   │
   ▼
Agent voert uit → produceert output + metadata
   │
   ▼
oa reflect <agent-id>              ← NIEUW
   │  Analyseert: tokens, tijd, fouten, kwaliteit
   │  Vergelijkt met vergelijkbare eerdere runs
   │
   ▼
oa learn <agent-id>                ← NIEUW
   │  Extraheert lessen → LESSONS.md (gestructureerd)
   │  Stelt template-verbeteringen voor
   │  Append-only updates (anti-collapse)
   │
   ▼
Templates evolueren over tijd
```

**Implementatie:**
- Elk agent-run krijgt een `run-log.json` met: start/eind tijd, token-schatting, exit-status, samenvatting
- `oa reflect` spawnt een analyse-agent die de run evalueert
- `oa learn` past bevindingen toe op agent-templates (met menselijke goedkeuring)

### 4.2 Context Engineering Instrumentatie

**Probleem:** Geen zicht op token-verbruik en context-gezondheid.  
**Oplossing:** Token-tracking per agent inbouwen.

```
oa status --context                ← NIEUW

Agent          Tokens    Window%   Health
────────────   ──────    ───────   ──────
planner        12.4K     12%       ● Groen
worker-1       89.2K     71%       ● Oranje  ← overweeg compaction
worker-2       34.1K     27%       ● Groen
combiner       45.8K     37%       ● Groen
```

**Implementatie:**
- Lees Claude Code's context window statistieken (beschikbaar via status-line API)
- Automatische compaction-suggestie boven 60%
- Log historische context-groei per agent-type

### 4.3 Gestructureerde Agent-Agent Communicatie

**Probleem:** Agents communiceren via losse bestanden — geen contract, geen schema.  
**Oplossing:** Handoff-protocol definiëren.

```yaml
# handoff.yaml — formeel overdrachtsprotocol
from: planner
to: worker-1
type: task_assignment
payload:
  task: "Implementeer email validatie"
  context:
    - file: src/validators.py
    - constraint: "Gebruik geen externe packages"
  expected_output:
    format: "Python module + tests"
    success_criteria:
      - "Alle tests passeren"
      - "Type hints aanwezig"
```

**Voordeel:** Elke handoff is traceerbaar, evalueerbaar en reproduceerbaar. Dit maakt de zelflerende cyclus mogelijk — je kunt analyseren welke handoff-instructies tot goede resultaten leiden.

### 4.4 Skill-Integratie

**Probleem:** Agents krijgen platte CLAUDE.md instructies, geen modulaire skills.  
**Oplossing:** Agent-templates koppelen aan skills.

```
agents/
├── planner/
│   ├── CLAUDE.md            ← Basis agent-instructies
│   └── skills/
│       ├── task-decomposition.md  ← Skill: hoe taken op te splitsen
│       └── estimation.md          ← Skill: tijdsinschatting
├── code-worker/
│   ├── CLAUDE.md
│   └── skills/
│       ├── testing.md             ← Skill: testpatronen
│       └── error-handling.md      ← Skill: foutafhandeling
```

**Voordeel:** Skills kunnen onafhankelijk geëvolueerd worden. Een verbetering in de "testing" skill verbetert automatisch alle code-worker agents.

### 4.5 Workspace Hygiëne

**Probleem:** Agent workspaces accumuleren bestanden zonder opschoning.  
**Oplossing:** Lifecycle management per workspace.

```
oa cleanup --older-than 7d        ← NIEUW: archiveer oude workspaces
oa archive <agent-id>             ← NIEUW: archiveer + bewaar metadata
oa gc                             ← NIEUW: garbage collect verlopen runs
```

**Principe:** Actieve werkbestanden in workspace, metadata en lessen apart opgeslagen, voltooide runs gearchiveerd met alleen de samenvatting bewaard.

### 4.6 OA Benchmark Workflow (zelfreferentie)

**Probleem:** Geen manier om te meten of Open-Agents zelf beter wordt.  
**Oplossing:** Een meta-workflow die OA gebruikt om OA te evalueren.

```bash
# Periodieke benchmark: OA evalueert zichzelf
oa pipeline "Evalueer de laatste 10 agent-runs: \
  - Analyseer token-efficiency \
  - Identificeer herhaalde faalpatronen \
  - Stel 3 concrete verbeteringen voor aan agent-templates \
  - Schrijf resultaten naar BENCHMARK_RESULTS.md"
```

Dit is de ultieme zelfreferentie: het systeem gebruikt zichzelf om zichzelf te verbeteren.

---

## 5. Strategische Positionering

### Vergelijking met het Landschap

| Tool | Focus | Verschil met OA |
|---|---|---|
| Claude Code native sub-agents | Programmatisch | OA = gebruikersgericht, visueel, persistent |
| OpenAgentsControl (darrenhinde) | Pattern-matching, approval gates | OA = orchestratie, parallellisme, AEC-domein |
| openagents-org/openagents | Agent Networks, multi-protocol | OA = Claude Code specifiek, simpeler |
| LangChain/LangGraph | Framework voor agent-ketens | OA = zero-code, tmux-gebaseerd |

**Unieke positie van OA:** Het is de enige tool die Claude Code subscription direct gebruikt (geen API-key), tmux voor zero-dependency isolatie, en een AEC-domein focus heeft.

### Aanbeveling: Positionering

Kies één van twee richtingen:

**Optie A: Intern Productiviteitstool**
- Focus op jouw eigen workflows en AEC-domein
- Geen noodzaak voor uitgebreide documentatie voor buitenstaanders
- Snel itereren op wat jij nodig hebt
- Skills en templates als kennisbasis voor je eigen werk

**Optie B: Open-Source Product**
- Investeer in documentatie, tutorials, voorbeelden
- Vereenvoudig installatie (npm package? pip install?)
- Marketing: blogposts, demo-video's
- Community building: goede issues, discussion templates

**Mijn aanbeveling:** Begin met Optie A, maar bouw het zo dat Optie B later mogelijk is. Dit betekent: goede architectuur, duidelijke scheiding van concerns, en documentatie die eerst voor jezelf werkt.

---

## 6. Prioriteiten (gerankt)

| # | Verbetering | Impact | Effort | Waarom eerst? |
|---|---|---|---|---|
| 1 | **Run-logging** (run-log.json per agent) | Hoog | Laag | Fundament voor alles hierna |
| 2 | **Context tracking** (oa status --context) | Hoog | Medium | Maakt context engineering meetbaar |
| 3 | **Zelflerende cyclus** (oa reflect + oa learn) | Hoog | Medium | Kerndoel van dit project |
| 4 | **Handoff-protocol** (handoff.yaml) | Medium | Medium | Verbetert multi-agent betrouwbaarheid |
| 5 | **Skill-integratie** per agent-type | Medium | Medium | Modulaire verbetering van agent-kwaliteit |
| 6 | **Workspace lifecycle** (oa cleanup/archive/gc) | Medium | Laag | Voorkomt vervuiling |
| 7 | **Self-benchmark** workflow | Hoog | Laag | Kan gebouwd worden zodra 1-3 bestaan |

---

## 7. Directe Actie-items

### Deze week
- [ ] Inventariseer de huidige 4 open issues — wat is de status?
- [ ] Bekijk de `agents/` directory structuur — wat zijn de 160+ agents precies?
- [ ] Bekijk `LESSONS.md` — wat is er al geleerd?
- [ ] Bepaal: Optie A of Optie B?

### Volgende sprint
- [ ] Implementeer run-log.json per agent-run
- [ ] Bouw `oa status --context` prototype
- [ ] Ontwerp handoff.yaml schema
- [ ] Koppel eerste skill aan een agent-template

### Dit kwartaal
- [ ] Volledige zelflerende cyclus operationeel
- [ ] Self-benchmark workflow draaiend
- [ ] Context engineering instrumentatie compleet
- [ ] Architectuurdocumentatie die conceptueel model uitlegt
