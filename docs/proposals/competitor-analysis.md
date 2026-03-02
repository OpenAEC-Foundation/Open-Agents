# Competitor Analysis: AI CLI Tools
**Datum:** 2026-03-02
**Doelstelling:** Vergelijk populaire AI CLI/coding tools met oa-cli en identificeer onze Unique Selling Points.

---

## 1. Tool Analyses

---

### 1.1 Aider (aider-chat)

**Installatie:**
```bash
pip install aider-chat
# of via pipx:
pipx install aider-chat
```
- Python-gebaseerd, pip/pipx primair
- Vereist: Python 3.10+, git-repository aanwezig

**Eerste run experience:**
```bash
aider --model gpt-4o
```
- Start direct in interactieve CLI loop
- Scant automatisch de git-repo
- Vraagt welke bestanden je wilt bewerken: `/add file.py`
- Laat diff zien + vraagt bevestiging voor elke wijziging

**Hoe start je een taak:**
- Typ gewoon je verzoek in de chat
- Bestanden toevoegen: `/add`, `/drop`
- Commit message wordt automatisch gegenereerd
- Git-integratie is kern van de workflow

**Multi-agent support / Orchestratie:**
- **Geen** native multi-agent orchestratie
- Eén model, één sessie
- Wel: architect-mode (plan → code, twee LLM-calls in serie)
- Geen parallelle agents of task-decomposition

**UI:**
- Terminal-only (Rich-gebaseerde TUI)
- Geen web UI, geen desktop app
- Browser-based diff view mogelijk via `--browser`

**Wat doen zij goed:**
- Uitstekende git-integratie (auto-commit, diff views)
- Breed model-support (OpenAI, Anthropic, Ollama, etc.)
- Linting/test loop na elke wijziging
- Repository map (RAG-achtige context van de gehele codebase)
- Sterke community, actief onderhouden

**Wat missen zij (dat wij hebben):**
- Geen multi-agent orchestratie
- Geen parallelle taakverdeling
- Geen agent-to-agent communicatie
- Geen gedefinieerd "workflow" systeem voor complexe taken

---

### 1.2 Goose (block/goose)

**Installatie:**
```bash
# via Homebrew (macOS/Linux):
brew install block/tap/goose

# of binary download:
curl -fsSL https://github.com/block/goose/releases/latest/download/install.sh | bash

# via pip (oudere versie):
pip install goose-ai
```

**Eerste run experience:**
```bash
goose session start
```
- Vraagt om API-key configuratie bij eerste start
- Interactieve REPL-sessie
- Laadt automatisch MCP-servers die geconfigureerd zijn
- Extensies (tools) worden bij start gedetecteerd

**Hoe start je een taak:**
- Vrij-tekst instructies in de chat
- Goose plant zelf de stappen en voert uit
- Tool-gebruik (shell, bestandssysteem, web) is ingebouwd
- Sessies kunnen opgeslagen en hervat worden

**Multi-agent support / Orchestratie:**
- **Beperkt** — Goose heeft "sub-agents" als experimentele feature
- Primair: één agent per sessie
- MCP (Model Context Protocol) voor tooling
- Geen volwassen multi-agent workflow

**UI:**
- Terminal-only primair
- Electron-gebaseerde desktop app beschikbaar (Goose Desktop)
- Geen web UI

**Wat doen zij goed:**
- Extensies-systeem via MCP is krachtig en flexibel
- Goede tool-integratie (browser, shell, bestanden)
- Sessie-management (pause/resume)
- Open source, actieve community (Square/Block achter)
- Breed model-support

**Wat missen zij (dat wij hebben):**
- Geen volwassen multi-agent orchestratie
- Geen declaratieve task-pipelines
- Agents werken niet samen aan dezelfde taak
- Geen gespecialiseerde agent-rollen

---

### 1.3 Claude Code (Anthropic)

