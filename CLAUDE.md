# Open-Agents - Claude Instructies

> **Versie**: 1
> **Laatste update**: 2026-02-26
> **Template versie**: 3.0 (gebaseerd op Impertio AI Ecosystem Deployment)
> **Setup tier**: Standard

## Projectdoel

Open-source agentic coding platform met twee pijlers: gespecialiseerde ERPNext agents (als dienst) en een smart context layer (automatische snippet assembly met model routing). Eerste pilot: ERPNext agents.

---

## Waar Staat Wat?

### Tracking & Voortgang -> GitHub

| Wat | Waar |
|-----|------|
| **Status & voortgang** | `ROADMAP.md` |
| **Beslissingen (open + genomen)** | `DECISIONS.md` |
| **Project structuur** | Zie README.md architectuur sectie |
| **Research documenten** | `docs/research/` + `openagents-plan.md` + `pi-dev-onderzoek-compleet.md` |
| **Design beslissingen** | `docs/design/` |

> **GOUDEN REGEL**: GitHub = Single Source of Truth voor tracking.
> Project Instructies bevatten HOE je werkt, niet WAAR je staat.
> Bij elke sessiestart: Check ROADMAP.md + DECISIONS.md.

### Credentials -> Lokale Bestanden

Zie `CLAUDE.local.md` voor GitHub tokens en API credentials.

---

## Repositories

| Repo | Doel |
|------|------|
| `OpenAEC-Foundation/Open-Agents` | **Project werk** - dit project |
| `OpenAEC-Foundation/Impertio-AI-Ecosystem-Deployment` | **Generieke kennis** - methodologieen, skills, lessons learned |

---

## Project Structuur

```
Open-Agents/
├── snippets/          # Kennisbibliotheek
│   ├── shared/        # Gedeelde kennis (alle agents)
│   ├── boekhouding/   # Domein-specifiek
│   ├── inkoop/
│   ├── hr/
│   ├── project/
│   └── admin/
├── extensions/        # Pi.dev TypeScript extensions
├── agents/            # Agent configuraties (JSON per type)
├── docker/            # Dockerfile en docker-compose
├── docs/              # Documentatie
│   ├── research/
│   ├── design/
│   └── planning/
└── .claude/           # Claude Code workspace config
```

## Conventies

### Snippets
- Markdown bestanden met YAML frontmatter (`tags`, `weight`, `model_hint`)
- `shared/` = geladen door alle agents
- `<agent>/` = domein-specifiek

### Agent Configs
- JSON formaat met snippet-paden en model preferences
- Eén bestand per agent type in `agents/`

### Commit Messages
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Nederlands of Engels, consistent per commit

### Taal
- Documentatie: Nederlands (tenzij technische docs)
- Code en configs: Engels
- Snippets: Nederlands (voor NL-specifieke kennis) of Engels (technisch)

---

## Session Recovery Protocol

**Bij ELKE sessiestart:**

1. ROADMAP.md ophalen en status checken
2. DECISIONS.md ophalen voor open beslissingen
3. Lokaal werk checken met `git status`
4. Bevestiging vragen voordat je verdergaat

---

## Settings Discipline (CC_007)

| Wat | Waar | NOOIT |
|-----|------|-------|
| MCP servers | `<workspace>/.mcp.json` | `~/.claude/settings.local.json` |
| Skills | `<workspace>/.claude/skills/` | `~/.claude/skills/` |
| Hooks | `<workspace>/.claude/settings.json` | `~/.claude/settings.json` |
| Secrets | `<workspace>/CLAUDE.local.md` | Committed files |

---

## Kerngedrag

1. **Research-first** - Geen beslissingen zonder onderbouwing
2. **Keuze-opties bieden** - Altijd alternatieven presenteren
3. **Geen aannames** - Verifieer, doorvragen
4. **Documenteer beslissingen** - In DECISIONS.md
5. **Kennis bewaren** - Generieke inzichten -> deployment repo
6. **Documenten actueel** - Sync direct, niet achteraf
7. **Geen tracking in instructies** - Alleen HOE, niet WAAR
8. **Workspace-local** - Alle config in workspace, nooit global (CC_007)

---

## Quick Reference

```bash
# Status checken
git status

# Token 1 (Open-Agents access) testen
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/OpenAEC-Foundation/Open-Agents" | python -c "import sys,json; print(json.loads(sys.stdin.read()).get('permissions'))"
```

---

*Template versie: 3.0 (modulair)*
*Setup: Via Impertio AI Ecosystem Deployment*
