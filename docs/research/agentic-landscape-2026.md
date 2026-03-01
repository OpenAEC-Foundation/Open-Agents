# Agentic Landscape 2026 — Trends, Architecturen & Context Engineering

> **Datum**: 2026-03-04
> **Onderzoeker**: Freek Heijting + Claude
> **Context**: Wat zijn de terechte hypes en diepste inzichten in agentic coding, context engineering en AI-architecturen?

---

## 1. MiniMax — De Chinese Dark Horse

MiniMax (Shanghai, opgericht 2022) is een serieuze speler die vaak over het hoofd wordt gezien:

**MiniMax-M2.5** (februari 2026):
- **SWE-Bench Verified**: 80.2% (vergelijkbaar met Claude Sonnet)
- **Multi-SWE-Bench**: 51.3%
- **Training**: 200.000+ real-world environments, 10+ talen
- **Intern gebruik**: 80% van nieuw gecommitte code bij MiniMax is M2.5-gegenereerd; 30% van alle taken volledig autonoom

**Waarom relevant voor Open-Agents**: MiniMax M2 is via OpenRouter beschikbaar. Pi ondersteunt het al als provider via `openai-completions` protocol. Onze runtime adapters (D-015) zouden MiniMax kunnen ondersteunen zonder nieuwe adapter — het spreekt OpenAI Completions.

**MiniMax-M1**: World's first open-weight hybrid-attention reasoning model. Interessant voor self-hosted deployment via Ollama.

---

## 2. Context Engineering — De Nieuwe Architectuurdiscipline

> "Context engineering is prompt engineering's grown-up sibling — it treats context as a first-class system with its own architecture, lifecycle, and constraints." — Manus team

### 2.1 Definitie

Context engineering = het cureren van welke tokens het model ziet, zodat je betere resultaten krijgt. Niet alleen de prompt, maar ALLES wat in het context window terechtkomt: system prompt, tools, history, file content, memory.

### 2.2 De Vijf Strategieën (Manus + Anthropic)

#### Strategie 1: KV-Cache Hit Rate Optimalisatie

> "The KV-cache hit rate is the single most important metric for a production-stage AI agent." — Manus

- Cached tokens kosten $0.30/M vs $3/M uncached bij Claude Sonnet = **10x verschil**
- Stabiele prefixes: timestamps in system prompts breken de HELE cache
- Append-only contexts: geen retroactieve wijzigingen
- Deterministische JSON serialisatie

**Actie voor Open-Agents**: Onze assembly engine stuurt system prompts met dynamische content. We moeten stabiele prefixes garanderen en dynamische content naar het EINDE van de prompt verplaatsen.

#### Strategie 2: Tool Masking ipv Tool Removal

Manus maskeert token logits tijdens decoding om acties te beperken, in plaats van tools dynamisch te verwijderen (wat de cache breekt).

Drie function-calling modes:
- **Auto**: Model kiest zelf
- **Required**: Moet een tool callen
- **Specified**: Moet uit een subset kiezen (via prefix: `browser_*`, `shell_*`)

**Actie**: Onze safety rules (Sprint 5) filteren tools via een allowlist. Dit breekt potentieel de cache. Overweeg masking als alternatief.

#### Strategie 3: File System als Extended Context

Files behandelen als gestructureerd, onbeperkt geheugen BUITEN het context window.

**Restorable Compression**:
- Web content droppen, URL bewaren voor herstel
- Document content weglaten, file path bewaren
- Nooit onomkeerbaar informatieverlies

Agents bereiken **100:1 input-to-output token ratio's** zonder context-explosie.

**Actie**: Onze knowledge snippets (56 bestanden) worden nu allemaal geladen. Progressive disclosure (alleen laden wat nodig is) zou de context drastisch verkleinen.

#### Strategie 4: Recitation via Todo Lists

Agents onderhouden `todo.md` bestanden en herschrijven deze continu. Dit duwt het globale plan naar de recente attention span, waardoor "lost-in-the-middle" wordt voorkomen.

> "Constantly rewriting the todo list pushes the global plan into the model's recent attention span."

Typische taken vereisen ~50 tool calls; constante goal refreshing voorkomt drift.

**Actie**: Onze execution engine zou per-run een intern plan/checklist kunnen bijhouden dat na elke stap wordt bijgewerkt. Dit is direct relevant voor Sprint 6c (AI Assistant).

#### Strategie 5: Error Retention als Leersignaal

Bewaar gefaalde acties en stack traces in context in plaats van de trace op te schonen.

> "When the model sees a failed action and the resulting observation or stack trace, it implicitly updates its internal beliefs."

**Actie**: Onze execution engine's retry/skip/abort flow (Sprint 3) bewaart al error states. Maar we zouden ze explicieter in de context moeten houden voor volgende stappen.

### 2.3 Anthropic's Context Engineering Framework