**Installatie:**
```bash
npm install -g @anthropic-ai/claude-code
```
- Node.js/npm-gebaseerd
- Vereist: Node.js 18+, Anthropic API-key

**Eerste run experience:**
```bash
claude
```
- Start interactieve chat in terminal
- Automatisch: lees CLAUDE.md als aanwezig
- Vraagt permissions voor file-operaties
- Permission-systeem: allow/deny per tool-call

**Hoe start je een taak:**
- Vrij-tekst in de chat
- `/` commands voor speciale acties (help, clear, etc.)
- Bestanden worden automatisch gelezen als relevant
- Bash-commando's worden uitgevoerd met toestemming

**Multi-agent support / Orchestratie:**
- **Ja** — ingebouwde Agent tool
- Subagents kunnen gelanceerd worden (specialized: Explore, Plan, etc.)
- Parallelle agent-lancering mogelijk
- Worktree-isolatie voor agents
- Agents kunnen achtergrond-taken uitvoeren

**UI:**
- Terminal-only (primair)
- IDE-integraties: VS Code, JetBrains (via extension)
- Geen standalone web UI

**Wat doen zij goed:**
- Sterke agentic capabilities ingebouwd
- Permission-systeem is veilig en transparant
- Goede tool-set (Glob, Grep, Read, Edit, Write, Bash)
- CLAUDE.md voor project-instructies
- Hooks-systeem voor workflow-aanpassing
- Worktree-isolatie

**Wat missen zij (dat wij hebben):**
- Dit is de basis die wij wrappen
- Oa-cli voegt orchestratie-laag toe bovenop claude-code
- Gedecentraliseerde multi-agent workflows die claude-code zelf niet biedt

---

### 1.4 Cursor

**Installatie:**
- Download `.dmg` / `.exe` / `.AppImage` van cursor.sh
- Geen CLI-installatie — puur desktop app
- Fork van VS Code

**Eerste run experience:**
- Opent als volledig IDE (VS Code-achtig)
- Vraagt API-key of inlog op cursor.sh account
- Import van bestaande VS Code settings/extensions
- AI beschikbaar via Cmd+K (inline), Cmd+L (chat)

**Hoe start je een taak:**
- Inline edit: selecteer code, druk Cmd+K
- Chat panel: Cmd+L, beschrijf wat je wilt
- Composer: multi-file bewerkingen
- Agent mode: autonoom meerdere bestanden aanpassen

**Multi-agent support / Orchestratie:**
- **Nee** — één AI-instantie
- "Agent mode" is autonoom maar geen multi-agent
- Geen orchestratie of parallelle agents
- Geen programmeerbare workflows

**UI:**
- Desktop-app alleen (Electron/VS Code fork)
- Geen CLI, geen web UI
- Volledige IDE-ervaring

**Wat doen zij goed:**
- Beste IDE-integratie van alle tools
- Inline code-completion is uitstekend
- Tab-completion die context begrijpt
- Breed model-support (GPT-4, Claude, Gemini)
- Privacy-modus (local inference opties)

**Wat missen zij (dat wij hebben):**
- Geen CLI-first workflow
- Geen multi-agent orchestratie
- Niet scriptbaar/automatiseerbaar
- Geen headless/CI-gebruik
- Geen agent-pipelines

---

### 1.5 Continue.dev

**Installatie:**
```bash
# VS Code extension:
code --install-extension Continue.continue

# JetBrains: via marketplace
# CLI: npm install -g continue-dev (experimenteel)
```
- Primair als IDE-extensie
- Open source

**Eerste run experience:**
- Extensie-panel opent in VS Code/JetBrains
- Configuratie via `~/.continue/config.json`
- Kies model (lokaal of cloud)
- Direct bruikbaar na model-configuratie

**Hoe start je een taak:**
- Chat panel in IDE
- `Cmd+I` voor inline edits
- `@` mentions voor bestanden/docs/codebase
- Context-providers: codebase, docs, web, etc.

