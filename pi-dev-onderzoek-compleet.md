# Pi Coding Agent — Compleet Onderzoeksrapport

**Onderzoek door:** Freek Heijting (Impertio Studio B.V.)
**Datum:** 26 februari 2026
**Doel:** Praktisch onderzoek naar Pi.dev als coding agent voor ERPNext/Frappe integratie

---

## 1. Wat is Pi?

Pi is een minimale, open-source terminal coding agent gebouwd door Mario Zechner (creator van libGDX). Het project heeft ~8.9k GitHub sterren, 151+ releases (februari 2026), en is MIT-gelicenseerd.

**Kernfilosofie:** Pi levert slechts 4 ingebouwde tools (read, write, edit, bash) en een ~200-token systeemprompt. Alles anders bouw je zelf via TypeScript extensions, skills en packages. Dit is het tegenovergestelde van Claude Code, dat een feature-rijk product is met ingebouwde veiligheidslagen.

**Links:**
- Website: https://pi.dev/
- Repository: https://github.com/badlogic/pi-mono
- npm: https://www.npmjs.com/package/@mariozechner/pi-coding-agent
- Blog post (rationale): https://mariozechner.at/posts/2025-11-30-pi-coding-agent/
- Discord: https://discord.com/invite/3cU7Bz4UPx

---

## 2. Installatie & Setup

### 2.1 Installatie

```bash
# Via npm (aanbevolen)
npm install -g @mariozechner/pi-coding-agent

# Of standalone binaries van GitHub Releases
# macOS: xattr -c ./pi (Gatekeeper quarantine verwijderen)

# Of bouwen vanuit source (vereist Bun 1.0+)
git clone https://github.com/badlogic/pi-mono
cd pi-mono && npm install && npm run build
```

Windows vereist bash: Git Bash (`C:\Program Files\Git\bin\bash.exe`), Cygwin, MSYS2, WSL, of custom pad in settings.json.

### 2.2 Anthropic/Claude Configureren

Maak `~/.pi/agent/auth.json`:

```json
{
  "anthropic": {
    "type": "api_key",
    "key": "sk-ant-api03-jouw-key-hier"
  }
}
```

De `key` veld ondersteunt drie formaten:
1. **Letterlijke API key string**
2. **Shell commando** met `!` prefix: `"!security find-generic-password -ws 'anthropic'"` (macOS) of `"!op read 'op://vault/item/credential'"` (1Password)
3. **Environment variable naam**

Alternatief: zet `ANTHROPIC_API_KEY` in je environment — auth.json heeft voorrang.

Voor Claude Pro/Max abonnement gebruikers: `/login` in interactive mode voor OAuth.

### 2.3 Eerste keer starten

```bash
pi                              # Nieuwe interactieve sessie
pi "Lijst alle .ts bestanden"   # Start met initiële prompt
pi --model claude-sonnet-4-20250514 "Leg deze codebase uit"
pi --model sonnet:high "Los dit complexe probleem op"  # model:thinking_level shorthand
```

### 2.4 Directory structuur

| Pad | Doel |
|-----|------|
| `~/.pi/agent/settings.json` | Globale instellingen |
| `~/.pi/agent/auth.json` | API keys en OAuth credentials (0600 permissions) |
| `~/.pi/agent/models.json` | Custom providers en modellen |
| `~/.pi/agent/keybindings.json` | Keybinding overrides |
| `~/.pi/agent/AGENTS.md` | Globale project instructies |
| `~/.pi/agent/SYSTEM.md` | Globale systeem prompt override |
| `~/.pi/agent/extensions/` | Globale extensions |
| `~/.pi/agent/prompts/` | Globale prompt templates |
| `~/.pi/agent/skills/` | Globale skills |
| `~/.pi/agent/themes/` | Globale themes |
| `~/.pi/agent/sessions/` | Sessie opslag (per werkdirectory) |
| `.pi/settings.json` | Project-lokale instellingen |
| `.pi/extensions/` | Project-lokale extensions |
| `.pi/SYSTEM.md` | Project-lokale systeem prompt override |
| `.pi/APPEND_SYSTEM.md` | Toevoegen aan systeem prompt zonder te vervangen |
| `.agents/skills/` | Agent Skills standaard directory (project) |
| `~/.agents/skills/` | Agent Skills standaard directory (globaal) |