Drie kernpatronen uit Anthropic's eigen engineering blog:

**1. Compaction**
Conversation nadert context limit → samenvatten → nieuw window met samenvatting + recente files. "Maximize recall first, then improve precision." Tool result clearing is de "safest lightest touch."

**2. Structured Note-Taking (Agentic Memory)**
Agents schrijven regelmatig notities die buiten het context window worden bewaard. Voorbeeld: Claude die Pokémon speelt houdt precieze scores bij over duizenden stappen.

**3. Sub-Agent Architecturen**
Gespecialiseerde agents werken met schone context windows. Elke subagent exploreert extensief maar retourneert gecondenseerde samenvattingen (1.000-2.000 tokens).

### 2.4 Martin Fowler's Context Engineering Taxonomie

| Feature | Type | Trigger | Gebruik |
|---------|------|---------|---------|
| CLAUDE.md | Guidance | Altijd geladen | Project-brede conventies |
| Rules | Guidance | Path-based scoping | Taal/file-type specifiek |
| Skills | Instructions | On-demand (LLM/user) | Lazy-load documentatie |
| Subagents | Isolated contexts | LLM/user | Parallelle taken |
| MCP Servers | External programs | LLM-invoked | API access |
| Hooks | Scripts | Lifecycle events | Auto-format, logging |

Kernprincipe: "Balance the amount of context — not too little, not too much."

---

## 3. Agentic Coding Trends 2026

### 3.1 De Shift: Van Code Schrijven naar Agents Coördineren

> "Engineers are shifting from writing code to coordinating agents that write code, focusing their own expertise on architecture, system design, and strategic decisions."

Data:
- Developers gebruiken AI in ~60% van hun werk
- Maar kunnen slechts 0-20% volledig delegeren
- De gap = het coördinatieprobleem dat platforms zoals Open-Agents oplossen

### 3.2 Real-World Impact

| Bedrijf | Resultaat |
|---------|-----------|
| Rakuten | Claude Code voltooide vLLM implementatie (12.5M regels codebase) in 7 uur, 99.9% nauwkeurigheid |
| TELUS | 13.000+ custom AI oplossingen, 30% sneller shippen, 500.000+ uur bespaard |
| Zapier | 89% AI adoptie, 800+ interne agents |

### 3.3 De Vier Strategische Prioriteiten (Anthropic)

1. **Multi-agent coördinatie** — niet meer solo agents maar teams
2. **Human-agent oversight scaling** — AI-geautomatiseerde review
3. **Agentic coding buiten engineering** — ook voor product, design, data teams
4. **Security architecture from inception** — niet achteraf

### 3.4 Het Agent Ecosysteem (maart 2026)

| Tool | Filosofie | Sterkte |
|------|-----------|---------|
| **Claude Code** | Feature-rich, opinionated | State-of-the-art reasoning (Opus 4.6), enterprise-ready |
| **OpenClaw** (145K stars) | Local-first, always-on | Multi-platform (Telegram, WhatsApp, Discord), Pi-powered |
| **OpenAI Codex** | Autonomous execution | Grote-context reasoning, repo-brede changes |
| **Pi** (18.2K stars) | Minimal core, max extensibility | 4 tools, 200 tokens prompt, engine achter OpenClaw |
| **Cursor/Windsurf** | IDE-geïntegreerd | Inline completions + agent mode |
| **Amp (Sourcegraph)** | Code intelligence | Codebase-brede zoek + agent |

---

## 4. Agent Architectuur Patronen 2026

### 4.1 De Drie Dominante Patronen

**ReAct (Observe → Reason → Act → Repeat)**
- Best voor: iteratieve taken, onvoorspelbare paden
- Trade-off: meer tokens, hogere latency
- Onze equivalent: execution engine met per-stap LLM calls

**Plan-and-Execute**
- Best voor: stabiele taken, decompositie
- Trade-off: minder adaptief bij verandering
- **Kan kosten 90% reduceren** vs frontier models voor alles
- Onze equivalent: assembly engine (classify → match → generate)

**Multi-Agent Orchestration**
- Orchestrator-Worker: centrale coördinator verdeelt werk
- Hierarchical: hoog-niveau agents delegeren subtaken
- Handoff: agents delegeren dynamisch zonder centraal management
- **Presteert 90.2% beter** dan single-agent Claude Opus in interne evaluaties
- Onze equivalent: canvas met flow + pool patronen

### 4.2 Memory Patronen

| Type | Functie | Implementatie |
|------|---------|---------------|
| Short-term | Conversational context | In token window |
| Episodic | Specifieke events met temporele context | Emerging voor long-lived agents |
| Semantic Caching | Vector-based response hergebruik | ~69% reductie in LLM API calls |
| Hybrid Retrieval | Dense vectors + BM25 + metadata | Reciprocal Rank Fusion + cross-encoder |

