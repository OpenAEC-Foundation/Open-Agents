# GitHub Issues Report — 2026-03-11

Gegenereerd door: github-issues agent
Datum: 2026-03-11

## Bestaande Issues (voor run)

| # | Titel |
|---|-------|
| #64 | bug(remote): spawn_remote_agent fails on root — dangerously-skip-permissions blocked |
| #63 | feat: local-first chat UI — Open WebUI als referentie, niet als fundament |

## Aangemaakte Issues

| # | Titel | Label | Bron |
|---|-------|-------|------|
| #65 | bug(hooks): check-delegation.sh false positive — && in agent prompt counted as bash steps | bug | LESSONS.md L-067, L-068 |
| #66 | bug(library): 14 agent templates use 'prompt' instead of 'systemPrompt', 156 missing 'tags' | bug | LESSONS.md L-062, L-063 |
| #67 | feat(cli): add 'oa run --template <name>' to execute library templates directly | enhancement | LESSONS.md L-042 |
| #68 | feat(sprint-13): Docker container isolation per agent — blocks production deployment | enhancement | ROADMAP.md Sprint 13 |
| #69 | feat(sprint-22): implement missing telemetry — Agent Run Telemetry, Post-Run Hooks, Context Window Tracking | enhancement | ROADMAP.md Sprint 22 |
| #70 | feat(sprint-20): terminal backend — Fastify + node-pty + WebSocket + xterm.js React component | enhancement | ROADMAP.md Sprint 20 |
| #71 | feat(sprint-21): complete 'oa mcp' CLI command + GitHub Actions PyPI release workflow | enhancement | ROADMAP.md Sprint 21 |
| #72 | feat(sprint-11): complete VS Code Bridge -- shared types merge + E2E verification | enhancement | ROADMAP.md Sprint 11 |

## Totaal: 8 nieuwe issues aangemaakt

### Bugs (2)
- #65: check-delegation.sh false positive met && in agent prompts — blokkeert agent delegatie
- #66: Schema inconsistentie in agent library templates (prompt vs systemPrompt, missing tags)

### Enhancements (6)
- #67: `oa run --template` — templates uitvoerbaar maken vanuit CLI
- #68: Docker container isolation per agent (kritisch voor productie)
- #69: Agent Run Telemetry, Post-Run Hooks, Context Window Tracking (Sprint 22 resterend)
- #70: Desktop + Web App terminal backend (Sprint 20)
- #71: `oa mcp` CLI commando + PyPI release workflow (Sprint 21)
- #72: VS Code Bridge afronden — shared types + E2E verificatie (Sprint 11)

## Overgeslagen (niet kritisch genoeg voor een issue)
- Fase 6 (Community marketplace, multi-tenant) — te abstract
- Sprint 14 Agent Library Scale-up — doorlopend werk, geen concrete blocker
- Sprint 16 A2A Protocol — evaluatie in progress, geen actie-item
- Sprint 18 Tauri App — planned, niet kritisch geblokkeerd
- Sprint 18 Dashboard pending (integration tests, CSS audit) — te klein voor eigen issue
