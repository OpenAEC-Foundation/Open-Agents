# Open Standards for Agents & Skills — Adviesrapport

**Date**: 2026-03-11
**Status**: Final
**Author**: standards-researcher agent
**Issue**: Open-Agents standaarden alignment

---

## Samenvatting

| Standaard | Huidige situatie | Beslissing | Effort | Impact |
|-----------|-----------------|------------|--------|--------|
| Anthropic model IDs | Inconsistent (2 formats) | **ADOPT** — standardiseer op 2 formats (model + modelHint) | Klein | Hoog |
| MCP tools declaratie | Geen `mcpTools` veld | **LATER** — voeg `mcpTools` toe bij Sprint 15 MCP server | Medium | Medium |
| Google A2A Protocol | Geen A2A support | **ADOPT (fasegewijs)** — Compatibility Layer, Phase 1 eerst | Medium | Hoog |
| OpenAI function calling schema | Strings in `tools[]` | **SKIP** voor built-in tools, **LATER** voor custom tools | Medium | Medium |
| Agent skill format standaard | SKILL.md (eigengemaakt) | **SKIP** wijziging — SKILL.md is correct voor ons gebruik | Klein | Laag |

---

## 1. Officiële Anthropic Model IDs

### Huidige situatie

In de agent JSON templates worden twee fields gebruikt met inconsistente formats:

```json
{
  "model": "anthropic/claude-sonnet-4-6",
  "modelHint": "claude/sonnet"
}
```

De officiële Anthropic model IDs per augustus 2025:
- `claude-sonnet-4-6`
- `claude-haiku-4-5-20251001`
- `claude-opus-4-6`

D-011 (2026-02-28) besloot: `model` field gebruikt `provider/model` format: `anthropic/claude-sonnet-4-6`, `mistral/mistral-large`, `openai/o3` etc.

`modelHint` is een intern oa-cli routing veld dat de Claude Code CLI aanstuurt.

### Gap

De inconsistentie zit niet zozeer in de format-keuze, maar in dat sommige templates `model` en `modelHint` inconsistent vullen, of alleen één van de twee hebben.

### Aanbeveling

**ADOPT** — standaardiseer de twee fields op twee duidelijke doeleinden:

| Field | Doel | Format | Voorbeeld |
|-------|------|--------|-----------|
| `model` | Multi-provider routing (D-011) | `provider/model` met exacte versie | `anthropic/claude-sonnet-4-6` |
| `modelHint` | oa-cli tier routing — versie-agnostisch | `claude/tier` | `claude/sonnet` |

**Rationale voor `modelHint` als tier shorthand:**
1. Tier-shorthand (`claude/sonnet`) routeert altijd naar de actuele versie binnen die tier — geen update nodig bij nieuwe releases.
2. `model` heeft al de exacte versie voor provider-specifieke routing.
3. Wanneer nieuwe modellen uitkomen (claude-sonnet-4-7), hoeft alleen `model` te worden bijgewerkt, niet `modelHint`.

**Officiële oa-cli modelHint waarden:**

| Shorthand | Mapt op (augustus 2025) | Gebruik |
|-----------|------------------------|---------|
| `claude/haiku` | claude-haiku-4-5-20251001 | Snel, goedkoop, structureel werk |
| `claude/sonnet` | claude-sonnet-4-6 | Standaard — codering, schrijven, analyse |
| `claude/opus` | claude-opus-4-6 | Zwaar redeneren, architectuur |

**Beslissing om vast te leggen (D-054):**
> `model` gebruikt `provider/model` format met exacte versie (D-011). `modelHint` gebruikt `claude/tier` shorthand (claude/haiku, claude/sonnet, claude/opus) voor oa-cli routing — versie-agnostisch. Beide fields zijn verplicht in elk agent JSON template.

---

## 2. MCP (Model Context Protocol)

### Standaard overview

MCP (v2025-11-25, current) is een open protocol dat standaardiseert hoe LLM applicaties verbinding maken met externe tools en data bronnen. Het gebruikt JSON-RPC 2.0 over twee transports:
- **stdio** — voor lokale processen (meest gebruikt voor Claude Code MCP servers)
- **HTTP + SSE** — voor remote servers

Drie server primitieven:
- **Tools** — functies die het model kan aanroepen (model-controlled)
- **Resources** — context/data (application-controlled)
- **Prompts** — herbruikbare workflows

MCP tool definitie format:
```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "inputSchema": {
    "type": "object",
    "properties": {
      "location": { "type": "string", "description": "City or zip code" }
    },
    "required": ["location"]
  }
}
```

### Huidige situatie

- oa-cli agents kunnen MCP tools **gebruiken** via Claude Code's MCP integratie (`.mcp.json` in project root).
- oa agents kunnen momenteel **geen tools exposeren** als MCP server.
- Agent templates hebben geen `mcpTools` veld om te declareren welke MCP tools ze nodig hebben of exposeren.
- Sprint 15 gepland: `oa MCP Server` — oa-cli als MCP server exposed.

