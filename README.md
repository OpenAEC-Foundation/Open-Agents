# Open-Agents

Open-source agentic coding platform met twee pijlers: gespecialiseerde ERPNext agents die als dienst worden aangeboden, en een smart context layer die op de achtergrond de beste kennissnippets inlaadt voor elk gesprek met intelligente model routing.

Gebouwd voor Frappe/ERPNext hosting infrastructuur.

## Twee Pijlers

### Pijler 1: ERPNext Agent-as-a-Service

Kant-en-klare gespecialiseerde agents per domein, aangeboden als dienst:

| Agent | Domein | Voorbeelden |
|-------|--------|-------------|
| Boekhouding | Financieel | Facturen, BTW, rapportages |
| Inkoop | Supply chain | Leveranciers, orders, voorraad |
| HR | Personeelszaken | Verlof, contracten, onboarding |
| Project | Projectmanagement | Planning, uren, BIM-data |
| Admin | Systeembeheer | Server, backups, monitoring |

Elke agent draait als geïsoleerde Docker container met eigen skills, snippets en API credentials.

### Pijler 2: Smart Context Layer

Het brein achter elke agent — automatische context assembly:

1. **Classificatie** — Licht model analyseert de vraag en selecteert relevante tags
2. **Context Assembly** — Zoekt matching snippets uit gedeelde + agent-specifieke bibliotheek
3. **Model Routing** — Routeert naar het juiste model op basis van complexiteit
4. **Antwoord** — Gebruiker merkt niets van de orkestratie

## Architectuur

```
openagents/
├── snippets/          # Kennisbibliotheek (shared + per agent)
├── extensions/        # Smart context & model routing
├── agents/            # Agent configuraties per domein
├── docker/            # Dockerfile & docker-compose
├── docs/              # Documentatie
│   ├── research/      # Onderzoeksrapporten
│   ├── design/        # Ontwerp beslissingen
│   └── planning/      # Masterplan & planning
└── .claude/           # Claude Code workspace configuratie
```

## Status

Dit project bevindt zich in de **eerste fase** — research en structuur opzetten. Zie [ROADMAP.md](ROADMAP.md) voor de actuele status.

## Tech Stack

- **Agent Framework**: Pi.dev (Pi Coding Agent)
- **ERP**: Frappe/ERPNext
- **Deployment**: Docker op Hetzner
- **AI Models**: Claude (Anthropic), met model routing
- **Taal**: TypeScript (extensions), Python (Frappe integratie)

## Organisatie

| Entiteit | Rol |
|----------|-----|
| **Impertio Studio B.V.** | Ontwikkeling en beheer |
| **OpenAEC Foundation** | Open-source publicatie |
| **OpenCompany246** | Klant-facing dienstverlening |

## Licentie

[Apache-2.0](LICENSE)

---

*Impertio Studio B.V. — AI ecosystems for the AEC industry*
