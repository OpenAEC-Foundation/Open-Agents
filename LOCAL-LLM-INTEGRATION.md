# Feature: Open-Source LLM Integratie

> **Instructies voor Claude Code instance in Open-Agents workspace**
> **Workspace**: `C:\Users\Freek Heijting\Documents\GitHub\Open-Agents`
> **Doel**: Lokale en open-source LLM's integreren als volwaardig alternatief naast Claude API
> **Waarom**: Token-efficiëntie, snelheid, privacy, kosten, en schaalbaarheid

---

## Context

Open-Agents heeft een **runtime adapter pattern** (D-015) waarmee elke LLM provider als plugin geregistreerd kan worden. Er zijn al 5 adapters:

| Runtime | Provider | Status |
|---------|----------|--------|
| `ClaudeSDKRuntime` | `anthropic` | Volledig (tool use, streaming) |
| `OpenAIRuntime` | `openai` | Text-only (PoC) |
| `MistralRuntime` | `mistral` | Text-only (PoC) |
| `OllamaRuntime` | `ollama` | Text-only (PoC) |
| `ClaudeCLIRuntime` | `cli` | Volledig (via VS Code bridge) |

**Het probleem**: De non-Claude runtimes zijn text-only. Geen tool calling, geen streaming, geen model routing, geen concurrency. Open-source modellen zijn inmiddels sterk genoeg voor veel agent-taken — we benutten dat niet.

**De oplossing**: Upgrade de lokale LLM integratie tot een volwaardig systeem met:
1. Meerdere inference backends (niet alleen Ollama)
2. Tool/function calling support
3. Intelligent model routing
4. Concurrent requests
5. Ondersteuning voor de beste open-source modellen van 2026

---

## Wat je moet weten over het landschap (maart 2026)

### Topmodellen die lokaal draaien

| Model | Actieve Params | Licentie | Sterk in | VRAM (Q4) |
|-------|---------------|----------|----------|-----------|
| **Qwen3-30B-A3B** | 3B (MoE) | Apache 2.0 | Code, redeneren. AIME 87.8% | ~7.6GB |
| **Qwen3-Coder-Next** | 3B (MoE, 80B) | Apache 2.0 | Coding agents, lokaal draaien | ~7-8GB |
| **DeepSeek-R1-Distill-Qwen3-8B** | 8B | MIT | Reasoning, matcht 235B op taken | ~5-6GB |
| **GLM-4-9B-0414** | 9B | MIT | Function calling + coding | ~6-7GB |
| **SmolLM3-3B** | 3B | Apache 2.0 | Snelle worker, dual-mode think | ~2-4GB |
| **Phi-4-mini** | 3.8B | MIT | Reasoning van 7-9B niveau | ~4-6GB |
| **Qwen3-0.6B** | 0.6B | Apache 2.0 | Ultra-snel, classificatie | ~1-2GB |

### Topmodellen via API (te groot voor lokaal, wel open-source)

| Model | Actieve Params | Licentie | Sterk in |
|-------|---------------|----------|----------|
| **MiniMax M2.5** | 10B (230B MoE) | Modified MIT | SWE-bench 80.2%, BFCL 76.8% |
| **GLM-4.7** | ~32B (MoE) | MIT | SWE-bench 73.8%, agentic workflows |
| **DeepSeek V3.2** | 37B (671B MoE) | MIT | Thinking + tool-use geïntegreerd |
| **Kimi K2.5** | 32B (~1T MoE) | Open weights | 100 sub-agents, 1500 tool calls |
| **GPT-OSS-120B** | 5.1B (117B MoE) | Apache 2.0 | Near o4-mini op single 80GB GPU |

### Inference Runtimes (niet alleen Ollama!)

| Runtime | Throughput | Tool Calling | Windows | Wanneer |
|---------|-----------|--------------|---------|---------|
| **Ollama** | Goed (single user) | Beperkt | Ja | Development, snel opstarten |
| **vLLM** | 19x Ollama bij concurrency | Volledig + parallel | WSL2 | Production, multi-agent |
| **LocalAI** | Goed | Volledig + MCP | Ja | Universele drop-in OpenAI replacement |
| **LiteLLM** | Gateway (geen inference) | Ja | Ja | Router naar 100+ providers |

### Routing/Gateway

**LiteLLM** is de standaard voor multi-provider routing. Eén OpenAI-compatible endpoint die routeert naar Ollama, vLLM, cloud APIs, etc. Open-source, MIT licentie.

---

## Architectuur