---

## 3. De Terminal Interface

Pi gebruikt een **scrollback-based TUI** — niet full-screen zoals vim, maar appending aan de terminal scrollback buffer met native scrolling en zoeken. Werkt het best in Ghostty en iTerm2.

**Interface zones:**
1. **Startup header** — keyboard shortcut hints, geladen context bestanden
2. **Messages area** — conversatie: berichten, tool calls, outputs, errors
3. **Editor** — onderaan, hier typ je. **Rand kleur verandert per thinking level**
4. **Footer** — werkdirectory, sessie naam, token/cache gebruik, kosten ($), context window percentage, huidig model

Extensions kunnen custom widgets injecteren boven/onder de editor, status lines toevoegen, overlays renderen.

**Handige tips:**
- `@` typt → fuzzy file search (respecteert .gitignore)
- `Tab` → completeert bestandspaden
- Drag & drop bestanden vanuit file manager naar terminal

---

## 4. Alle Slash Commands

| Commando | Beschrijving |
|----------|-------------|
| `/model` | Open model selector (= `Ctrl+L`) |
| `/settings` | Interactieve settings UI (= `Shift+Tab`) |
| `/tree` | Navigeer volledige sessie boom — spring naar elk punt, switch branches |
| `/fork` | Maak nieuwe sessie vanuit huidige branch |
| `/compact` | Handmatige compactie. Optioneel: `/compact <custom instructies>` |
| `/export` | Exporteer sessie naar standalone HTML |
| `/share` | Upload naar GitHub gist, krijg deelbare URL |
| `/login` | OAuth voor subscription-based providers |
| `/resume` | Browse eerdere sessies. `Ctrl+D` om te verwijderen |
| `/hotkeys` | Toon alle keyboard shortcuts |
| `/help` | Help |
| `/clear` | Display leegmaken |
| `/exit` | Afsluiten |
| `/skill:<naam>` | Forceer een specifieke skill |
| `/<template>` | Prompt template expanderen |

---

## 5. Alle Keybindings

### Kern interactie

| Toets | Actie |
|-------|-------|
| `Enter` | Stuur bericht. **Tijdens streaming**: queues een *steering* bericht (onderbreekt na huidige tool) |
| `Alt+Enter` | Queue een *follow-up* bericht (wacht tot agent klaar is) |
| `Escape` | Huidige operatie afbreken |
| `Dubbel Escape` (lege editor) | Configureerbaar: `tree` (standaard), `fork`, of `none` |
| `Ctrl+L` | Model selector openen |
| `Ctrl+P` | Wissel naar volgend model in je lijst |
| `Ctrl+Shift+P` | Wissel naar vorig model |
| `Shift+Tab` | Settings UI openen |
| `Ctrl+O` | Toggle tool output expansie |

### Editor

| Toets | Actie |
|-------|-------|
| `Ctrl+K` | Kill line (Emacs kill ring) |
| `Ctrl+Y` | Yank (plakken vanuit kill ring) |
| `Alt+Y` | Yank-pop (cycle door kill ring) |
| `Ctrl+Z` | Undo |
| `@` | Fuzzy file search |
| `Tab` | Bestandspad completie |

### BELANGRIJK: Steering vs Follow-up

Het verschil tussen `Enter` en `Alt+Enter` tijdens streaming is cruciaal:
- **Enter** = steering: onderbreekt de agent na de huidige tool call — voor koerscorrectie
- **Alt+Enter** = follow-up: wacht tot agent alles afrondt — voor vervolgvragen

In Claude Code wacht je altijd tot de agent klaar is. In Pi kun je actief sturen.

---

