---
version: 1
lastUpdated: "2026-03-02"
injectIntoExecution: true
---

# User Instructions

> Global instructies die alle agents op het canvas meekrijgen als context.
> Bewerk via Settings > User Instructions, of direct in dit bestand.

---

## Platform

- Taal: Nederlands voor communicatie, Engels voor code en variabelen
- Skill level: beginner / intermediate / advanced — past UI labels aan
- Alle configuratie is workspace-lokaal (geen global settings)

## Integrations

- **Claude Code**: MCP server (`packages/vscode-extension/dist/mcp-server.js`) met 6 tools: `get_canvas_state`, `get_agent_configs`, `create_agent`, `update_canvas`, `list_templates`, `run_flow`
- **VS Code Extension**: Canvas als webview panel, status bar health indicator, sidebar met Quick Actions
- **Backend API**: Fastify op `http://localhost:3001`, alle routes onder `/api/`
- **Agent SDK**: Anthropic Agent SDK voor Claude-gebaseerde agents, directe API calls voor OpenAI/Mistral/Ollama

## Execution

- Flow pattern: topologisch gesorteerd, output van vorige node als context voor volgende
- Safety rules worden toegepast vóór uitvoering (tool restricties, bash blacklist)
- Error handling: retry (max 3x) / skip / abort — user kiest bij fout
- Timeout: 5 minuten per run
- Agents ontvangen deze USER_INSTRUCTIONS als extra context bovenop hun system prompt

## Canvas

- React Flow v12 met drag-and-drop, zoom, pan
- Nodes: agent / dispatcher / aggregator
- Edges: verbinden output → input
- Themes: impertio (default), neutral, midnight
- State persistence: localStorage + workspaceState (VS Code)

## Providers

- Format: `provider/model` (bijv. `anthropic/claude-sonnet-4-6`)
- Anthropic: Claude Haiku 4.5, Sonnet 4.6, Opus 4.6 — geen API key nodig via Agent SDK OAuth
- OpenAI: GPT-4o, o3 — BYOK vereist
- Mistral: Mistral Large, Small, Codestral — BYOK vereist
- Ollama: lokale modellen, geen key nodig

## Workflow

- Preset agents in `agents/presets/*.json` — drag naar canvas
- Factory wizard: 5-stap agent creation (naam → model → prompt → tools → review)
- LLM-powered generatie: beschrijf wat je wilt, AI maakt de agent config
- Exporteer canvas als JSON configuratie
