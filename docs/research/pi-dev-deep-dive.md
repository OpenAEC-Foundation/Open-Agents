# Pi.dev Deep Dive — Lessen voor Open-Agents

> **Datum**: 2026-03-04
> **Onderzoeker**: Freek Heijting + Claude
> **Context**: Pi.dev (18.2K stars) is de engine achter OpenClaw. Wat kunnen we leren?
> **Zie ook**: D-002 (Pi als complementaire runtime), D-009 (Agent SDK voor PoC)

---

## 1. Pi's Architectuur in 4 Lagen

Pi is een TypeScript monorepo met een strikte gelaagde architectuur:

```
Laag 4: pi-coding-agent    — CLI agent met tools, sessions, skills, extensions
Laag 3: pi-tui             — Terminal UI library (differential rendering, markdown)
Laag 2: pi-agent-core      — Agent loop (tool executie + feedback cycle)
Laag 1: pi-ai              — Unified LLM API (15+ providers, genormaliseerde streaming)
```

Elke laag hangt ALLEEN af van de laag eronder. Dit is het tegenovergestelde van monolithische agents zoals Claude Code.

**Relevantie voor Open-Agents**: Onze architectuur (shared → backend → frontend) volgt al een vergelijkbaar patroon. Pi's `pi-ai` laag (provider-agnostisch) is vergelijkbaar met onze runtime adapters (D-015).

---

## 2. De Kernfilosofie: Minimal Core, Maximum Extension

| Aspect | Claude Code | Pi.dev |
|--------|------------|--------|
| Systeemprompt | ~10.000 tokens | ~200 tokens |
| Built-in tools | 10+ | 4 (read, write, edit, bash) |
| Security | Deny-first + Haiku screening | Niets built-in — bouw zelf |
| Providers | Anthropic only | 15+ providers |
| Extensibility | 14 hooks/events | 20+ lifecycle events + volledige TypeScript API |
| Context controle | Verandert per release | Gebruiker controleert ALLES |
| Kosten zichtbaarheid | Beperkt | Real-time in footer (exact $/tokens) |
| Licentie | Proprietary | MIT |

**De les**: Pi bewijst dat je met 4 tools en 200 tokens systeemprompt een complete coding agent kunt bouwen. De kracht zit niet in features, maar in **extensibility**.

---

## 3. Extension Systeem — De Echte Kracht

### 3.1 Skills (Cross-Agent Standaard)

Skills volgen de **Agent Skills standard** — compatibel met Claude Code, Codex, Amp, Droid:

```
skill-naam/
├── SKILL.md          # YAML frontmatter + instructies
├── scripts/          # Helper scripts
├── references/       # Gedetailleerde docs (on-demand laden)
└── assets/           # Templates, configs
```

Alleen beschrijvingen blijven in context (token-efficiënt). Volledige instructies laden on-demand.

**Cruciaal inzicht van OpenClaw**: "Skills are not TypeScript modules. They are folders containing a SKILL.md file." Niet-programmeurs EN de agent zelf kunnen skills maken. Hot-reloadable (250ms debounce). De agent kan zijn eigen skills aanpassen.

### 3.2 Extensions (TypeScript Lifecycle Hooks)

```typescript
export default function (pi: ExtensionAPI) {
  // Tools registreren (beschikbaar voor LLM)
  pi.registerTool({ name, description, parameters, execute });

  // Slash commands
  pi.registerCommand(name, { description, handler });

  // 20+ lifecycle events
  pi.on("context", handler);       // Context herschrijven VOOR LLM
  pi.on("tool_call", handler);     // Tool calls intercepten/gaten
  pi.on("session_start", handler);
  pi.on("input", handler);
  pi.on("agent_end", handler);

  // Custom LLM providers
  pi.registerProvider({ ... });
}
```

**Geen build step** — extensions transpileren at runtime via `jiti`.

### 3.3 Packages (Bundels)