## 6. Vier Operationele Modi

### 6.1 Interactive (standaard)

Volledige TUI ervaring. Vereist een TTY.

```bash
pi                                    # Nieuwe sessie
pi "Refactor de auth module"          # Met initiële prompt
pi -c                                 # Hervat meest recente sessie
pi -r                                 # Browse en selecteer eerdere sessie
pi --session <pad>                    # Hervat specifieke sessie
```

### 6.2 Print mode (scripting)

Niet-interactief, single-shot. Perfect voor CI/CD en shell scripts.

```bash
pi -p "Vat deze codebase samen"              # Tekst output
pi --mode json "Leg deze functie uit"        # JSON event stream
pi --mode jsonl "Lijst alle TODO comments"   # JSONL output
pi --tools read,grep,find,ls -p "Review"     # Read-only mode
```

### 6.3 RPC mode (IDE integratie)

JSON protocol over stdin/stdout. Voor editors, IDEs, of non-Node.js applicaties.

```bash
pi --mode rpc
```

Beschikbare RPC commando's: `prompt`, `steer`, `follow_up`, `abort`, `get_state`, `get_stats`, `get_messages`, `get_slash_commands`, `select_model`, `list_models`, `bash`, `extension_ui_response`.

### 6.4 SDK mode (embedding)

Programmatische embedding in Node.js/TypeScript applicaties. **Dit is de modus voor ERPNext integratie.**

```typescript
import { AuthStorage, createAgentSession, ModelRegistry, SessionManager } from "@mariozechner/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = new ModelRegistry(authStorage);
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry,
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("Welke bestanden staan in de huidige directory?");
```

---

## 7. Sessies & Boom-structuur

Pi sessies worden opgeslagen als **JSONL bestanden met een boomstructuur** — elke entry heeft `id` en `parentId` velden. Een `leafId` pointer trackt de huidige positie. Bij branching via `/tree` verplaatst de `leafId` naar een andere node.

**Alle branches blijven bewaard in één bestand** — niets gaat verloren.

Sessie bestanden: `~/.pi/agent/sessions/--<pad>--/<timestamp>_<uuid>.jsonl`

### Praktische sessie workflows

```bash
pi -c                    # Hervat meest recente sessie
pi -r                    # Browse eerdere sessies interactief
pi --no-session          # Ephemeral mode — niets opslaan
```

### Compactie

Lange sessies vullen het context window. **Compactie vat oudere berichten samen** terwijl recente intact blijven.

- Handmatig: `/compact` of `/compact <custom instructies>`
- **Automatisch: standaard ingeschakeld** — triggert bij overflow of proactief
- Instellingen: `compaction.reserveTokens` (standaard 16384), `compaction.keepRecentTokens` (standaard 20000)
- De volledige geschiedenis blijft in het JSONL bestand — gebruik `/tree` om terug te gaan

---

## 8. Context Engineering

### AGENTS.md

Geladen bij startup vanuit drie locaties (geconcateneerd):
1. `~/.pi/agent/` (globaal)
2. Parent directories tot git root
3. Huidige werkdirectory

Hier zet je project conventies, commando's, coding standards, architectuur notities.

### SYSTEM.md

Vervangt de standaard systeemprompt **volledig**:
- `.pi/SYSTEM.md` (project-level, heeft voorrang)
- `~/.pi/agent/SYSTEM.md` (globale fallback)

### APPEND_SYSTEM.md

Voegt toe zonder te vervangen: `.pi/APPEND_SYSTEM.md`

Pi's standaard systeemprompt is ~200 tokens. Alles inclusief tool definities komt onder de 1.000 tokens — vergelijk dat met Claude Code's multi-duizenden tokens prompt.

---

## 9. Skills

Skills volgen het **Agent Skills standaard** formaat — cross-compatibel met Claude Code, Codex CLI, Amp, en Droid. Alleen skill **beschrijvingen** zitten permanent in context; volledige instructies laden on-demand.

### Skill aanmaken

