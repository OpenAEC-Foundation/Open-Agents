# Agent Registry & Discovery — Research Rapport

> **Issue**: #50
> **Datum**: 2026-03-11
> **Auteur**: Research Agent (claude-sonnet-4-6)
> **Status**: Draft — ready for review

---

## Inhoudsopgave

1. [Agent Card Spec](#1-agent-card-spec)
2. [Registry Opties](#2-registry-opties)
3. [Discovery Protocol](#3-discovery-protocol)
4. [Vergelijking: Anthropic & Google A2A](#4-vergelijking-anthropic--google-a2a)
5. [Aanbeveling voor Open-Agents MVP](#5-aanbeveling-voor-open-agents-mvp)

---

## 1. Agent Card Spec

Een **Agent Card** is het identiteitsdocument van een agent — vergelijkbaar met een visitekaartje plus cv. Het beantwoordt drie vragen:
- **Wie ben ik?** (id, name, description)
- **Wat kan ik?** (capabilities, tools, model)
- **Hoe bereik je me?** (status, endpoint)

### 1.1 Schema Design Principes

Het schema in `docs/schemas/agent-card.json` volgt JSON Schema Draft-07 en is opgebouwd rond vijf kernprincipes:

**1. Minimale vereisten, rijke optionals**
Slechts vijf velden zijn `required`: `id`, `name`, `description`, `model`, `status`. Al het andere is optioneel. Dit maakt registratie laagdrempelig — een minimale Agent Card werkt direct.

**2. Slug IDs voor leesbaarheid**
IDs zijn slugs (`research-agent-registry`, `code-reviewer`) in plaats van UUIDs. Voordelen: menselijk leesbaar, direct bruikbaar als tmux-sessienaam, en deterministisch reproduceerbaar. Nadeel: vereist uniekheidscheck bij registratie.

**3. Model-hint losgekoppeld van exact model**
Het `model.hint` veld (`haiku`/`sonnet`/`opus`) staat los van `model.id`. Dit betekent dat een orchestrator kan routeren op capability-tier zonder exact te weten welk model draait. Vandaag is `claude-sonnet-4-6` de sonnet-tier; morgen kan dat `claude-sonnet-5-0` zijn zonder dat routeringslogica verandert.

**4. Endpoint polymorfisme**
Het `endpoint.type` kan `tmux`, `http`, `sse`, `stdio` of `queue` zijn. Open-Agents gebruikt nu tmux; toekomstige HTTP-gebaseerde agents krijgen automatisch support.

**5. Hiërarchie via parent**
Het `parent` veld maakt agent-bomen traceerbaar. Een orchestrator ziet direct welke agents hij heeft gespawnd, en agents kunnen doorverwijzen naar hun parent.

### 1.2 Minimale Geldige Agent Card

```json
{
  "id": "my-agent",
  "name": "My Agent",
  "description": "Does exactly one thing and does it well",
  "model": { "provider": "anthropic", "id": "claude-sonnet-4-6" },
  "status": "idle"
}
```

### 1.3 Schema Locatie

```
docs/schemas/agent-card.json   ← JSON Schema definitie
~/.oa/registry/                ← runtime agent cards (één YAML per agent)
```

---

## 2. Registry Opties

Een registry slaat Agent Cards op en maakt ze opvraagbaar. We vergelijken vier opties op de dimensies die voor Open-Agents relevant zijn.

### 2.1 File-based: `~/.oa/registry/`

**Implementatie**: Één YAML of JSON bestand per agent in `~/.oa/registry/<agent-id>.yaml`.

```
~/.oa/
  registry/
    research-agent-registry.yaml
    code-reviewer.yaml
    doc-writer.yaml
```

**Voordelen**:
- Nul extra dependencies — werkt overal waar bash draait
- Menselijk leesbaar en editeerbaar — ideaal voor debugging
- Versiebeheer-vriendelijk (git-trackable)
- `oa status` kan gewoon `ls ~/.oa/registry/*.yaml` doen
- Atomaire writes via rename-atomicity (schrijf naar `.tmp`, rename naar target)

**Nadelen**:
- Geen concurrent access control (twee agents schrijven tegelijk → race condition)
- Geen query-mogelijkheden (filter op `status=running` = alle files lezen)
- Schaalt niet voorbij ~1000 agents (directory listing wordt traag)

**Geschikt voor**: MVP, development, single-machine deployments

### 2.2 SQLite: `~/.oa/registry.db`

**Implementatie**: Embedded SQLite database met één `agents` tabel.

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  model_provider TEXT,
  model_id TEXT,
  model_hint TEXT,
  status TEXT DEFAULT 'idle',
  endpoint_type TEXT,
  endpoint_address TEXT,
  parent_id TEXT,
  registered_at DATETIME,
  last_seen_at DATETIME,
  card_json TEXT  -- volledige Agent Card als JSON blob
);
```

**Voordelen**:
- ACID-transacties — geen race conditions
- Query-mogelijkheden: `SELECT * FROM agents WHERE status='running' AND model_hint='sonnet'`
- Nul server-overhead — embedded library
- Python `sqlite3` module is standaard; Node.js `better-sqlite3` is breed gebruikt

**Nadelen**:
- Binaire database — niet direct leesbaar/editeerbaar
- Vereist schema-migraties bij wijzigingen
- Write-lock bij hoge concurrency (SQLite is single-writer)

**Geschikt voor**: Productie op single-machine, wanneer query-filtering nodig is

### 2.3 In-Memory

**Implementatie**: Python dict of Node.js Map in een langlopend `oa` daemon-proces.

```python
registry: dict[str, AgentCard] = {}

def register(card: AgentCard) -> None:
    registry[card.id] = card

def discover(domain: str) -> list[AgentCard]:
    return [c for c in registry.values() if domain in c.capabilities.domains]
```

**Voordelen**:
- Snelste reads/writes — geen I/O
- Triviaal te implementeren
- Geen persistentie-complexiteit

**Nadelen**:
- **Verlies bij restart** — geen durability
- Vereist een altijd-draaiend daemon-proces
- Niet deelbaar tussen processen zonder IPC

**Geschikt voor**: Testing, proof-of-concept, ephemere agent-pools binnen één proces

### 2.4 Redis

**Implementatie**: Redis als gecentraliseerde key-value store met JSON-blobs.

```bash
# Registreer agent
redis-cli SET "agent:research-agent-registry" '{"id":"research-agent-registry",...}' EX 300

# Ontdek agents per domain
redis-cli SMEMBERS "domain:research"

# Heartbeat
redis-cli EXPIRE "agent:research-agent-registry" 300
```

**Voordelen**:
- Distributed — meerdere machines kunnen dezelfde registry delen
- TTL-based expiry — dode agents verdwijnen automatisch
- Pub/Sub voor real-time events (agent gestart, agent klaar)
- Atomaire operaties via Lua scripts

**Nadelen**:
- Externe dependency — vereist Redis server
- Over-engineered voor single-machine use
- Complexere operationele overhead

**Geschikt voor**: Multi-machine deployments, cloud-native scenarios, wanneer real-time events nodig zijn

### 2.5 Vergelijkingstabel

| Criterium | File-based | SQLite | In-Memory | Redis |
|-----------|:----------:|:------:|:---------:|:-----:|
| Dependencies | Geen | sqlite3 | Geen | Redis server |
| Persistentie | ✅ | ✅ | ❌ | ✅ |
| Concurrent writes | ⚠️ | ✅ | ✅ | ✅ |
| Query-filtering | ❌ | ✅ | ✅ | ⚠️ |
| Menselijk leesbaar | ✅ | ❌ | N/A | ❌ |
| Distributed | ❌ | ❌ | ❌ | ✅ |
| Implementatie-eenvoud | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| MVP geschikt | ✅ | ✅ | ⚠️ | ❌ |

---

## 3. Discovery Protocol

Discovery is het mechanisme waarmee agents (en orchestrators) andere agents kunnen **vinden** op basis van criteria, niet op basis van een exact ID.

### 3.1 Discovery Queries

Een discovery query filtert de registry op een of meer criteria:

```python
# Interface
def discover(
    domain: str | None = None,        # "research", "code", "data"
    model_hint: str | None = None,    # "haiku", "sonnet", "opus"
    status: str | None = None,        # "idle", "running", "busy"
    tools: list[str] | None = None,   # ["bash", "web_search"]
    tags: list[str] | None = None,    # ["issue-50", "2026-03"]
    parent: str | None = None,        # kinderen van een orchestrator
    limit: int = 10
) -> list[AgentCard]:
    ...
```

**Voorbeeldqueries**:
```bash
# Vind een beschikbare sonnet-tier research agent
oa discover --domain research --model-hint sonnet --status idle

# Vind alle kinderen van de orchestrator
oa discover --parent orchestrator

# Vind agents met web_search toegang
oa discover --tools web_search
```

### 3.2 Heartbeat & Health

Agents die actief zijn moeten periodiek een heartbeat sturen:

```bash
# Elke 30 seconden
while true; do
  oa register --heartbeat research-agent-registry
  sleep 30
done
```

De registry markeert agents als `offline` als ze langer dan 2× de heartbeat-interval geen update hebben gestuurd (default: 90 seconden). Dit voorkomt stale registraties na crashes.

### 3.3 Lifecycle Events

```
REGISTERED → IDLE → RUNNING → BUSY → IDLE → TERMINATED
                  ↘ ERROR ↗
```

| Event | Trigger | Registry actie |
|-------|---------|----------------|
| `registered` | `oa run` start | Card aanmaken, status=idle |
| `started` | Agent verwerkt eerste taak | status=running, timestamps.started |
| `busy` | Agent op capaciteit | status=busy |
| `idle` | Agent klaar met taak | status=idle |
| `error` | Agent crasht | status=error |
| `terminated` | `oa kill` of natural exit | Card bewaren (history), status=terminated |

### 3.4 Multi-Agent Discovery Flow

```
Orchestrator                Registry                Sub-agents
     │                          │                        │
     │──discover(domain="code")─▶│                        │
     │◀─[code-reviewer, ...]─────│                        │
     │                          │                        │
     │──spawn(code-reviewer)────────────────────────────▶│
     │                          │                        │──register──▶│
     │                          │◀────────────────────── heartbeat ────│
     │──send(task)─────────────────────────────────────▶│
     │◀─collect(result)──────────────────────────────────│
     │                          │                        │──terminate──▶│
     │                          │◀────────────────────── status=terminated
```

### 3.5 oa-cli Discovery Commands

```bash
# Registreer jezelf (bij opstarten)
oa register --card ./agent-card.json

# Ontdek agents
oa discover [--domain DOMAIN] [--status STATUS] [--model-hint HINT]

# Heartbeat (update lastSeen)
oa register --heartbeat <agent-id>

# Deregistreer (bij afsluiten)
oa register --unregister <agent-id>
```

---

## 4. Vergelijking: Anthropic & Google A2A

### 4.1 Anthropic Agent Cards

Anthropic's MCP-ecosysteem definieert agent-identificatie via **tool descriptions** in servers, niet via expliciete Agent Cards. Relevante concepten:

- **Tool manifest**: elke MCP server exposed tools met name, description, inputSchema
- **Server discovery**: via `.mcp.json` configuratiebestand
- **No runtime registry**: agents zijn statisch geconfigureerd, geen dynamische discovery

**Relevant voor Open-Agents**:
- Ons `tools[]` array in de Agent Card is analoog aan MCP tool-manifests
- `.mcp.json` kan als statische registry-bron dienen
- Gap: MCP heeft geen runtime-status, geen heartbeats, geen dynamic discovery

### 4.2 Google Agent-to-Agent (A2A) Protocol

Google's A2A (2025) definieert expliciete **Agent Cards** op een `/.well-known/agent.json` endpoint:

```json
{
  "name": "My Agent",
  "description": "...",
  "url": "https://agent.example.com",
  "version": "1.0.0",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "skills": [
    {
      "id": "research",
      "name": "Research Skill",
      "description": "...",
      "inputModes": ["text"],
      "outputModes": ["text"]
    }
  ],
  "authentication": { "schemes": ["Bearer"] }
}
```

**Overeenkomsten met ons schema**:
- `name`, `description`, `version` → identiek
- `capabilities.streaming` → identiek
- `skills` ≈ ons `capabilities.domains`

**Verschillen**:
- A2A focust op **HTTP-gebaseerde agents** met expliciete URL endpoints
- A2A heeft **authentication** (wij niet in MVP)
- A2A heeft **skills** als gestructureerde entiteiten met input/output modes
- A2A heeft geen `model` veld — provider-agnostisch
- Wij hebben `status`, `parent`, `endpoint.type=tmux` — niet in A2A (lokale agents)

### 4.3 Vergelijkingstabel

| Feature | Open-Agents | Anthropic MCP | Google A2A |
|---------|:-----------:|:-------------:|:----------:|
| Expliciete Agent Card | ✅ | ❌ (tool manifest) | ✅ |
| Runtime status | ✅ | ❌ | ❌ |
| Model informatie | ✅ | ❌ | ❌ |
| Parent/hiërarchie | ✅ | ❌ | ❌ |
| HTTP endpoint | ✅ (optioneel) | ✅ | ✅ (vereist) |
| Local/tmux transport | ✅ | ❌ | ❌ |
| Authentication | ❌ (MVP) | ✅ (OAuth) | ✅ |
| Discovery protocol | ✅ (file/SQLite) | ❌ (static config) | ❌ (static URL) |
| Heartbeat/health | ✅ | ❌ | ❌ |
| Open standaard | Intern | Open (spec) | Open (spec) |

**Conclusie**: Open-Agents heeft unieke behoeften die beide standaarden niet dekken — runtime-status, tmux-transport, agent-hiërarchieën. We adopteren de A2A-terminologie (`capabilities`, `skills`-concept) maar behouden eigen extensies voor local-process management.

---

## 5. Aanbeveling voor Open-Agents MVP

### 5.1 Aanbevolen Stack

**Registry**: File-based YAML (`~/.oa/registry/<agent-id>.yaml`)

Motivatie:
1. **Nul dependencies** — geen SQLite migraties, geen Redis setup
2. **Debuggable** — `cat ~/.oa/registry/research-agent.yaml` toont altijd de state
3. **oa status** is al een directory-listing — registry is een natuurlijke extensie
4. **Migreerpad**: wanneer query-filtering bottleneck wordt, swap naar SQLite zonder API-wijziging

**Schema**: `docs/schemas/agent-card.json` (versie 1.0.0, als in dit rapport)

**Discovery**: Simpele Python/bash filtering op YAML-bestanden

### 5.2 MVP Implementatieplan

**Fase 1: Basis (Sprint X)**
```
oa register    — schrijf ~/.oa/registry/<id>.yaml
oa discover    — filter YAMLs op criteria
oa unregister  — verwijder YAML
```

**Fase 2: Heartbeat (Sprint X+1)**
```
oa register --heartbeat <id>   — update lastSeen
oa daemon                       — background process die stale agents markeert
```

**Fase 3: Events (Sprint X+2)**
```
oa registry events              — watch registry changes (inotify / polling)
oa discover --watch             — live stream van nieuwe agents
```

### 5.3 Integratie met oa-cli

Bij `oa run`:
```bash
# 1. Maak workspace aan
# 2. Schrijf Agent Card naar ~/.oa/registry/<name>.yaml
# 3. Start tmux sessie
# 4. Agent draait, stuurt heartbeats
# 5. Bij afsluiten: update status naar 'terminated'
```

Bij `oa status`:
```bash
# Leest ~/.oa/registry/*.yaml
# Filtert op status != 'terminated' (of toon alles met --all)
# Output tabel met id, name, status, model, uptime
```

Bij `oa kill <name>`:
```bash
# Kill tmux sessie
# Update registry: status=terminated, timestamps.terminated=now
```

### 5.4 Compat met A2A

Voor toekomstige inter-operabiliteit: wanneer een agent een HTTP endpoint heeft, kan een `GET /.well-known/agent.json` endpoint de Agent Card als A2A-compatibele response returnen. Dit kan als optionele Fase 4 worden toegevoegd zonder de core registry te wijzigen.

### 5.5 Bestandslocaties

```
docs/schemas/agent-card.json       ← normatief JSON Schema (dit rapport)
~/.oa/registry/                    ← runtime registry (per-agent YAML)
~/.oa/registry/.schema-version     ← schema versie voor migraties
oa-cli/src/registry/               ← implementatie (Python)
  registry.py                      ← read/write/discover operaties
  heartbeat.py                     ← background heartbeat daemon
  schema.py                        ← pydantic model van Agent Card
```

---

## Samenvatting

| Beslissing | Keuze | Reden |
|------------|-------|-------|
| Registry backend | File-based YAML | Nul deps, debuggable, migreerbaar |
| Card schema | JSON Schema Draft-07 | Breed ondersteund, valideerbaar |
| IDs | Slugs (niet UUIDs) | Leesbaar, bruikbaar als tmux-naam |
| Model referentie | Provider + ID + hint | Decoupled van exact model-versie |
| Discovery | YAML-filtering (MVP) | Simpel genoeg; SQLite later |
| A2A compat | Optionele HTTP adapter | Niet in MVP, wel in roadmap |
| Heartbeat interval | 30s send, 90s timeout | Balans tussen overhead en detectie |

---

*Dit rapport is geschreven door de Research Agent als onderdeel van Open-Agents issue #50.*
*Schema: `docs/schemas/agent-card.json` — Gegenereerd: 2026-03-11*