### 4.3 Production Constraints

- **Failure rates**: Volledig autonome agents hebben <1% end-to-end failure rate nodig. Bij 5% failure rate met 20-acties workflow = frequent falen.
- **Latency**: Voice/chat verwacht lage honderden ms first-token. Enterprise workflows tolereren meer.
- **Cost**: Plan-and-Execute (goedkope models uitvoeren, dure models plannen) reduceert kosten 90%.

---

## 5. Protocollen & Standaarden

### 5.1 MCP (Model Context Protocol) — Anthropic

Wordt kritieke infrastructuur voor tool access. Standaardiseert hoe agents tools aanroepen zonder custom integraties per agent.

### 5.2 A2A (Agent-to-Agent) — Google

Emerging protocol voor inter-agent communicatie. Combineert met MCP voor "robust, scalable, extensible multi-agent systems."

### 5.3 Agent Skills Standard

Zie sectie 12 in [pi-dev-deep-dive.md](pi-dev-deep-dive.md). 26+ platforms, 79.5K stars.

---

## 6. Gartner Voorspelling

> "40% of enterprise applications will embed task-specific AI agents by end of 2026 — up from less than 5% two years ago."

De agentic AI-markt gaat door zijn "microservices revolutie": single all-purpose agents worden vervangen door georchestreerde teams van gespecialiseerde agents. Dit is EXACT wat Open-Agents bouwt.

---

## 7. Concrete Implicaties voor Open-Agents

### Wat we goed doen
- Canvas-based orchestratie = visuele multi-agent coördinatie
- Flow + Pool patronen = ReAct + Plan-and-Execute
- Runtime adapters = multi-provider support
- Knowledge snippets = domain expertise
- Assembly engine = Plan-and-Execute met goedkope classificatie + dure generatie

### Wat we moeten toevoegen/verbeteren

| Prioriteit | Wat | Waarom | Sprint |
|-----------|-----|--------|--------|
| HOOG | KV-cache optimalisatie | 10x kostenreductie | 10 (Refactor) |
| HOOG | Progressive disclosure voor knowledge | Context rot voorkomen | 6c of 10 |
| HOOG | Real-time cost tracking | Transparantie, Pi doet dit al | 6c |
| MEDIUM | Todo/scratchpad per executie-run | Attention manipulation, drift preventie | 6c |
| MEDIUM | Sub-agent architectuur | Schone context per subtaak | 10 |
| MEDIUM | Error retention in context | Betere recovery | 10 |
| LAAG | Semantic caching | 69% minder API calls | Fase 6 (Scale) |
| LAAG | A2A protocol support | Inter-agent communicatie standaard | Toekomst |

---

## Bronnen

### Context Engineering
- [Manus — Context Engineering for AI Agents](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Anthropic — Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Martin Fowler — Context Engineering for Coding Agents](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html)
- [LangChain — Context Engineering for Agents](https://blog.langchain.com/context-engineering-for-agents/)
- [InfoWorld — What is Context Engineering?](https://www.infoworld.com/article/4127462/what-is-context-engineering-and-why-its-the-new-ai-architecture.html)

### Agentic Coding Trends
- [Anthropic — Eight Trends Defining How Software Gets Built](https://claude.com/blog/eight-trends-defining-how-software-gets-built-in-2026)
- [DEV — The Ultimate Guide to AI Agents in 2026](https://dev.to/tech_croc_f32fbb6ea8ed4/the-ultimate-guide-to-ai-agents-in-2026-openclaw-vs-claude-cowork-vs-claude-code-395h)
- [DataCamp — OpenClaw vs Claude Code](https://www.datacamp.com/blog/openclaw-vs-claude-code)
- [Jock.pl — Claude Code vs Codex Real Usage](https://thoughts.jock.pl/p/claude-code-vs-codex-real-comparison-2026)

### Agent Architectuur
- [Redis — AI Agent Architecture 2026](https://redis.io/blog/ai-agent-architecture/)
- [Microsoft — AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [Google — Context-Aware Multi-Agent Framework](https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/)
- [IBM — MCP Architecture Patterns for Multi-Agent Systems](https://developer.ibm.com/articles/mcp-architecture-patterns-ai-systems/)
- [Machine Learning Mastery — 7 Agentic AI Trends 2026](https://machinelearningmastery.com/7-agentic-ai-trends-to-watch-in-2026/)

### MiniMax
- [MiniMax — M2.5 Announcement](https://www.minimax.io/news/minimax-m25)
- [VentureBeat — MiniMax M2 King of Open Source LLMs](https://venturebeat.com/ai/minimax-m2-is-the-new-king-of-open-source-llms-especially-for-agentic-tool)
- [MiniMax-M1 GitHub](https://github.com/MiniMax-AI/MiniMax-M1)

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