```
mijn-skill/
├── SKILL.md          # Vereist: YAML frontmatter + instructies
├── scripts/
│   └── process.sh    # Helper scripts
├── references/
│   └── api-ref.md    # Gedetailleerde docs (on-demand)
└── assets/
    └── template.json
```

SKILL.md voorbeeld:

```markdown
---
name: erpnext-todos
description: Manage ERPNext ToDo items via Frappe REST API. Use for creating, listing, updating, and closing todos.
---

# ERPNext ToDo Management

## API Endpoint
Base: https://impertire.frappe.cloud/api/resource/ToDo

## List todos
curl -H "Authorization: token KEY:SECRET" $BASE?filters=[["status","=","Open"]]

## Create todo
curl -X POST $BASE -H "Authorization: token KEY:SECRET" \
  -d '{"allocated_to":"freek@impertio.nl","description":"...","priority":"Medium"}'
```

### Discovery locaties

Skills worden automatisch gevonden in: `~/.pi/agent/skills/`, `~/.agents/skills/`, `.pi/skills/`, `.agents/skills/` (cwd + ancestor directories), packages, en expliciete `--skill` paden.

Cross-compatibel met Claude Code door toe te voegen: `"skills": ["~/.claude/skills"]` in settings.

---

## 10. Prompt Templates

Elk `.md` bestand in de prompts directory wordt een expandable command.

```markdown
<!-- ~/.pi/agent/prompts/review.md -->
Review deze code op bugs, security issues, en performance.
Focus op: {{focus}}
```

Typ `/review` → Pi expandeert naar de bestandsinhoud. Ondersteunt `{{variable}}` placeholders en bash-stijl argumenten (`$1`, `$2`, `$@`).

---

## 11. Extension Systeem

Extensions zijn TypeScript modules die via `jiti` draaien (runtime transpilatie — geen build stap nodig). Ze hebben **volledige systeemtoegang** en kunnen registreren: tools, slash commands, keyboard shortcuts, CLI flags, UI components, message renderers, en 20+ lifecycle events.

### Basis extension

```typescript
// ~/.pi/agent/extensions/mijn-extension.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "greet",
    label: "Greeting",
    description: "Generate a greeting",
    parameters: Type.Object({
      name: Type.String({ description: "Name to greet" }),
    }),
    async execute(toolCallId, params, onUpdate, ctx, signal) {
      return {
        content: [{ type: "text", text: `Hello, ${params.name}!` }],
        details: {},
      };
    },
  });

  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (args, ctx) => { ctx.ui.notify("Hello!", "info"); },
  });
}
```

### Beschikbare API methoden

- `pi.registerTool()` — LLM-callable tools
- `pi.registerCommand()` — slash commands
- `pi.registerShortcut()` — keybindings
- `pi.registerFlag()` — CLI flags
- `pi.registerMessageRenderer()` — custom TUI rendering
- `pi.on()` — lifecycle events
- `pi.sendMessage()` — bericht injectie
- `pi.appendEntry()` — sessie persistentie
- `pi.exec()` — shell commando's
- `pi.getAllTools()` / `pi.setActiveTools()` — tool management
- `pi.registerProvider()` — custom LLM providers

### Event lifecycle (20+ events)

`session_start` → `input` → `before_agent_start` → `agent_start` → turn loop (`turn_start` → `context` → `tool_call` → `tool_execution_start/update/end` → `tool_result` → `turn_end`) → `agent_end`

### Voorbeeld extensions in de repo (50+)

- Sub-agent spawning
- Plan mode (Ctrl+Alt+P)
- Permission gates
- Protected paths
- SSH execution
- Sandbox (Docker/Podman)
- Custom compaction
- Doom overlay (ja, echt)

---

## 12. Pi Packages

Packages bundelen extensions, skills, prompts, en themes.