```json
{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

Installeer via `pi install npm:@user/package` of `git:github.com/user/repo`.

---

## 4. Streaming Normalisatie

Pi normaliseert ALLE providers naar één event-set:

```
start → text_start → text_delta → text_end →
thinking_start → thinking_delta → thinking_end →
toolcall_start → toolcall_delta → toolcall_end →
done | error
```

**Relevantie**: Onze SSE streaming in `execution-engine.ts` doet iets vergelijkbaars maar per-runtime-adapter. Pi's aanpak is eleganter — normaliseer op de LLM-laag, niet op de executie-laag.

---

## 5. Session Architecture — Trees, Geen Lijnen

Pi slaat sessies op als **JSONL boomstructuren**:

```
~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl
```

Elke entry heeft `id` + `parentId` → vormt een boom.

- `/tree` — navigeer en switch branches
- `/fork` — maak nieuwe sessie vanaf huidig punt
- Automatische branching bewaart alle paden
- JSONL is append-only: bij crash verlies je maximaal 1 regel

**Auto-compaction**: Triggert wanneer context de model-limiet nadert. Volledige history blijft in JSONL; alleen in-memory context wordt samengevat.

**Les voor Open-Agents**: Onze canvas is inherent een boomstructuur (nodes + edges). Maar onze execution history is lineair. Pi's tree-model kan ons inspireren voor branching execution paths.

---

## 6. Tool Factory Pattern — Workspace Isolatie

Pi gebruikt factory functions voor tool-scoping:

```typescript
const customRead = createReadTool("/workspace");
const sandboxedBash = createBashTool("/workspace", {
  operations: { exec: runInDockerContainer }
});
```

Dit maakt per-user isolatie mogelijk zonder de core te wijzigen.

**Relevantie**: Onze `AgentRuntime` interface (D-015) zou dit patroon kunnen adopteren voor multi-tenant deployment (Sprint 10).

---

## 7. OpenClaw Patronen — Production-Grade Agent Orchestratie

### 7.1 Lane Queue Pattern

"Every session gets its own queue, and tasks within a queue execute one at a time."

Session keys zijn gestructureerd (`workspace:channel:userId`) om cross-context lekkage te voorkomen.

> "Race conditions in agent systems are not edge cases — they are the default failure mode when you accept concurrent input without explicit ordering."

Parallelisme is opt-in via extra lanes (cron, subagent).

### 7.2 Channel Abstractie

OpenClaw normaliseert platforms via adapter interfaces:
- Adapters zijn stateless
- Connection state zit in de Gateway
- Platform-specifieke features via metadata bag
- Core agent logic raakt nooit platform-specifieke velden

> "If the WhatsApp connection fails, Telegram keeps running."

### 7.3 Human-Readable State

Geen opaque vector stores. Alles is:
- Markdown notes
- YAML configs
- JSONL logs
- `git diff`-baar en direct bewerkbaar

### 7.4 Heartbeat Pattern (Proactiviteit)

Configureerbare daemon leest een `HEARTBEAT.md` checklist (30 min default) om proactieve agent-acties te triggeren. Essentially een cron job in platte tekst.

---

## 8. Wat Pi Ons Leert — Concrete Lessen

### Les 1: Minimale Core, Maximale Extensibility

Pi bewijst dat 4 tools + 200 tokens systeemprompt genoeg is. Alles extra is een extension.

**Actie voor Open-Agents**: Onze 6-layer stack (CLAUDE.md, skills, rules, MCP, hooks, workspace) is al de goede richting. Maar we moeten zorgen dat elke laag OPTIONEEL is — de core moet werken zonder ze.

### Les 2: Skills als Markdown, Niet als Code

SKILL.md met YAML frontmatter is de standaard. Non-programmeurs kunnen skills maken. De agent kan zijn eigen skills aanpassen.

**Actie**: Onze knowledge snippets (35 patterns, 7 principes, 13 blocks) volgen al een vergelijkbaar markdown-patroon. Overweeg om deze te herstructureren naar het Agent Skills formaat voor cross-agent compatibiliteit.

### Les 3: Provider-Agnostische Streaming

Normaliseer op de LLM-laag, niet op de executie-laag. Eén event-set voor alle providers.

**Actie**: Refactor onze runtime adapters (D-015) om een gemeenschappelijk streaming-event formaat te gebruiken, vergelijkbaar met Pi's `streamSimple`.

### Les 4: Context = Gebruiker's Domein

Pi verandert NOOIT het context-formaat tussen releases. De gebruiker controleert alles via AGENTS.md, SYSTEM.md, APPEND_SYSTEM.md.

**Actie**: Dit versterkt ons USER_INSTRUCTIONS.md patroon (D-038). Gebruikers moeten hun agent-context volledig kunnen aanpassen zonder dat platform-updates het breken.

### Les 5: Session Trees > Lineaire History

Branching sessies bewaren alle exploratiepaden. Compaction is slim: volledige history in JSONL, alleen working context wordt samengevat.

**Actie**: Overweeg tree-based execution history voor Sprint 10 refactor. Canvas nodes als "branch points" in executie.

### Les 6: Tool Factories voor Isolatie

`createReadTool("/workspace")` — per-user workspace scoping via factory pattern.

**Actie**: Essentieel voor multi-tenant (Fase 6: Scale). Elke gebruiker krijgt zijn eigen tool-scope.

### Les 7: Real-Time Cost Tracking

Pi toont in de footer: directory, sessie, tokens, kosten ($), context %, huidig model.

**Actie**: Toevoegen aan onze `CostEstimatePanel` (Sprint 6b). Niet alleen vooraf schatten, maar ook real-time kosten tonen tijdens executie.

### Les 8: Seriële Executie als Default

OpenClaw's lane queue pattern: één taak per sessie tegelijk. Parallelisme is opt-in.

**Actie**: Dit bevestigt onze Sprint 3 (Flow Pattern) aanpak. Sprint 4 (Pool Pattern) is de opt-in parallelle variant.

---

## 9. Vergelijking: Pi's Lagen vs Open-Agents Lagen

| Pi Laag | Open-Agents Equivalent | Status |
|---------|----------------------|--------|
| pi-ai (LLM API) | Runtime adapters (D-015) | Gebouwd, 4 adapters |
| pi-agent-core (agent loop) | execution-engine.ts | Gebouwd, 871 regels |
| pi-coding-agent (tools + skills + extensions) | Backend + Knowledge + Assembly | Gebouwd |
| pi-tui (terminal UI) | React Flow canvas UI | Gebouwd |
| OpenClaw gateway | Onze backend API (Fastify) | Gebouwd |
| OpenClaw skills | Knowledge snippets + presets | Gebouwd (56 snippets) |
| OpenClaw channels | VS Code ext + Frappe app + web | Gebouwd (3 deployment targets) |

**Conclusie**: We bouwen in essentie hetzelfde als Pi + OpenClaw, maar met een visuele canvas in plaats van een terminal. De architectuurpatronen zijn direct toepasbaar.

---

## 10. Wat We NIET Moeten Overnemen

1. **Geen TUI** — Onze kracht is visueel, niet terminal-based
2. **Geen "deny nothing" security** — Onze safety rules (Sprint 5) zijn een bewuste keuze
3. **Geen self-modifying agents** — Pi laat agents hun eigen skills aanpassen; wij houden dat (voorlopig) menselijk
4. **Geen JSONL sessies** — Onze in-memory + SSE aanpak past beter bij real-time canvas feedback

---

## Bronnen

- [Pi.dev GitHub (18.2K stars)](https://github.com/badlogic/pi-mono)
- [Mario Zechner — What I learned building a minimal coding agent](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
- [Armin Ronacher — Pi: The Minimal Agent Within OpenClaw](https://lucumr.pocoo.org/2026/1/31/pi/)
- [Nader Dabit — How to Build a Custom Agent Framework with Pi](https://nader.substack.com/p/how-to-build-a-custom-agent-framework)
- [Agentailor — Lessons from OpenClaw's Architecture](https://blog.agentailor.com/posts/openclaw-architecture-lessons-for-agent-builders)
- [DigitalOcean — What are OpenClaw Skills?](https://www.digitalocean.com/resources/articles/what-are-openclaw-skills)
- [Ry Walker — Pi Coding Agent Research](https://rywalker.com/research/pi)

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
