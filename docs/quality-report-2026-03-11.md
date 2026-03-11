# Quality Report 2026-03-11

> Gegenereerd door: roadmap-reconciler agent
> Datum: 2026-03-11
> Methode: Directe verificatie via Read/Grep/Glob tools op bronbestanden

---

## Afgevinkt (items die al klaar waren maar als [ ] stonden)

### Sprint 13 — Docker Isolation (D-040)

| Item | Bewijs |
|------|--------|
| Docker runtime adapter (`docker-runtime.ts`) | `packages/backend/src/runtimes/docker-runtime.ts` bestaat, 392 regels, volledig geïmplementeerd |
| Workspace builder voor Docker volume mount | `mkdtemp` + `-v ${workspaceDir}:/workspace:rw` in `buildDockerArgs()` |
| Network policy per agent | `parseNetworkPolicy()` + `--network=none` default, whitelist via agent description JSON |
| Resource limits (memory, CPU, timeout) | `--memory=${MEMORY_LIMIT}`, `--cpus=${CPU_LIMIT}`, `--stop-timeout=${TIMEOUT_SECONDS}` |
| Secret injection als Docker env vars | `resolveSecrets()` haalt keys uit key-store, injecteert via `-e KEY=VALUE` |
| Output capture: artifacts uit container | `collectOutput(outputDir, stdout)` leest output-directory na container exit |
| Execution engine refactor: runtime.execute() → docker | `DockerRuntime` geregistreerd in `server.ts` (regel 49-55): `registerRuntime(new DockerRuntime())` |

### Sprint 13 — Non-Claude Runtime Tool Use (D-032)

| Item | Bewijs |
|------|--------|
| OpenAI adapter | `packages/backend/src/runtimes/openai.ts` bestaat |
| Mistral adapter | `packages/backend/src/runtimes/mistral.ts` bestaat |
| Ollama adapter | `packages/backend/src/runtimes/ollama.ts` bestaat |
| AgentRuntime interface | `packages/shared/src/runtime.ts` — geëxporteerd als `AgentRuntime`, `AgentEvent`, `RuntimeExecutionConfig` |

### Sprint 11 — Shared Types

| Item | Bewijs |
|------|--------|
| Shared types mergen (bridge events, agent types, constants) | `packages/shared/src/index.ts` exporteert volledig: `BridgeEvent`, `BridgeAgentStatus`, `BridgeSpawnAgentRequest`, `OaAgentRecord`, `TmuxModel` — alles aanwezig |

### Sprint 15 — oa-cli × packages/ Convergentie

| Item | Bewijs |
|------|--------|
| OaCLIRuntime adapter in `packages/backend/src/runtimes/oa-cli.ts` | File bestaat, `OaCLIRuntime implements AgentRuntime`, leest `~/.oa/agents.json` |
| `tmux/claude` als ModelProvider + ModelId in shared types | `types.ts` regel 7: `"tmux"` in ModelProvider; regel 34: `` `tmux/${TmuxModel}` `` als ModelId; MODEL_CATALOG regel 376: `tmux/claude` entry |

### Sprint 18 Dashboard — Agent Library Wave 2

| Item | Bewijs |
|------|--------|
| Agent library Wave 2 (overige 300+ agents naar 1015) | `agents/library/` bevat **1580 JSON bestanden** in **106 categorieën** — ruim boven het doel van 1015 |

### Sprint 21 — oa-cli als Product: Web UI F1

| Item | Bewijs |
|------|--------|
| Error boundaries + error state | `oa-cli/web/src/components/ErrorBoundary.tsx` bestaat; App.tsx wraps alle tabs |
| Toast notificaties | `oa-cli/web/src/components/ToastProvider.tsx` bestaat |
| Type-safe API client | `oa-cli/web/src/api/client.ts` bestaat (volledig typed) |
| Pause/Resume knoppen + bridge endpoints | `pauseAgent()` en `resumeAgent()` in client.ts (regels 97-102) |
| xterm.js Terminal component | `oa-cli/web/src/components/dashboard/XtermTerminal.tsx` bestaat |
| StatsHeader (running/done/failed tellers) | In `DashboardTab.tsx` (lokale component, regel 12-20) |
| Zoek/filter agents | `DashboardTab.tsx` heeft `filter` state + `filteredAgents` useMemo (regels 32-40) |

### Sprint 21 — oa-cli als Product: Web UI F2

| Item | Bewijs |
|------|--------|
| Command Palette (Ctrl+K, cmdk) | `oa-cli/web/src/components/CommandPalette.tsx` bestaat |
| Keyboard shortcuts overlay | `oa-cli/web/src/components/KeyboardHelpOverlay.tsx` bestaat |
| Pipeline tab + trigger API | `oa-cli/web/src/components/dashboard/PipelinePanel.tsx` bestaat |
| TaskBoard in Teams tab | `oa-cli/web/src/components/teams/TaskBoard.tsx` bestaat |
| SSE reconnect met exponential backoff | `AgentDetail.tsx` regels 33, 79-90: reconnect-logica aanwezig |

### Sprint 21 — oa-cli als Product: MCP Server

| Item | Bewijs |
|------|--------|
| `oa mcp` CLI commando | `cli.py` regel 1896: `def mcp()` met `mcp_main()` call |

### Sprint 22 — Self-Improvement Foundation

| Item | Bewijs |
|------|--------|
| #14 Agent Run Telemetry | `oa-cli/src/open_agents/telemetry.py` — `start_run()`, `finish_run()`, `list_runs()`, JSON run-logs in `~/.oa/runs/` |
| #15 Post-Run Hook System | `oa-cli/src/open_agents/hooks.py` — `HOOK_DIRS["post-run"]` met 3 scripts: `01-log-to-index.sh`, `02-check-success.sh`, `03-auto-lessons.sh` |