```bash
pi install npm:@foo/pi-tools              # npm
pi install npm:@foo/pi-tools@1.2.3        # Gepinde versie
pi install git:github.com/user/repo       # Git
pi install /absoluut/pad/naar/package     # Lokaal pad
pi remove npm:@foo/pi-tools               # Verwijderen
pi list                                    # Lijst
pi update                                  # Alles updaten
pi config                                  # Resources in/uitschakelen
```

### Package maken

```json
{
  "name": "mijn-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

---

## 13. Vergelijking met Claude Code

| Aspect | Claude Code | Pi |
|--------|------------|-----|
| Systeemprompt | ~10.000 tokens | ~200 tokens |
| Ingebouwde tools | 10+ | 4 (read, write, edit, bash) |
| Security | Deny-first permissions | Geen standaard. Bouw zelf. |
| Providers | Alleen Anthropic | 15+ providers |
| Sub-agents | Ingebouwd | Via tmux of extensions |
| MCP | Ingebouwde support | Geen. CLI tools + READMEs |
| Plan mode | Ingebouwd | Schrijf naar PLAN.md of extension |
| Extensions | Hooks (14 events) | Volledige TypeScript API (20+ events) |
| Observability | Geabstraheerd | Elk token zichtbaar |
| Kosten tracking | Beperkt | In footer met sessie statistieken |
| Context | Verandert per release | Jij controleert alles |

### Wat je moet afleren van Claude Code

1. **Stop met verwachten van ingebouwde safety prompts** — bouw een permission-gate extension als je dat wilt
2. **Stop met MCP servers** — schrijf CLI tools met README bestanden
3. **Gebruik tmux** voor background processen
4. **Schrijf plannen naar bestanden** in plaats van een plan mode
5. **Bouw CLI tools eerst**, wrap ze optioneel in extensions

---

## 14. ERPNext/Frappe Integratie

### Patroon 1: One-shot print mode (simpelst)

```python
import subprocess

def pi_query(prompt: str) -> str:
    result = subprocess.run(
        ["pi", "-p", prompt, "--no-session"],
        capture_output=True, text=True, timeout=120
    )
    return result.stdout.strip()
```

### Patroon 2: RPC mode vanuit Python/Frappe

Pi spawnen in RPC mode, communiceren via JSON over stdin/stdout. Geschikt voor server-side Frappe integratie.

### Patroon 3: SDK als sidecar microservice (productie)

Aanbevolen architectuur:

```
ERPNext (Python) ←→ HTTP ←→ Pi Agent Service (Node.js + SDK)
                              └─ Custom tools: frappe_get_document,
                                 frappe_list_documents,
                                 frappe_create_document,
                                 frappe_call_method,
                                 frappe_run_report
                              └─ GEEN bash/write/edit tools
```

### ERPNext context geven

- **AGENTS.md** in Pi werkdirectory: API endpoints, DocTypes, filter syntax, regels
- **Skills** voor on-demand capabilities: rapporten, financial queries
- Custom tools die Frappe REST API wrappen

### Veiligheid in productie

- SDK met alleen custom API tools (geen bash, write, edit)
- Dedicated Frappe API users met minimale role permissions
- Log alle agent tool calls naar custom DocType voor audit
- Rate-limit agent API calls

---

## 15. Bronnen & Community

- **Officiële docs:** https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent
- **Alle docs:** https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/docs/
- **Extensions docs:** https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md
- **Skills docs:** https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md
- **RPC docs:** https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/rpc.md
- **SDK docs:** https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/sdk.md
- **Packages docs:** https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md
- **Models docs:** https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/models.md
- **Providers docs:** https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/providers.md
- **Awesome Pi Agent:** https://github.com/qualisero/awesome-pi-agent
- **Pi Skills (officieel):** https://github.com/badlogic/pi-skills
- **Blog post:** https://mariozechner.at/posts/2025-11-30-pi-coding-agent/
- **MCP filosofie:** https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/
- **DeepWiki:** https://deepwiki.com/badlogic/pi-mono/

---

*Onderzoek uitgevoerd met web search, web fetch van officiële documentatie, GitHub README's, npm package info, en community bronnen.*