### Huidige staat
```
Agent Node (model: "ollama/llama3")
  → execution-engine.ts: getRuntimeForModel()
  → OllamaRuntime.execute()  ← text-only, single endpoint
  → fetch("http://localhost:11434/api/generate")
```

### Gewenste staat
```
Agent Node (model: "local/qwen3-coder:30b-a3b")
  → execution-engine.ts: getRuntimeForModel()
  → LocalLLMRuntime.execute()  ← met tool calling, streaming, routing
  → LiteLLM Gateway (localhost:4000)
    → Ollama (localhost:11434) voor kleine modellen
    → vLLM (localhost:8000) voor grote modellen
    → of direct naar cloud API voor modellen die niet lokaal passen
```

---

## Implementatieplan

### Fase 1: Upgrade OllamaRuntime met OpenAI-compatible API

De huidige `OllamaRuntime` gebruikt Ollama's `/api/generate` endpoint. Ollama ondersteunt ook het **OpenAI-compatible** `/v1/chat/completions` endpoint inclusief tool calling.

**Bestanden**:
- `packages/backend/src/runtimes/ollama.ts` — herschrijf naar OpenAI-compatible API
- `packages/shared/src/types.ts` — Ollama model types uitbreiden

**Wat te doen**:
1. Vervang `/api/generate` door `/v1/chat/completions` endpoint
2. Voeg tool/function calling support toe (OpenAI function calling format)
3. Voeg streaming support toe (SSE parsing)
4. Maak `baseUrl` configureerbaar per model (niet alleen env var)
5. Voeg health check toe: `GET {baseUrl}/api/tags` → beschikbare modellen

**Voorbeeld implementatie**:
```typescript
export class OllamaRuntime implements AgentRuntime {
  readonly name = "Ollama (local)";
  readonly provider = "ollama";

  async *execute(config: RuntimeExecutionConfig): AsyncIterable<AgentEvent> {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    const model = config.agent.model.split("/")[1];

    // Use OpenAI-compatible endpoint for tool calling support
    const messages = this.buildMessages(config);
    const tools = config.agent.tools?.length
      ? this.buildToolDefinitions(config.agent.tools)
      : undefined;

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        tools,
        stream: true,
        max_tokens: config.agent.maxTokens ?? 4096,
      }),
      signal: config.abortSignal,
    });

    // Parse SSE stream and yield events
    // Handle tool_calls in response
  }
}
```

### Fase 2: Nieuwe `LocalLLMRuntime` — universele lokale adapter

Een nieuwe runtime die werkt met **elke OpenAI-compatible server** (Ollama, vLLM, LocalAI, LM Studio, TabbyAPI, etc.).

**Nieuw bestand**: `packages/backend/src/runtimes/local-llm.ts`

**Waarom apart van Ollama?**
- Ollama-specifieke features (model pulling, Modelfile) blijven in OllamaRuntime
- LocalLLMRuntime is generiek: werkt met elk OpenAI-compatible endpoint
- Maakt het mogelijk om vLLM, LocalAI, of een remote server te gebruiken

**Nieuwe provider**: `"local"` met model format `"local/{model-name}"`

**Configuratie** (via environment of runtime settings):
```typescript
interface LocalLLMConfig {
  baseUrl: string;           // "http://localhost:8000/v1" (vLLM)
  apiKey?: string;           // Optioneel, sommige servers vereisen het
  defaultModel?: string;     // Fallback model als niet gespecificeerd
  maxConcurrent?: number;    // Concurrent request limiet
  timeout?: number;          // Request timeout in ms
}
```

**Wat te implementeren**:
1. OpenAI chat completions API (streaming + non-streaming)
2. Tool/function calling (OpenAI format)
3. Abort signal support (cancel requests)
4. Connection health check
5. Model discovery (`GET /v1/models`)
6. Concurrent request limiting (semaphore pattern)
7. Error recovery met retry logic

### Fase 3: LiteLLM Gateway integratie

**Nieuw bestand**: `packages/backend/src/runtimes/litellm.ts`

LiteLLM is een **router** die meerdere backends samenbrengt onder één endpoint. Het kan:
- Routeren naar Ollama, vLLM, OpenAI, Anthropic, Mistral, 100+ providers
- Load balancing
- Fallback chains (als model A faalt, probeer model B)
- Cost tracking
- Rate limiting

**Nieuwe provider**: `"litellm"` met model format `"litellm/{provider}/{model}"`

Voorbeeld: `"litellm/ollama/qwen3:30b-a3b"` → LiteLLM routeert naar Ollama