### Gap analyse

| Scenario | Status |
|----------|--------|
| Agent gebruikt MCP tools (via .mcp.json) | ✅ Werkt |
| Agent declareert welke MCP tools nodig | ❌ Geen `mcpTools` veld |
| Agent exposeert eigen tools als MCP server | ❌ Niet geïmplementeerd |
| oa-cli als MCP server | 📋 Sprint 15 gepland |

### Aanbeveling

**LATER** — Voeg `mcpTools` veld toe aan agent JSON bij Sprint 15.

Voorgesteld veld:
```json
{
  "mcpTools": {
    "requires": ["filesystem", "web-search"],
    "exposes": []
  }
}
```

- `requires`: MCP tool namen die dit agent nodig heeft (voor automatische `.mcp.json` configuratie)
- `exposes`: tools die dit agent zelf als MCP server beschikbaar stelt (voor Sprint 15 oa MCP server)

**Sprint 15 alignment:**
Het `oa a2a serve` (A2A) en `oa MCP server` zijn hetzelfde patroon: protocol adapters die oa-cli intern aansturen via een externe standaard interface. Bouw ze parallel.

**Effort estimate:** 3-5 dagen voor `mcpTools` field + schema, exclusief Sprint 15 MCP server implementatie.

---

## 3. Google A2A Protocol

### Standaard overview

A2A (Agent-to-Agent, v0.3.0, July 2025) is een open standaard voor agent-to-agent communicatie over HTTP/JSON-RPC 2.0. Gebruik: horizontale communicatie tussen agents van verschillende platforms.

> MCP = agent ↔ tools (verticaal). A2A = agent ↔ agent (horizontaal).

Kernconcepten:
- **Agent Card** — JSON op `/.well-known/agent.json` — beschrijft capabilities
- **Task lifecycle** — `submitted` → `working` → `input-required` → `completed`/`failed`
- **Skills** — gedeclareerde capabilities in de Agent Card
- **Transport** — HTTP/SSE + gRPC (v0.3.0)

### Huidige situatie

Diepgaand onderzocht in [`a2a-compatibility.md`](./a2a-compatibility.md). Samenvatting:

| A2A Concept | Open-Agents equivalent | Status |
|-------------|----------------------|--------|
| Agent identity | naam + CLAUDE.md | Gedeeltelijk |
| Task lifecycle | running/done/error | Gedeeltelijk |
| Messaging | oa send/inbox (file-based) | Gedeeltelijk |
| Skill discovery | library JSON templates | Gedeeltelijk |
| Agent Card | Geen | **Ontbreekt** |
| HTTP endpoint per agent | Geen (tmux-only) | **Ontbreekt** |

### Aanbeveling

**ADOPT fasegewijs** — Compatibility Layer (Option B, per `a2a-compatibility.md`):

- **Phase 1** (2-3 dagen): `oa a2a serve` — lichtgewicht HTTP server met Agent Card + task status endpoint. Read-only.
- **Phase 2** (1-2 weken): inbound task delegation — externe A2A clients kunnen oa agents aansturen.
- **Phase 3** (3-5 weken): outbound A2A client — oa kan externe A2A agents aanroepen.

**Beslissing D-051 (reeds in a2a-compatibility.md):**
> Option B — Compatibility Layer. Phase 1 eerst. Interne oa messaging (file-based) blijft ongewijzigd.

**Ecosysteem timing:** A2A v0.3.0 (July 2025) heeft echte adoptie (LangChain, IBM, Vertex AI). Phase 1 is laag-risico en hoog-waarde.

---

## 4. OpenAI Function Calling Format

### Standaard overview

OpenAI's function calling / tool use schema (de facto industrie standaard, ook adopted door Anthropic, Google, LangChain):

```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get current weather for a location",
    "parameters": {
      "type": "object",
      "properties": {
        "location": { "type": "string" }
      },
      "required": ["location"]
    }
  }
}
```

Anthropic's variant (in API):
```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": { "type": "string" }
    },
    "required": ["location"]
  }
}
```

Het verschil: Anthropic gebruikt `input_schema` i.p.v. `parameters`. Inhoud (JSON Schema) is identiek.

### Huidige situatie

Onze agent templates gebruiken `tools` als array van strings:
```json
{
  "tools": ["Read", "Write", "Edit", "Glob", "Grep"]
}
```

Dit zijn Claude Code built-in tool namen, niet custom function definitions.

### Gap analyse

**Twee verschillende use cases voor `tools`:**

| Use case | Huidige aanpak | OpenAI format |
|----------|---------------|---------------|
| Claude Code built-in tools | Strings: `["Read", "Write"]` | N.v.t. — built-in tools hebben geen JSON schema nodig |
| Custom agent tools (toekomst) | Niet geïmplementeerd | Volledig JSON Schema definitie nodig |

### Aanbeveling

**SKIP voor built-in tools** — De string array format voor Claude Code built-in tools is correct en heeft geen schema definitie nodig. OpenAI format is hier niet van toepassing.

