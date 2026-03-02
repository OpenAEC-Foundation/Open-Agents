# OpenAgents — Projectplan

**Naam:** OpenAgents
**Auteur:** Freek Heijting
**Organisatie:** Impertio Studio B.V. / OpenCompany246
**Datum:** 26-02-2026
**Status:** Idee → Eerste fase planning

---

## Het idee in één zin

Open-source agentic coding platform met twee pijlers: gespecialiseerde ERPNext agents die we als dienst aanbieden, en een smart context layer die op de achtergrond de beste snippets inlaadt voor elk gesprek.

## Twee pijlers

### Pijler 1: ERPNext Agent-as-a-Service

Kant-en-klare gespecialiseerde agents per domein, aangeboden als dienst aan klanten:

```
┌─────────────────────────────────────────────┐
│  Klant kiest agent(s) bij hun ERP-instance  │
├─────────────────────────────────────────────┤
│  📊 Boekhouding-agent   → facturen, BTW, rapportages     │
│  🛒 Inkoop-agent        → leveranciers, orders, voorraad  │
│  👥 HR-agent            → verlof, contracten, onboarding  │
│  🏗️ Project-agent       → planning, uren, BIM-data        │
│  🔧 Admin-agent         → server, backups, monitoring     │
└─────────────────────────────────────────────┘
        Elke agent = Docker container op Hetzner
        Elke agent = eigen skills, snippets, API credentials
```

### Pijler 2: Smart Context Layer

Het brein achter elke agent — automatische context assembly:

```
Gebruiker stelt vraag
        ↓
[Stap 1] Licht model (Haiku/Llama) analyseert de vraag
        → Categoriseert: boekhouding? inkoop? technisch?
        → Selecteert relevante snippet-tags
        ↓
[Stap 2] Context Assembly
        → Zoekt matching .md snippets uit bibliotheek
        → Ordent op relevantie, voegt samen
        → Bouwt de uiteindelijke prompt op
        ↓
[Stap 3] Routering naar juist model
        → Simpele lookup → licht model (snel, goedkoop)
        → Complexe analyse → zwaar model (Opus/Sonnet)
        → Code generatie → code-geoptimaliseerd model
        ↓
[Stap 4] Soepel antwoord terug
        → Gebruiker merkt niets van de orkestratie
```

De Smart Context Layer werkt voor ALLE agents — het is de gedeelde intelligentie-laag.

## Snippet bibliotheek — de kern

De markdown-bestanden zijn kleine, gefocuste contextblokken. Gedeeld + per agent:

```
openagents/
├── snippets/
│   ├── shared/                        # Gedeelde kennis (alle agents)
│   │   ├── impertio-missie.md
│   │   ├── opencompany246-diensten.md
│   │   ├── erpnext-api-basis.md
│   │   ├── frappe-doctypes.md
│   │   ├── prilk-cloud-setup.md
│   │   └── nl-fiscaal-compliance.md
│   ├── boekhouding/                   # Boekhouding-agent specifiek
│   │   ├── btw-regels.md
│   │   ├── factuur-workflow.md
│   │   └── chart-of-accounts.md
│   ├── inkoop/                        # Inkoop-agent specifiek
│   │   ├── purchase-order-flow.md
│   │   ├── leveranciers-beheer.md
│   │   └── voorraad-logica.md
│   ├── hr/                            # HR-agent specifiek
│   │   ├── verlof-regels.md
│   │   ├── contract-types.md
│   │   └── onboarding-checklist.md
│   ├── project/                       # Project-agent specifiek
│   │   ├── uren-registratie.md
│   │   ├── bim-ifc-basics.md
│   │   └── planning-workflow.md
│   └── admin/                         # Admin-agent specifiek
│       ├── docker-beheer.md
│       ├── backup-procedures.md
│       └── monitoring-setup.md
├── extensions/                        # Pi.dev extensions
│   ├── smart-context.ts               # Context assembly engine
│   ├── model-router.ts                # Model selectie logica
│   └── agent-registry.ts              # Agent type management
├── agents/                            # Agent configuraties
│   ├── boekhouding.json
│   ├── inkoop.json
│   ├── hr.json
│   ├── project.json
│   └── admin.json
├── prompts/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── AGENTS.md
├── .pi/
└── README.md
```

Elk snippet heeft frontmatter met tags:

```markdown
---
tags: [erpnext, api, technisch]
weight: high
model_hint: any
---

# ERPNext API Basis
De Frappe REST API is beschikbaar op /api/resource/{DocType}...
```

## Vertaling naar Pi.dev