**Configuratie**:
```bash
# .env
LITELLM_BASE_URL=http://localhost:4000
LITELLM_API_KEY=sk-... # Optioneel
```

**Minimale implementatie**: Identiek aan LocalLLMRuntime maar met LiteLLM-specifieke features:
- Model aliasing (kort model ID → volledige provider/model)
- Fallback chains configuratie
- Budget/cost tracking endpoints

### Fase 4: Model Routing in Execution Engine

Het execution engine moet slimmer worden over welk model voor welke taak:

**Bestand**: `packages/backend/src/execution-engine.ts`

**Concept: ModelRouter**

```typescript
interface ModelRoute {
  pattern: string;          // Glob/regex op task type
  preferredModel: ModelId;  // Welk model bij voorkeur
  fallbackModel?: ModelId;  // Fallback als preferred niet beschikbaar
  reason: string;           // Waarom deze route
}

const defaultRoutes: ModelRoute[] = [
  {
    pattern: "code-review",
    preferredModel: "local/qwen3-coder:30b-a3b",
    fallbackModel: "anthropic/claude-haiku-4-5",
    reason: "Lokaal model voor code review is snel en goedkoop",
  },
  {
    pattern: "classification",
    preferredModel: "local/qwen3:0.6b",
    fallbackModel: "ollama/phi3:mini",
    reason: "Ultra-klein model volstaat voor classificatie",
  },
  {
    pattern: "complex-reasoning",
    preferredModel: "anthropic/claude-sonnet-4-6",
    reason: "Complexe taken vereisen sterkste model",
  },
];
```

Dit is **optioneel** en moet niet de bestaande per-node model selectie vervangen — het is een suggestie-systeem dat de frontend kan gebruiken.

### Fase 5: Frontend — Model Discovery & Status

**Bestanden**:
- `packages/frontend/src/services/modelService.ts` — NIEUW
- `packages/shared/src/types.ts` — model metadata types

**Wat te bouwen**:
1. **Model Discovery API**: `GET /api/models/available` → lijst van beschikbare modellen over alle runtimes
2. **Model Status**: Welke modellen zijn geladen, VRAM gebruik, snelheid
3. **Frontend model picker** uitbreiden met lokale modellen, tags (code, reasoning, fast, etc.)

### Fase 6: Concurrent Agent Execution met Lokale Modellen

De Dispatcher node kan al agents parallel uitvoeren. Maar met lokale modellen moet je opletten:
- GPU kan maar 1-2 modellen tegelijk laden
- CPU modellen zijn trager maar parallelliseerbaar
- Concurrency limiet per runtime nodig

**Bestand**: `packages/backend/src/execution-engine.ts`

**Concept: ConcurrencyManager**

```typescript
class ConcurrencyManager {
  private semaphores = new Map<string, number>(); // provider → active count
  private limits = new Map<string, number>();     // provider → max concurrent

  constructor() {
    this.limits.set("ollama", 2);    // Ollama: max 2 concurrent
    this.limits.set("local", 4);     // vLLM: max 4 concurrent
    this.limits.set("anthropic", 10); // API: higher limit
  }

  async acquire(provider: string): Promise<void> { /* ... */ }
  release(provider: string): void { /* ... */ }
}
```

---

## Bestanden om te wijzigen/maken

### Wijzigen (bestaand)

| Bestand | Wat wijzigen |
|---------|-------------|
| `packages/shared/src/types.ts` | Nieuwe providers: `"local"`, `"litellm"`. Nieuwe model types. Model metadata met tags. |
| `packages/backend/src/runtimes/ollama.ts` | Upgrade naar OpenAI-compatible API met tool calling |
| `packages/backend/src/server.ts` | Registreer nieuwe runtimes |
| `packages/backend/src/key-store.ts` | Keys voor LiteLLM, local endpoints |
| `packages/backend/src/execution-engine.ts` | ConcurrencyManager, model routing |
| `.env.example` | Nieuwe environment variables |

### Nieuw maken

| Bestand | Wat |
|---------|-----|
| `packages/backend/src/runtimes/local-llm.ts` | Universele OpenAI-compatible runtime |
| `packages/backend/src/runtimes/litellm.ts` | LiteLLM gateway runtime |
| `packages/backend/src/model-router.ts` | Intelligent model routing |
| `packages/backend/src/concurrency.ts` | Concurrent request management |
| `packages/frontend/src/services/modelService.ts` | Model discovery & status |

---

## Bestaande code om te hergebruiken

De volgende patronen bestaan al en moeten hergebruikt worden:

1. **`AgentRuntime` interface** in `packages/shared/src/runtime.ts` — alle runtimes implementeren dit
2. **`getRuntimeForModel()`** in `packages/backend/src/execution-engine.ts` — provider lookup
3. **`registerRuntime()`** in `packages/backend/src/execution-engine.ts` — runtime registratie
4. **`getApiKey()`** in `packages/backend/src/key-store.ts` — key management
5. **`buildMessages()` pattern** in bestaande runtimes — message formatting
6. **SSE event yielding** in `ClaudeSDKRuntime` — streaming pattern
7. **Health check pattern** in `ClaudeCLIRuntime.isAvailable()` — runtime availability

---

## Implementatievolgorde

```
Fase 1: Upgrade OllamaRuntime (1-2 uur)
  └── Tool calling + streaming via /v1/chat/completions
       │
Fase 2: LocalLLMRuntime (2-3 uur)
  └── Universele OpenAI-compatible adapter
       │
Fase 3: LiteLLM Gateway (1-2 uur)
  └── Multi-provider routing
       │
Fase 4: Model Routing (2-3 uur)
  └── Slimme model selectie in execution engine
       │
Fase 5: Frontend Model Discovery (2-3 uur)
  └── UI voor model status en selectie
       │
Fase 6: Concurrency Management (1-2 uur)
  └── Rate limiting per provider
```

**Begin met Fase 1** — het is de kleinste wijziging met de grootste impact. Daarna Fase 2 voor brede compatibiliteit.

---

## Environment Setup

```bash
# .env (voeg toe aan bestaande)

# Ollama (al ondersteund)
OLLAMA_BASE_URL=http://localhost:11434

# vLLM (nieuw)
VLLM_BASE_URL=http://localhost:8000/v1

# LocalAI (nieuw)
LOCALAI_BASE_URL=http://localhost:8080/v1

# LiteLLM Gateway (nieuw)
LITELLM_BASE_URL=http://localhost:4000
LITELLM_API_KEY=

# Concurrency limieten (nieuw)
LOCAL_LLM_MAX_CONCURRENT=4
OLLAMA_MAX_CONCURRENT=2
```

---

## Verificatie

Na elke fase:

1. **Fase 1**: `pnpm typecheck` + test met Ollama draaiend: agent met `ollama/qwen3:8b` moet tool calls kunnen maken
2. **Fase 2**: Agent met `local/qwen3:30b-a3b` via vLLM endpoint werkend
3. **Fase 3**: Agent met `litellm/ollama/qwen3:8b` via LiteLLM gateway werkend
4. **Fase 4**: Dispatcher kiest automatisch lokaal model voor simpele taken
5. **Fase 5**: Frontend toont beschikbare lokale modellen met status
6. **Fase 6**: 4 agents parallel op lokaal model zonder crashes

**E2E test**:
```
Canvas: Dispatcher → 3 Agent nodes (elk local/qwen3:8b) → Aggregator
Execute → alle 3 draaien parallel op lokaal model → aggregator combineert output
```

---

## Architectuurbeslissingen om te documenteren

Voeg toe aan `DECISIONS.md`:

- **D-0XX: OpenAI-compatible API als standaard voor lokale runtimes** — Alle lokale runtimes (Ollama, vLLM, LocalAI) gebruiken het OpenAI chat completions format. Dit maximaliseert compatibiliteit en maakt switching tussen backends triviaal.
- **D-0XX: LiteLLM als gateway, niet als vervanging** — LiteLLM is een optionele gateway layer. Directe connecties naar Ollama/vLLM blijven mogelijk. Geen vendor lock-in.
- **D-0XX: Concurrency management per provider** — Lokale modellen hebben hardware limieten. Semaphore-based rate limiting voorkomt OOM crashes.
- **D-0XX: Model routing is suggestief, niet dwingend** — De router suggereert modellen, maar de gebruiker behoudt volledige controle via de canvas node configuratie.

---

## MASTERPLAN.md Sprint

Voeg toe:

```markdown
## Sprint XX: Open-Source LLM Integratie

**Doel**: Lokale en open-source LLM's als volwaardig alternatief naast Claude API.
Token-efficiënt, snel, privacy-friendly. Meerdere inference backends.

**Prompt**:
Lees LOCAL-LLM-INTEGRATION.md. Implementeer Fase 1-6 in volgorde.
Begin met de OllamaRuntime upgrade (Fase 1).
Test elke fase voordat je doorgaat naar de volgende.
Update ROADMAP.md en DECISIONS.md na elke fase.
```