**LATER voor custom tools** — Als agents custom tools gaan exposeren (niet built-in), adopteert Open-Agents het Anthropic tool format (vrijwel identiek aan OpenAI):
```json
{
  "customTools": [
    {
      "name": "run_test",
      "description": "Run a test suite and return results",
      "input_schema": {
        "type": "object",
        "properties": {
          "test_file": { "type": "string" }
        },
        "required": ["test_file"]
      }
    }
  ]
}
```

**Rationale:** Anthropic format (met `input_schema`) is de juiste keuze voor een Claude-first platform. JSON Schema inhoud is identiek aan OpenAI — dus multi-provider compatibel qua schema, ook al heet het field anders.

---

## 5. Agent Skill Format Standaard

### Standaard overview

**A2A Skill definitie** (in Agent Card):
```json
{
  "id": "run-agent",
  "name": "Run Agent",
  "description": "Spawn a Claude Code agent with a task",
  "tags": ["orchestration"],
  "inputModes": ["text/plain"],
  "outputModes": ["application/json"],
  "examples": ["Write a Python function that validates email"]
}
```

**Andere emerging standaarden:**
- Geen dominante open standaard voor skill definities in 2025/2026. A2A's Agent Card heeft een Skill concept, maar dit is voor externe discovery — niet voor context engineering.
- LangChain Tools, CrewAI Tools, AutoGen etc. hebben allemaal eigen formats.

### Huidige situatie

Open-Agents SKILL.md aanpak:
```yaml
---
name: skill-name
description: "Trigger keywords. Used by Claude Code to auto-load."
user-invocable: false
---

## Content
Kennis die Claude in context laadt...
```

Dit is primair een **context engineering tool** — het laadt domeinkennis in Claude's context window op het juiste moment. Dit is fundamenteel anders dan A2A Skills (extern discovery mechanism).

### Gap analyse

| Aspect | SKILL.md | A2A Skill | Verschil |
|--------|----------|-----------|---------|
| Doel | Kennis in context laden | Externe capability discovery | Verschillend doel |
| Format | Markdown + frontmatter | JSON in Agent Card | Niet conflicterend |
| Machine-readable | Beperkt (frontmatter) | Volledig | Gap voor externe discovery |
| Trigger | Auto-load op keywords | HTTP discovery | Verschillend mechanisme |

### Aanbeveling

**SKIP wijziging aan SKILL.md** — de aanpak is correct voor het primaire doel (context engineering).

**LATER** — voeg A2A Skill mapping toe:
- Bij Phase 1 A2A implementatie: genereer automatisch A2A Skill entries in de Agent Card op basis van library JSON templates (die al `description`, `tags`, `tools` hebben).
- SKILL.md skills zijn intern — niet direct geschikt voor A2A exposure.

**Dual-track:**
- Intern (context engineering): SKILL.md aanpak — ongewijzigd.
- Extern (A2A discovery): Agent Card skills gegenereerd uit library JSON templates.

---

## Beslissingen om vast te leggen

### D-054 — Model ID Standaard (NIEUW)

> **Beslissing**: Twee verplichte fields in elk agent JSON template:
> - `model`: `provider/model` met exacte versie per D-011 (bv. `anthropic/claude-sonnet-4-6`)
> - `modelHint`: `claude/tier` shorthand voor oa-cli routing (bv. `claude/sonnet`) — versie-agnostisch
>
> **Officiële oa-cli waarden**: `claude/haiku`, `claude/sonnet`, `claude/opus`
> **Datum**: 2026-03-11

### D-051 — A2A Protocol (bevestigd, zie a2a-compatibility.md)

> Compatibility Layer (Option B). Phase 1: `oa a2a serve` met read-only Agent Card. Phase 2: inbound delegation. Phase 3: outbound client.

### D-055 — MCP Tools Declaratie (NIEUW)

> **Beslissing**: LATER — voeg `mcpTools` veld toe aan agent JSON bij Sprint 15 MCP server implementatie.
> Format: `{ "requires": ["tool-name"], "exposes": [] }`
> **Datum**: 2026-03-11

### D-056 — Tool Schema Format (NIEUW)

> **Beslissing**: Built-in Claude Code tools blijven als string array in `tools[]`. Custom tools (toekomstig) gebruiken Anthropic API tool format met `input_schema` (JSON Schema 2020-12 compatible, identiek aan OpenAI parameters schema).
> **Datum**: 2026-03-11

---

## Bronnen

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/)
- [MCP Tools Spec](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [A2A Protocol — a2a-compatibility.md](./a2a-compatibility.md)
- [A2A GitHub (a2aproject/A2A)](https://github.com/a2aproject/A2A)
- [Anthropic API Model IDs](https://docs.anthropic.com/en/docs/about-claude/models)
- [Open-Agents DECISIONS.md — D-011](../../DECISIONS.md)
- Open-Agents agent library format: `agents/library/code-dev/add-comments.json`