| Concept | Pi.dev component |
|---------|-----------------|
| Smart Context Layer | **Extension** (smart-context.ts — intercepteert `input` event) |
| Snippet bibliotheek | **Skills** (met YAML frontmatter, on-demand laden) |
| Model routing | **Extension** (model-router.ts — Pi's multi-model support) |
| Agent types | **Agent configs** (JSON per specialisatie, laadt juiste snippets) |
| Deployment | **Docker containers** (Pi SDK in RPC mode per klant) |
| Gebruikerservaring | **SDK mode** (voor web UI) of **RPC mode** (voor Frappe integratie) |

### Extension pseudo-code

```typescript
// extensions/smart-context.ts
export default function(pi: ExtensionAPI) {

  pi.on("input", async (event, ctx) => {
    const userQuery = event.input;

    // Stap 1: Licht model categoriseert de vraag
    const classification = await classifyQuery(userQuery);
    // → { category: "boekhouding", tags: ["btw", "factuur"], complexity: "medium" }

    // Stap 2: Zoek relevante snippets (shared + agent-specifiek)
    const sharedSnippets = findSnippets("shared", classification.tags);
    const agentSnippets = findSnippets(classification.category, classification.tags);

    // Stap 3: Assembleer context
    const assembledContext = assembleContext([...sharedSnippets, ...agentSnippets], userQuery);

    // Stap 4: Inject als system context
    pi.on("context", (contextEvent) => {
      contextEvent.context.push({
        type: "text",
        text: assembledContext
      });
    });

    // Stap 5: Optioneel model switchen op basis van complexiteit
    if (classification.complexity === "high") {
      await pi.selectModel("claude-opus-4-5-20250929");
    }
  });
}
```

## Waar leeft dit project?

**GitHub:** `github.com/Impertio-Studio/openagents` (private)

Past in het ecosysteem:
- **Impertio-Studio** — bedrijfsrepo (private, interne tooling)
- **OpenAEC-Foundation** — later open-source publiceren zodra er een stabiel MVP is
- **OpenCompany246** — klant-facing dienst die OpenAgents aanbiedt

## Deployment: Docker Agents op Hetzner

Elke agent draait als Docker container op de Hetzner server:

```
Hetzner Server (Nuremberg)
├── Docker: Frappe Bench (bestaand, Pritam beheert)
│   ├── opencompany246.nl
│   ├── *.prilk.cloud sites
│   └── databases
├── Docker: Nextcloud (bestaand)
├── Docker: OpenAgents — Admin Agent ← NIEUW
│   ├── Pi SDK + smart-context extension
│   ├── snippets/shared/ + snippets/admin/
│   └── Env: ANTHROPIC_API_KEY, FRAPPE_TOKEN
├── Docker: OpenAgents — Boekhouding (per klant) ← NIEUW
│   ├── Pi SDK + klant-specifieke config
│   ├── snippets/shared/ + snippets/boekhouding/
│   └── Eigen API credentials (Accounts User role)
├── Docker: OpenAgents — Inkoop (per klant) ← NIEUW
│   └── ...
└── Docker: Ollama (toekomst)
    └── Lokale LLM voor classificatie/routing
```

### Waarom Docker?

- **Isolatie:** Elke agent draait geïsoleerd — klant A kan niet bij klant B
- **Schaalbaarheid:** Nieuwe klant = nieuw container, zelfde image
- **Security:** Geen bash/write tools naar host filesystem, alleen API calls
- **Beheer:** Pritam kan containers managen via bestaande Docker workflow
- **Reproduceerbaarheid:** Dockerfile in repo, `docker compose up` en klaar

### Dockerfile (concept)

```dockerfile
FROM node:20-slim
RUN npm install -g @mariozechner/pi-coding-agent
WORKDIR /openagents
COPY snippets/ ./snippets/
COPY extensions/ ./extensions/
COPY agents/ ./agents/
COPY .pi/ ./.pi/
COPY AGENTS.md ./
# Agent type via environment variable
ENV OPENAGENTS_TYPE=boekhouding
# Geen bash tool — alleen custom API tools
CMD ["pi", "--mode", "rpc"]
```

## Roadmap

| Fase | Wat | Wie | Wanneer |
|------|-----|-----|---------|
| 0 | Pi.dev leren, basiskennis (bestaande todo) | Freek | Nu |
| 1 | GitHub repo `openagents` aanmaken, structuur opzetten | Freek | Week 1 |
| 2 | Eerste snippets schrijven (shared + 1 agent type) | Freek | Week 1-2 |
| 3 | Smart Context extension bouwen (snippet selectie) | Freek | Week 2-3 |
| 4 | Model routing toevoegen | Freek | Week 3-4 |
| 5 | Eerste agent: Boekhouding-agent werkend in Pi | Freek | Week 4-6 |
| 6 | Dockerfile + docker-compose voor deployment | Freek + Pritam | Week 6-8 |
| 7 | Deploy op Hetzner, testen met eigen instance | Freek + Pritam | Week 8-10 |
| 8 | Tweede agent (Inkoop of Admin), klant pilot | Team | Week 10+ |

## Model routing strategie

| Vraag type | Model | Waarom |
|-----------|-------|--------|
| Simpele lookup | Haiku / Llama 3.1 8B (lokaal) | Snel, goedkoop, goed genoeg |
| Standaard werk | Sonnet 4.5 | Balans kwaliteit/snelheid |
| Complexe analyse | Opus 4.5 | Maximale redenering |
| Code generatie | Sonnet 4.5 | Sterk in code, snel genoeg |
| Categorisatie (intern) | Haiku / lokaal model | Alleen classificatie, geen output |

## Eerste stappen (concreet)

1. GitHub repo `openagents` aanmaken onder Impertio-Studio (private)
2. Directorystructuur opzetten (snippets/, extensions/, agents/, docker/)
3. 5-10 eerste shared snippets schrijven (bedrijfsinfo, ERPNext API, klanten)
4. Eerste agent config: `agents/boekhouding.json`
5. Pi.dev installeren en werkend krijgen (prerequisite — bestaande todo)
6. Smart Context extension bouwen (snippet selectie + assembly)
7. Model router extension bouwen
8. Dockerfile + docker-compose voor eerste agent
9. Deploy op Hetzner, testen met eigen ERPNext instance

---

## GitHub Repo Setup Instructies

### Repo aanmaken

```bash
# Op GitHub: New Repository onder Impertio-Studio
# Naam: openagents
# Visibility: Private
# Initialize: README + .gitignore (Node)
# License: MIT (open-source later)

# Lokaal clonen
git clone git@github.com:Impertio-Studio/openagents.git
cd openagents
```

### Basis directorystructuur

```bash
mkdir -p snippets/{shared,boekhouding,inkoop,hr,project,admin}
mkdir -p extensions
mkdir -p agents
mkdir -p prompts
mkdir -p docker
mkdir -p .pi/skills

# Pi config voor dit project
cat > .pi/settings.json << 'EOF'
{
  // OpenAgents project settings
  "model": "claude-sonnet-4-5-20250929",
  "tools": ["read", "write", "edit", "bash"]
}
EOF

# AGENTS.md voor dit project
cat > AGENTS.md << 'EOF'
# OpenAgents — Project Instructies

Tweeledig agentic coding platform:
1. Gespecialiseerde ERPNext agents (als dienst)
2. Smart Context Layer (automatische snippet assembly)

## Structuur
- snippets/shared/ — Gedeelde kennis voor alle agents
- snippets/<agent>/ — Agent-specifieke kennis
- extensions/ — Pi.dev TypeScript extensions (smart-context, model-router)
- agents/ — Agent configuraties (JSON per type)
- docker/ — Dockerfile en docker-compose

## Conventies
- Snippets hebben YAML frontmatter met tags en weight
- Agent configs in JSON met snippet-paden en model preferences
- Extensions in TypeScript, geen build stap (jiti)
- Test met: pi -p "test query" --no-session
EOF
```

### Eerste snippet voorbeeld

```bash
cat > snippets/shared/impertio-missie.md << 'EOF'
---
tags: [bedrijf, missie, impertio]
weight: medium
model_hint: any
---

# Impertio Studio B.V.

Impertio Studio is een open-source ERP en AI integratie bedrijf.
Opgericht door Maarten Vroegindeweij (70%) en Freek Heijting (30%).

Kernactiviteiten:
- ERPNext/Frappe hosting en implementatie via OpenCompany246
- AI-integratie en automatisering voor de bouwsector
- Open-source tooling voor de AEC-industrie

Filosofie: Robuust zonder overkill.
EOF
```

### Eerste agent config

```bash
cat > agents/boekhouding.json << 'EOF'
{
  "name": "boekhouding",
  "label": "Boekhouding Agent",
  "description": "Gespecialiseerde agent voor financiële zaken in ERPNext",
  "snippets": ["shared/*", "boekhouding/*"],
  "default_model": "claude-sonnet-4-5-20250929",
  "heavy_model": "claude-opus-4-5-20250929",
  "light_model": "haiku",
  "frappe_roles": ["Accounts User"],
  "tools": ["frappe_get_document", "frappe_list_documents", "frappe_run_report"]
}
EOF
```

### .gitignore

```bash
cat > .gitignore << 'EOF'
node_modules/
.pi/sessions/
*.log
.env
auth.json
EOF
```

### Eerste commit

```bash
git add .
git commit -m "OpenAgents: initial setup — snippets, extensions, agent configs, Docker"
git push origin main
```

---

*Dit plan is een levend document. Bijwerken naarmate het project vordert.*