---

## Nog open (echt niet geïmplementeerd)

### Sprint 8 (Fase 8: Refactor v0.2.0)
- `NodeType uitbreiden naar D-023 specificatie` — niet gevonden
- `MCP tool auto-generatie pipeline verbinden met VS Code extension` — niet gevonden
- `Non-Claude runtime tool use support (D-032 PoC beperking opheffen)` — adapters bestaan maar tool result handling onbekend
- `Test suite verdere uitbreiding` — gedeeltelijk
- `API documentatie (OpenAPI/Swagger)` — niet gevonden

### Sprint 11 — VS Code Bridge (nog open)
- `test-workspace migreren` — niet geverifieerd
- `CLI tool integreren` — niet geverifieerd
- `E2E verificatie: canvas → cli/claude agent → terminal → result` — niet geverifieerd

### Sprint 13 — Docker (1 restant)
- `Safety settings: tool blacklists → container policies (D-035 + D-040 convergentie)` — niet geverifieerd; docker heeft `--cap-drop=ALL` maar koppeling aan SafetyConfig niet aangetoond

### Sprint 13 — Non-Claude Runtime (2 restanten)
- `Tool result handling in execution engine` — niet geverifieerd
- `Canvas: model selector toont tool use support per adapter` — niet geverifieerd

### Sprint 14 — Agent Library Scale-up
- `50 Infrastructure & DevOps agents (agents/library/infra-devops/)` — directory bestaat NIET
- `50 Testing & QA agents (agents/library/testing-qa/)` — directory bestaat NIET
- `50 API & Integration agents (agents/library/api-integration/)` — directory bestaat NIET
- `50 Database & Data agents (agents/library/database-data/)` — directory bestaat NIET
- `Maturity veld toevoegen aan alle 220 bestaande agents` — niet geverifieerd
- `Library filter UI: filter op maturity niveau` — niet geverifieerd
- `Groeipad dashboard in UI` — niet gevonden

### Sprint 15 — oa-cli × packages/ (4 restanten)
- `Status polling: agents.json → SSE stream naar frontend` — backend leest agents.json maar SSE koppeling niet geverifieerd
- `Flask bridge: POST /api/canvas voor canvas config` — niet geverifieerd
- `Canvas model selector: API | CLI (bridge) | Tmux als drie opties` — niet geverifieerd
- `E2E test: canvas → tmux/claude → oa-cli → result in UI` — niet geverifieerd

### Sprint 16 — Google A2A Protocol
- Alle 4 items: spec analyse, PoC adapter, test, beslissing D-051 — niet gevonden

### Sprint 18 — Tauri Desktop App
- Alle items — Tauri src-tauri/ directory niet aanwezig in repo

### Sprint 18 Dashboard (4 restanten)
- `Integration tests voor ErrorBoundary + ToastProvider` — niet gevonden
- `PipelinePanel API integration + polling logic` — alleen component, geen polling logica
- `TaskBoard API endpoints en dataflow` — niet geverifieerd
- `CSS token audit` — niet geverifieerd

### Sprint 19 — Session Persistence (2 restanten)
- `Integration tests` — niet gevonden
- `Delegation fix testing` — niet gevonden

### Sprint 20 — Desktop + Web App
- `Terminal backend: Fastify + node-pty + WebSocket server` — niet geverifieerd
- Overige items — grotendeels niet geverifieerd

### Sprint 21 — oa-cli als Product (4 restanten)
- `Broadcast UI` — broadcastMessage() in client.ts maar geen UI component
- `messagingStore (Zustand)` — NIET gevonden (wel agentStore, settingsStore, etc.)
- `Checkpoint panel + resume UI` — niet gevonden als component
- `Messages tab centraal` — App.tsx heeft geen messages tab
- `GitHub Actions PyPI release workflow` — geen pypi-release.yml in .github/workflows/
- `E2E: Claude Code → MCP → oa-cli → agent in tmux` — niet geverifieerd

### Sprint 22 — Self-Improvement (1 restant)
- `#16 Context Window Tracking` — geen implementatie gevonden na zoeken in telemetry.py en alle open_agents/*.py

### Fase 6 — Scale & Community
- Alle 4 items — nog niet begonnen

### Toekomstige Integratie: Open-VSCode-Controller
- Alle 4 items — nog niet begonnen

---

## Aanbevelingen

1. **Sprint 14 hernemen**: De 4 agent-library categorieën (infra-devops, testing-qa, api-integration, database-data) zijn nog volledig afwezig. Het doel van 1015+ is al bereikt via andere categorieën, maar deze specifieke categorieën ontbreken.

2. **messagingStore + Broadcast UI**: Sprint 21 F1/F2 markeert een messaging Zustand store als vereist, maar alleen agentStore/settingsStore/etc. zijn geïmplementeerd. De API (client.ts) heeft send/broadcast endpoints, maar er is geen UI-component voor messaging.

3. **#16 Context Window Tracking**: Het enige openstaande item van Sprint 22. Overweeg een compacte implementatie in telemetry.py die token usage per run bijhoudt.

4. **Sprint 15 verificatie**: OaCLIRuntime en tmux ModelId zijn bevestigd, maar de volledige Sprint 15 keten (SSE polling, Flask bridge canvas config, model selector UI) is niet grondig geverifieerd.

5. **ROADMAP status header bijwerken**: Het statusregel op regel 7 noemt nog "714+ templates (32 categories)" maar er zijn nu **1580 JSON bestanden in 106 categorieën**.

---

*Rapport gegenereerd op 2026-03-11 door roadmap-reconciler agent.*