**Multi-agent support / Orchestratie:**
- **Nee** — geen multi-agent
- Focus op context-management, niet orchestratie
- Geen agent-chains of parallelle tasks

**UI:**
- IDE-extensie (VS Code, JetBrains)
- Geen standalone CLI of desktop app
- Experimentele CLI aanwezig maar niet primair

**Wat doen zij goed:**
- Uitstekende context-management (@codebase, @docs)
- Volledig open source en self-hostable
- Breed model-support incl. lokale modellen (Ollama)
- Configureerbaar via JSON
- Slash commands aanpasbaar

**Wat missen zij (dat wij hebben):**
- Geen multi-agent orchestratie
- Geen CLI-first (terminal-native) workflow
- Niet headless/scriptbaar
- Geen parallelle agent-taken

---

### 1.6 Mentat

**Installatie:**
```bash
pip install mentat
```
- Python-gebaseerd, pip
- Vereist: Python 3.10+

**Eerste run experience:**
```bash
mentat
```
- Interactieve CLI-chat
- Detecteert git-repository
- Vraagt welke bestanden/mappen in context
- Eenvoudige interface

**Hoe start je een taak:**
- Vrij-tekst beschrijving van de taak
- Mentat maakt een plan en vraagt bevestiging
- Wijzigingen worden in batches getoond
- Gebruiker accepteert/weigert elk blok

**Multi-agent support / Orchestratie:**
- **Nee** — geen multi-agent
- Enkelvoudige sessie, één model
- Geen orchestratie of agent-chains

**UI:**
- Terminal-only
- Geen IDE-integratie, geen web UI
- Eenvoudige TUI

**Wat doen zij goed:**
- Eenvoudige, laagdrempelige interface
- Goede codebase-context
- Plan-first approach (eerst tonen, dan uitvoeren)
- Open source

**Wat missen zij (dat wij hebben):**
- Geen multi-agent capabilities
- Beperkte tool-set
- Minder actief onderhouden
- Geen geavanceerde orchestratie

---

## 2. Vergelijkingstabel

| Kenmerk | aider | goose | claude-code | cursor | continue.dev | mentat | **oa-cli** |
|---|---|---|---|---|---|---|---|
| **Installatie** | pip | brew/binary | npm | desktop app | IDE extension | pip | npm/binary |
| **CLI-first** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Headless/CI** | ✅ | ⚠️ | ✅ | ❌ | ❌ | ⚠️ | ✅ |
| **Multi-agent** | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | **✅✅** |
| **Parallelle agents** | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | **✅** |
| **Agent orchestratie** | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | **✅** |
| **Declaratieve workflows** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| **IDE-integratie** | ❌ | ❌ | ⚠️ | **✅✅** | **✅✅** | ❌ | ⚠️ |
| **Lokale modellen** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ⚠️ |
| **Git-integratie** | **✅✅** | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ |
| **Open source** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Model-agnostisch** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ⚠️ |
| **Scriptbaar** | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | **✅** |

**Legenda:** ✅ = Ja / ✅✅ = Uitstekend / ⚠️ = Beperkt / ❌ = Nee

---

## 3. Unique Selling Points (USPs) van oa-cli

### USP 1: Volwaardige Multi-Agent Orchestratie
**Wat:** Meerdere gespecialiseerde agents werken parallel en serieel samen aan complexe taken.
**Waarom uniek:** Geen enkele andere tool biedt dit op CLI-niveau. aider, goose, mentat, continue.dev hebben het niet. claude-code heeft rudimentaire agent-support, cursor heeft het helemaal niet.
**Waarde:** Taken die voor een enkele agent te groot zijn (grote codebase refactors, parallelle investigaties, gedistribueerde analyses) kunnen worden opgesplitst en parallel verwerkt.

### USP 2: Declaratieve Agent Pipelines
**Wat:** Workflows kunnen worden gedefinieerd als YAML/JSON-configuratie met agent-rollen, dependencies, en orchestratie-logica.
**Waarom uniek:** Alle concurrenten zijn imperatief (chat-gedreven). Oa-cli maakt van complexe multi-step taken reproduceerbare, versie-beheerde workflows.
**Waarde:** Teams kunnen "taak-templates" opslaan en hergebruiken. CI/CD-integratie wordt mogelijk.

### USP 3: Wrapper-architectuur (Claude Code + eigen laag)
**Wat:** Oa-cli bouwt op claude-code's bewezen agentic foundation en voegt de orchestratie-laag toe.
**Waarom uniek:** We hoeven het wiel niet opnieuw uit te vinden voor de basis (tools, permissions, file-editing). We focussen op het niveau daarboven.
**Waarde:** Directe toegang tot alle claude-code features + onze uitbreidingen.

### USP 4: CLI-native + Headless
**Wat:** Volledig bruikbaar zonder GUI, in CI/CD pipelines, scripts, en geautomatiseerde workflows.
**Waarom uniek:** Cursor is desktop-only. Continue.dev is IDE-only. Goose heeft een desktop app maar geen echte headless modus. Oa-cli is born-to-be-scripted.
**Waarde:** Devops-teams kunnen oa-cli inzetten als "AI-powered CI step" — automatische code review, test-schrijven, refactoring als pipeline-stap.

### USP 5: Gespecialiseerde Agent-Rollen
**Wat:** Verschillende agents met verschillende expertise (Explore, Plan, Implement, Review, Test) die samenwerken.
**Waarom uniek:** In alle andere tools doet één generiek model alles. Door specialisatie kunnen we diepere en betere resultaten halen.
**Waarde:** Een "Code Review Agent" kan specifiek getraind/geprompt zijn om security-issues te vinden, terwijl een "Refactoring Agent" expertise heeft in architectuurpatronen.

---

## 4. Strategische Aanbevelingen

### Wat we kunnen leren van de concurrenten

**Van aider:**
- Git-integratie als kern (auto-commit, diff-views)
- Repository map / RAG voor codebase-context
- `--yes` flag voor non-interactieve modus

**Van goose:**
- MCP-compatibiliteit voor plugin-ecosystem
- Sessie-management (pause/resume langlopende taken)
- Extensies-systeem

**Van cursor:**
- Inline editing UX-patronen (voor eventuele IDE-extensie)
- Tab-completion interface

**Van continue.dev:**
- `@`-gebaseerde context-selectie (`@codebase`, `@docs`)
- JSON-configuratie voor aanpasbaarheid
- Slash-command systeem

**Van claude-code:**
- CLAUDE.md project-instructies systeem
- Permission-model (transparant, veilig)
- Hooks-systeem

### Positionering

```
          SINGLE AGENT          ↔          MULTI-AGENT
              │                                  │
CLI/Terminal  │  aider, mentat, goose, claude-code  │  oa-cli  ◄── WIJ
              │                                  │
IDE/GUI       │  cursor, continue.dev            │  (niemand)
```

**Oa-cli bezit de enige niet-bezette hoek: multi-agent + CLI-native.**

---

## 5. Conclusie

Oa-cli heeft een **unieke marktpositie**: alle andere tools zijn of IDE-gebonden, of hebben slechts één agent. De combinatie van:
1. Multi-agent orchestratie
2. CLI-native / headless
3. Declaratieve workflows
4. Wrapper op claude-code (proven foundation)

...bestaat **nergens anders in dit landschap** (peildatum: 2026-03-02).

De grootste kansen liggen bij:
- **DevOps/Platform engineers** die AI in CI/CD willen integreren
- **Senior developers** met complexe refactoring-taken die parallelisering vereisen
- **Teams** die reproduceerbare AI-workflows willen als code (IaC-stijl maar dan voor AI-taken)

---

*Analyse gebaseerd op kennis van tools per 2026-03-02. Geen web-access gebruikt.*
