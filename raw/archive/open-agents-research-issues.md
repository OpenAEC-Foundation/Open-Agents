# Open-Agents — Research Issues

Onderzoeksissues voor de Open-Agents repository.
Elke issue volgt het format: titel, labels, beschrijving, achtergrond, onderzoeksvragen, deliverables, en referenties.

---

---

## Issue #0: CLI Toolchain voor Agentic Orchestration — Overzicht & Evaluatie

**Labels:** `research`, `tooling`, `foundation`, `priority:high`

### Beschrijving

Evalueer, documenteer en benchmark het complete landschap van CLI-gebaseerde tools die samen de foundation vormen voor Open Agents' orchestration-stack. Dit is de overkoepelende issue die alle tooling-keuzes samenbrengt en onderbouwt.

### Achtergrond

Open Agents is CLI-first: agents draaien als processen, communiceren via de terminal, en worden beheerd zonder GUI. Dit past bij het Unix-principe van kleine tools die één ding goed doen en via compositie krachtige systemen vormen. De toolchain-keuzes die we nu maken bepalen de developer experience, schaalbaarheid en onderhoudbaarheid van het hele project.

### Te evalueren tools per categorie

**Terminal multiplexing & agent containers**
- **tmux** — programmatische session/window/pane control, `send-keys` voor command injection, `capture-pane` voor output
- **tmuxinator** (Ruby) / **tmuxp** (Python) — declaratieve session layouts in YAML
- **Zellij** — moderne Rust-gebaseerde multiplexer met native layout systeem en plugin support
- **screen** — legacy optie, relevant voor compatibiliteit

**Shell & prompt**
- **Zsh** + **Oh My Zsh** — plugin ecosysteem, autocompletie, thema's
- **Fish shell** — out-of-the-box autosuggestions en syntax highlighting
- **Starship** — cross-shell prompt met git-status, language versions, en custom modules
- **Nushell** — structured data shell die stdout als tabellen behandelt (interessant voor agent output parsing)

**Bestandsbeheer & navigatie**
- **fzf** — fuzzy finder, inplugbaar op alles (files, history, git branches, agent selection)
- **eza** (opvolger van exa) — `ls` met kleuren, git status, tree view
- **bat** — `cat` met syntax highlighting en git integration
- **zoxide** — smart `cd` die meestgebruikte directories onthoudt
- **ranger** / **yazi** — terminal file managers met preview
- **broot** — interactieve directory navigator met fuzzy search

**Zoeken & tekstverwerking**
- **ripgrep** (`rg`) — razendsnelle grep-vervanging, respecteert .gitignore
- **fd** — intuïtievere, snellere `find`
- **jq** — essentieel voor JSON parsing van agent-berichten en configuratie
- **yq** — jq-equivalent voor YAML (agent configs, workspace templates)
- **sd** — modernere `sed` voor find-and-replace
- **sed** / **awk** — klassieke Unix tekstverwerking

**Process management & supervisie**
- **PM2** — Node-based process manager met ecosystem files, auto-restart, log management
- **Supervisord** — Python-based, declaratieve process control
- **systemd** — OS-level service management (voor productie deployments)
- **GNU Parallel** — parallelle executie van commands, ideaal voor batch agent spawning

**Message passing & communicatie**
- **Redis** (`redis-cli`) — pub/sub, Streams voor durable messaging, hashes voor state
- **NATS** (`nats-cli`) — lichtgewicht messaging met subject-based routing
- **ZeroMQ** — broker-less messaging library
- **socat** / Unix named pipes (FIFOs) — zero-dependency IPC

**Task runners & workflow**
- **Just** (justfile) — moderne Make-alternatief, clean syntax, cross-platform
- **Task** (taskfile.yml) — YAML-based task runner met dependency management
- **Make** — universeel beschikbaar, maar verbose syntax
- **Mprocs** — TUI voor het beheren van meerdere processen tegelijk

**Environment & workspace isolation**
- **direnv** — automatische environment variables per directory
- **mise** (voorheen rtx) — polyglot tool version manager (vervangt nvm, pyenv, etc.)
- **Cookiecutter** / **Copier** — project scaffolding vanuit templates

**Monitoring & observability**
- **btop** / **htop** — system monitoring (CPU, memory, process tree)
- **ncdu** — interactieve disk usage analyzer
- **multitail** — meerdere log files tegelijk volgen
- **lnav** — log file navigator met filtering en syntax highlighting
- **watchexec** — voer commands uit bij file changes (trigger agent acties)

**Git & development**
- **lazygit** — volledige git TUI
- **delta** — betere git diff viewer met syntax highlighting
- **gh** — GitHub CLI voor issues, PRs, workflows
- **Claude Code** — Anthropic's agentic coding CLI

**Netwerk & API**
- **httpie** (`http`) — human-friendly HTTP client
- **curl** — universele HTTP tool
- **websocat** — WebSocket client voor real-time agent communicatie
- **grpcurl** — gRPC CLI client (relevant voor A2A protocol)

**Productiviteit & referentie**
- **tldr** — korte, praktische command voorbeelden
- **neovim** — extensible teksteditor
- **taskwarrior** — CLI task management
- **pass** — Unix password manager

### Onderzoeksvragen

- Welke tools zijn essentieel voor de MVP-stack vs nice-to-have?
- Wat is de installatie-overhead? Kunnen we een single-command setup script leveren?
- Welke tools hebben native support voor structured output (JSON/YAML) wat agent parsing vergemakkelijkt?
- Hoe goed integreren de tools met elkaar? (bijv. fzf + ripgrep, tmux + PM2, jq + Redis)
- Welke tools werken cross-platform (macOS, Linux, WSL) en welke zijn platform-specifiek?
- Wat is de leercurve voor nieuwe contributors?
- Hoe verhoudt **Nushell** zich tot Bash/Zsh voor agent output parsing (structured data vs plain text)?

### Deliverables

- [ ] Gerankte tool-lijst per categorie met aanbeveling (must-have / recommended / optional)
- [ ] Installatie-script of Brewfile/Aptfile voor one-command setup
- [ ] Integratie-matrix: welke tools werken goed samen en hoe
- [ ] Benchmark: performance-relevante tools (ripgrep, fzf, NATS vs Redis)
- [ ] Getting Started guide voor contributors: "Install these 10 tools and you're ready"
- [ ] Compatibiliteits-matrix per OS (macOS, Ubuntu, Arch, WSL2)

### Referenties

- [Modern Unix](https://github.com/ibraheemdev/modern-unix) — curated lijst van moderne CLI tools
- [Awesome CLI Apps](https://github.com/agarrharr/awesome-cli-apps)
- [Charm.sh](https://charm.sh/) — mooie TUI libraries voor Go (relevant voor custom tooling)
- [Awesome TUIs](https://github.com/rothgar/awesome-tuis)

---

---

## Issue #1: Inter-Agent Communication Protocol Design

**Labels:** `research`, `architecture`, `priority:high`

### Beschrijving

Onderzoek en ontwerp een communicatieprotocol waarmee Open Agents onderling berichten, prompts en context kunnen uitwisselen. Agents moeten in staat zijn om autonoom andere agents aan te roepen wanneer zij specialistische hulp nodig hebben, zonder menselijke tussenkomst.

### Achtergrond

Een agent die code reviewt ontdekt mogelijk een architectuurprobleem en moet een architect-agent kunnen aanspreken. Dit vereist een gestandaardiseerd berichtformaat, routering, en reply-mechanismen. Er bestaan meerdere niveaus van complexiteit: van directe pipe-communicatie tot volledige message buses.

### Onderzoeksvragen

- Welk message format is optimaal? (JSON-RPC, custom JSON schema, protobuf)
- Push vs pull: wanneer stuurt een agent direct naar een specifieke agent (push) vs wanneer claimen agents taken van een gedeelde queue (pull)?
- Hoe verhoudt ons protocol zich tot bestaande standaarden zoals Google's Agent2Agent (A2A) protocol en Anthropic's MCP?
- Moet het protocol synchroon (request/response), asynchroon (pub/sub), of beide ondersteunen?
- Hoe gaan we om met reply-chains — agent A vraagt agent B, die agent C inschakelt, die terug rapporteert aan A?
- Hoe voorkomen we infinite loops (agent A roept B aan, B roept A aan)?

### Deliverables

- [ ] Protocol specificatie document (message format, routing regels, error handling)
- [ ] Vergelijkingsmatrix: A2A vs MCP vs custom protocol vs hybride aanpak
- [ ] Proof-of-concept met twee agents die via het protocol communiceren
- [ ] Sequence diagrams voor de drie kernpatronen: direct request, broadcast, en chain-of-delegation

### Referenties

- [Google A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [A2A GitHub Repository](https://github.com/a2aproject/A2A) — Agent Cards, JSON-RPC 2.0, task lifecycle
- [Anthropic MCP](https://modelcontextprotocol.io/) — tools & data access standaard
- IBM's Agent Communication Protocol (ACP) via BeeAI

### Relevante CLI Tools

- **jq** / **yq** — parsen en valideren van JSON/YAML berichten tussen agents
- **grpcurl** — testen van gRPC-gebaseerde communicatie (A2A v0.3 ondersteunt gRPC)
- **websocat** — WebSocket communicatie testen (relevant voor streaming/SSE patronen)
- **httpie** — human-readable HTTP requests voor JSON-RPC testing
- **nats-cli** / **redis-cli** — direct interacteren met de message bus vanuit de terminal

---

---

## Issue #2: CLI-based Message Bus Evaluatie

**Labels:** `research`, `infrastructure`, `tooling`

### Beschrijving

Evalueer CLI-gebaseerde message bus oplossingen voor inter-agent communicatie binnen Open Agents. De oplossing moet lichtgewicht, scriptbaar, en observeerbaar zijn vanuit de terminal.

### Achtergrond

Voor agent orchestration hebben we een communicatielaag nodig. De opties variëren van zero-dependency (Unix pipes, files) tot lichtgewicht services (Redis, NATS) tot volledige message brokers (RabbitMQ, Kafka). De keuze heeft directe impact op complexiteit, schaalbaarheid en developer experience.

### Onderzoeksvragen

- **Unix Named Pipes (FIFOs) + socat**: Hoe ver kom je zonder externe dependencies? Wat zijn de limieten qua concurrency en betrouwbaarheid?
- **Redis pub/sub + Streams**: Wat is de overhead van een Redis instance? Hoe bruikbaar is `redis-cli` als primaire interface? Biedt Redis Streams voldoende garanties voor task queuing?
- **NATS**: Hoe verhoudt NATS zich tot Redis voor agent-communicatie? Wat zijn de voordelen van ingebouwde subject-based routing?
- **ZeroMQ**: Is het broker-less model geschikt voor lokale agent-netwerken?
- Welke oplossing integreert het beste met tmux-gebaseerde agent monitoring?
- Wat is de minimale viable stack voor een prototype vs productie?

### Deliverables

- [ ] Benchmark: latency, throughput, en resource gebruik per oplossing
- [ ] Evaluatiematrix gewogen op: CLI-vriendelijkheid, zero-config setup, observeerbaarheid, schaalbaarheid
- [ ] Aanbeveling voor MVP-stack en productie-stack
- [ ] Docker-compose of shell script voor snelle setup van de gekozen oplossing

### Referenties

- Redis Streams documentatie
- NATS.io — CLI-first messaging
- ZeroMQ guide
- socat en Unix named pipes voor zero-dependency communicatie

### Relevante CLI Tools

- **redis-cli** — direct pub/sub testen, Streams inspecteren, state bekijken vanuit terminal
- **nats-cli** — subject-based messaging, request/reply patterns, bench subcommand voor throughput tests
- **socat** — bidirectionele data transfer, Unix socket proxy, network relay
- **mkfifo** — Unix named pipes aanmaken voor zero-dependency IPC
- **pv** (Pipe Viewer) — throughput meten in pipelines tussen agents
- **jq** — JSON berichten filteren en transformeren in message streams

---

---

## Issue #3: Agent Registry & Discovery Mechanisme

**Labels:** `research`, `architecture`, `priority:high`

### Beschrijving

Ontwerp een registry systeem waarmee agents zich kunnen registreren, hun capabilities adverteren, en andere agents kunnen ontdekken. Dit is de basis voor intelligente routing en delegatie.

### Achtergrond

Wanneer een agent hulp nodig heeft, moet die kunnen ontdekken welke andere agents beschikbaar zijn en wat ze kunnen. Google's A2A protocol lost dit op met "Agent Cards" — JSON-documenten die capabilities, endpoints en auth-informatie bevatten. We moeten bepalen hoe dit concept past bij onze CLI-first aanpak.

### Onderzoeksvragen

- Hoe definiëren we agent capabilities op een manier die zowel machine-leesbaar als menselijk begrijpelijk is?
- Statische registry (YAML/JSON file) vs dynamische registry (agents registreren zich bij opstarten)?
- Hoe gaan we om met agents die offline gaan of crashen? Health checks? Heartbeats?
- Moet de registry centraal zijn (één bron van waarheid) of gedistribueerd (elke agent kent zijn buren)?
- Hoe integreren we met het A2A Agent Card concept zonder vendor lock-in?
- Rol van een "dispatcher agent" die routing-beslissingen neemt op basis van de registry

### Deliverables

- [ ] Agent Card schema specifiek voor Open Agents (geïnspireerd op A2A maar CLI-native)
- [ ] Registry implementatie opties: file-based, Redis-backed, of in-memory
- [ ] Discovery protocol: hoe vindt agent A de juiste agent B voor een specifieke taak?
- [ ] Health check en lifecycle management strategie

### Relevante CLI Tools

- **jq** / **yq** — Agent Card bestanden parsen, valideren, en querien
- **redis-cli** — registry opslaan als Redis hashes, health status als key-value pairs
- **fzf** — interactief agents zoeken en selecteren op basis van capabilities
- **watchexec** — automatisch reageren op registry-wijzigingen (nieuwe agent geregistreerd)
- **curl** / **httpie** — Agent Card endpoints opvragen (A2A-stijl `/.well-known/agent.json`)

---

---

## Issue #4: Tmux als Agent Container Runtime

**Labels:** `research`, `tooling`, `developer-experience`

### Beschrijving

Onderzoek hoe tmux (en gerelateerde tools) ingezet kan worden als lightweight container runtime voor agents. Elke agent draait in een eigen tmux pane of session, wat real-time observeerbaarheid biedt.

### Achtergrond

Tmux biedt programmatische controle over terminal sessions: je kunt sessions aanmaken, commands injecteren via `tmux send-keys`, output capturen, en sessions detachen/attachen. Dit maakt het een natuurlijke "agent container" voor CLI-gebaseerde orchestration.

### Onderzoeksvragen

- Hoe definiëren we agent layouts declaratief? Evaluatie van **tmuxinator** (Ruby), **tmuxp** (Python), en custom YAML-schemas
- Hoe capturen we agent output programmatisch? (`tmux capture-pane`, log files, of pipe naar message bus)
- Wat zijn de limieten van tmux als het gaat om tientallen of honderden agents?
- Hoe integreren we agent lifecycle management (start, stop, restart, health check) met tmux?
- Hoe visualiseren we agent-status en communicatie in een tmux dashboard?
- Alternatief: **Zellij** als modernere multiplexer — wat zijn de voor/nadelen vs tmux?

### Deliverables

- [ ] Tmux session layout template voor een standaard agent pool (YAML)
- [ ] Script dat agents spawnt in tmux panes met logging en monitoring
- [ ] Vergelijking tmux vs Zellij voor agent orchestration
- [ ] Dashboard concept: agent status, message flow, en resource gebruik in tmux

### Relevante CLI Tools

- **tmux** — kern runtime: `new-session`, `split-window`, `send-keys`, `capture-pane`, `pipe-pane`
- **tmuxinator** (Ruby) — declaratieve session layouts, project-based configs
- **tmuxp** (Python) — YAML/JSON session management, freeze/restore sessions
- **Zellij** — Rust multiplexer met native layout engine en WASM plugin systeem
- **Mprocs** — TUI voor meerdere processen, alternatief voor tmux bij simpelere setups
- **btop** — system resource monitoring in een tmux pane voor pool health
- **multitail** — meerdere agent logs tegelijk volgen in gesplitste view

---

---

## Issue #5: Agent Workspace Templating & Isolation

**Labels:** `research`, `architecture`, `workspace`

### Beschrijving

Onderzoek hoe agent workspaces automatisch gegenereerd en geïsoleerd kunnen worden, zodat elke agent een schone, vooraf geconfigureerde werkomgeving heeft zonder context-vervuiling tussen agents.

### Achtergrond

Elke agent heeft potentieel een eigen set bestanden, configuratie, skills, en environment variables nodig. We moeten workspaces kunnen templaten (bijv. "reviewer agent workspace" bevat linting tools en code standaarden) en isoleren (agent A's output vervuilt niet agent B's context).

### Onderzoeksvragen

- Welke template engine is het beste? **Cookiecutter** vs **Copier** vs custom scripts
- Hoe definiëren we een workspace template? Welke componenten bevat een minimale agent workspace?
- Hoe zorgen we voor environment isolation? **direnv** per workspace? Aparte virtualenvs? Containers?
- Hoe gaan we om met gedeelde resources (bijv. een gezamenlijke codebase die alle agents moeten lezen)?
- Wat is de relatie tussen workspace templates en agent templates (capabilities, system prompts, tools)?
- Hoe voorkomen we dat workspaces langzaam vullen met gegenereerde bestanden en context vervuild raakt?

### Deliverables

- [ ] Workspace template specificatie: verplichte en optionele componenten
- [ ] Vergelijking templating tools (cookiecutter, copier, custom)
- [ ] Isolation strategie document (filesystem, environment, process)
- [ ] Cleanup/garbage collection strategie voor langlopende agent workspaces
- [ ] Voorbeeld workspace templates voor 3 agent-typen (reviewer, architect, developer)

### Relevante CLI Tools

- **Cookiecutter** — Python-based project templating met Jinja2, grote template library
- **Copier** — modernere alternatief voor Cookiecutter met template updates/versioning
- **direnv** — per-directory environment variables, `.envrc` files voor workspace isolation
- **mise** (voorheen rtx) — polyglot version manager, stelt tool-versies in per workspace
- **fd** + **ncdu** — workspace cleanup: vind grote/oude bestanden en analyseer disk usage
- **zoxide** — snel navigeren tussen agent workspaces vanuit elke directory
- **stow** — symlink manager voor het delen van configs tussen workspaces
- **rsync** — efficiënt synchroniseren van workspace templates en shared resources

---

---

## Issue #6: Agent Pool Management & Scaling

**Labels:** `research`, `architecture`, `scaling`

### Beschrijving

Onderzoek patronen voor het beheren van pools van agents: hoe spawnen, schalen, load-balancen, en monitoren we groepen van agents die dezelfde of complementaire taken uitvoeren?

### Achtergrond

In een productie-scenario wil je niet één reviewer-agent maar mogelijk drie, die taken van een queue claimen. Dit vereist pool management: hoeveel agents draaien er, zijn ze gezond, hoe verdelen we werk, en wanneer schalen we op of af?

### Onderzoeksvragen

- Welke process managers zijn geschikt? **PM2**, **Supervisord**, **systemd**, of custom?
- Hoe implementeren we work-stealing of round-robin taakverdelding over een pool?
- Wanneer spawnen we nieuwe agents? Statische pools vs dynamisch schalen op basis van queue depth?
- Hoe gaan we om met agent crashes? Automatische restart? State recovery?
- Wat is de maximale pool size per machine, gegeven resource constraints (API rate limits, memory, CPU)?
- Hoe rapporteren we pool health en performance metrics?

### Deliverables

- [ ] Pool management architectuur document
- [ ] Vergelijking process managers voor agent lifecycle
- [ ] Taakverdelings-algoritme specificatie
- [ ] Scaling policy: triggers en thresholds voor op- en afschalen
- [ ] Monitoring dashboard concept (agent count, queue depth, success/failure rates)

### Relevante CLI Tools

- **PM2** — ecosystem.config.js voor declaratief process management, auto-restart, cluster mode, `pm2 monit`
- **Supervisord** — `.ini`-based process control, web UI optioneel, goed voor Linux servers
- **GNU Parallel** — batch spawning: `parallel --jobs 5 open-agents spawn ::: reviewer reviewer reviewer architect tester`
- **systemd** — productie-level service management, journal logging, resource cgroups
- **htop** / **btop** — real-time process monitoring, filter op agent processen
- **pgrep** / **pkill** — process lookup en management op naam/pattern

---

---

## Issue #7: Orchestration Task Runner Evaluatie

**Labels:** `research`, `tooling`, `developer-experience`

### Beschrijving

Evalueer task runners en workflow-definietools die gebruikt kunnen worden als orchestration interface voor Open Agents. Het doel is een declaratieve manier om agent workflows te definiëren en uit te voeren.

### Achtergrond

Ontwikkelaars hebben een intuïtieve CLI interface nodig om agents te beheren: `open-agents spawn reviewer`, `open-agents pool status`, `open-agents workflow run code-review`. Tools als Just, Task, Make, en GNU Parallel bieden verschillende benaderingen.

### Onderzoeksvragen

- **Just** (justfile) vs **Task** (taskfile.yml) vs **Make**: welke is het meest geschikt voor agent orchestration?
- Hoe definiëren we agent workflows declaratief? YAML, TOML, of een custom DSL?
- Hoe integreren we **GNU Parallel** voor het spawnen van meerdere agents tegelijk?
- Kunnen we workflow-stappen conditioneel maken (bijv. "run security-scan alleen als reviewer een vulnerability vindt")?
- Hoe loggen we workflow-executie voor debugging en auditing?
- Hoe combineren we de task runner met de message bus en agent registry?

### Deliverables

- [ ] Vergelijkingsmatrix: Just vs Task vs Make vs custom CLI voor agent orchestration
- [ ] Workflow definitie format specificatie
- [ ] Voorbeeld workflows: single-agent taak, multi-agent pipeline, conditional branching
- [ ] Integratie-architectuur: task runner ↔ message bus ↔ agent registry

### Relevante CLI Tools

- **Just** — Rust-based, clean syntax, variabelen, conditionele logica, `just --list` voor discovery
- **Task** (go-task) — YAML-based, dependency management, `task --list`, dotenv support
- **Make** — universeel beschikbaar, geen installatie nodig, maar arcane syntax
- **GNU Parallel** — parallelle executie van agent tasks met structured output
- **Mprocs** — meerdere processen tegelijk beheren in een TUI
- **entr** — file watcher die commands herstart bij changes (alternatief voor watchexec)
- **fzf** — interactieve workflow/task selectie: `just --list | fzf | xargs just`

---

---

## Issue #8: Emergent Agent Gedrag & Dispatcher Architectuur

**Labels:** `research`, `architecture`, `advanced`

### Beschrijving

Onderzoek hoe een dispatcher of meta-orchestrator agent intelligente routing-beslissingen kan nemen, en hoe emergent gedrag kan ontstaan wanneer agents autonoom samenwerken.

### Achtergrond

Voorbij statische workflows ligt de mogelijkheid dat agents zelf bepalen wie ze inschakelen. Een dispatcher-agent ontvangt verzoeken en bepaalt — eventueel met behulp van een LLM — welke agent het meest geschikt is. Dit opent de deur naar emergent gedrag: patronen die niet expliciet geprogrammeerd zijn maar ontstaan uit agent-interactie.

### Onderzoeksvragen

- Hoe ontwerpen we een dispatcher die routing-beslissingen neemt op basis van agent capabilities, workload, en taakcomplexiteit?
- Kan de dispatcher zelf een LLM-call doen om te bepalen welke agent het beste past? Wat zijn de kosten en latency implicaties?
- Hoe voorkomen we ongewenst emergent gedrag (loops, resource exhaustion, contradictoire acties)?
- Welke guardrails zijn nodig? Max recursion depth? Budget limieten? Approval gates?
- Hoe loggen en visualiseren we agent-interactie patronen voor analyse?
- Wat kunnen we leren van bestaande multi-agent frameworks (CrewAI, AutoGen, LangGraph, OpenAI Swarm)?

### Deliverables

- [ ] Dispatcher architectuur document met routing-algoritme
- [ ] Guardrail specificatie: loop-detectie, budget caps, max delegation depth
- [ ] Vergelijking multi-agent frameworks en hun orchestration-patronen
- [ ] Visualisatie concept voor agent-interactie grafen
- [ ] Risk assessment: wat kan er misgaan bij autonoom agent gedrag?

### Relevante CLI Tools

- **Claude Code** — als dispatcher kan een LLM-agent routing-beslissingen nemen via Claude's CLI
- **jq** — agent capability matching door JSON registry te querien
- **graphviz** (`dot`) — agent-interactie grafen genereren en visualiseren vanuit de terminal
- **d2** — modern diagram-als-code tool voor het visualiseren van delegation flows
- **timeout** (coreutils) — hard time limits op agent processen als guardrail
- **ulimit** — resource limieten per agent process (memory, open files, CPU time)

---

---

## Issue #9: Observability & Logging voor Multi-Agent Systemen

**Labels:** `research`, `infrastructure`, `observability`

### Beschrijving

Onderzoek hoe we multi-agent systemen effectief kunnen monitoren, loggen en debuggen. Wanneer tientallen agents parallel werken en communiceren, is observeerbaarheid essentieel.

### Achtergrond

Met meerdere agents die parallel draaien, communiceren, en taken delegeren, wordt debugging snel complex. We hebben een logging- en monitoring-strategie nodig die werkt op CLI-niveau en die agent-interacties traceerbaar maakt.

### Onderzoeksvragen

- Hoe structureren we logs zodat we een "conversation trace" kunnen volgen over meerdere agents?
- **multitail** vs **lnav** vs custom log aggregatie voor real-time monitoring
- Hoe correleren we berichten over agents heen? (trace IDs, correlation IDs)
- Welke metrics zijn essentieel? (agent uptime, response time, token usage, error rate, queue depth)
- Hoe integreren we met OpenTelemetry of vergelijkbare standaarden?
- Hoe visualiseren we agent-communicatie flows in de terminal? (ASCII grafen, TUI dashboards)

### Deliverables

- [ ] Logging format specificatie met trace/correlation IDs
- [ ] Tool evaluatie voor CLI-based log monitoring
- [ ] Metrics definitie document
- [ ] TUI dashboard concept voor agent observability
- [ ] Replay/debug strategie: hoe herproduceren we een multi-agent interactie?

### Relevante CLI Tools

- **multitail** — meerdere logstreams tegelijk volgen met kleurcodering per agent
- **lnav** — log navigator met filtering, zoeken, SQL queries over logs, auto-format detection
- **jq** — structured log entries filteren op trace ID, agent naam, severity
- **ripgrep** (`rg`) — razendsnel zoeken door agent logs op patronen of correlation IDs
- **btop** — real-time resource monitoring per agent process
- **script** / **asciinema** — terminal sessies opnemen voor replay en debugging
- **column** — tabulaire output formatteren voor dashboard-achtige weergave
- **gum** (Charm.sh) — interactieve TUI componenten voor agent status dashboards
- **ttyplot** — real-time terminal plots van metrics (queue depth, message rate)

---

---

## Issue #10: A2A Protocol Compatibiliteit Onderzoek

**Labels:** `research`, `standards`, `interoperability`

### Beschrijving

Onderzoek de haalbaarheid en waarde van compatibiliteit met Google's Agent2Agent (A2A) protocol voor Open Agents. Bepaal of en hoe we A2A kunnen adopteren of ermee kunnen integreren.

### Achtergrond

Het A2A protocol (nu v0.3, onder Linux Foundation) wordt een de-facto standaard voor agent interoperabiliteit, met ondersteuning van 150+ organisaties. Het protocol definieert Agent Cards voor discovery, JSON-RPC voor communicatie, en een task lifecycle model. Compatibiliteit zou Open Agents interoperabel maken met het bredere agent-ecosysteem.

### Onderzoeksvragen

- Hoe verhoudt het A2A model (client-server, Agent Cards, task lifecycle) zich tot onze CLI-first aanpak?
- Kunnen we een A2A-compatible laag bovenop onze interne communicatie bouwen?
- Wat is de overhead van A2A compliance voor lokale agent-netwerken?
- Hoe combineren we A2A (agent-to-agent) met MCP (agent-to-tools)?
- Is het zinvol om Agent Cards te implementeren voor intern gebruik, zelfs zonder externe interoperabiliteit?
- Wat zijn de security-implicaties? (auth schemes, token management)

### Deliverables

- [ ] A2A gap analyse: wat ontbreekt er in Open Agents om A2A-compatibel te zijn?
- [ ] Architectuurvoorstel: A2A als optionele laag vs native protocol
- [ ] Agent Card implementatie prototype
- [ ] Security assessment voor agent-communicatie
- [ ] Roadmap voor gefaseerde A2A adoptie

### Referenties

- [A2A Protocol Specification v0.3](https://a2a-protocol.org/latest/specification/)
- [A2A GitHub](https://github.com/a2aproject/A2A)
- [A2A Python SDK](https://github.com/a2aproject/a2a-python)
- [Google ADK met A2A integratie](https://developers.googleblog.com/agents-adk-agent-engine-a2a-enhancements-google-io/)
- IBM's vergelijking A2A vs ACP vs MCP

### Relevante CLI Tools

- **grpcurl** — A2A v0.3 ondersteunt gRPC; grpcurl maakt het testbaar vanuit de terminal
- **httpie** / **curl** — JSON-RPC 2.0 requests naar A2A endpoints
- **jq** — Agent Cards parsen en capabilities extracten
- **openssl** — signed Agent Cards valideren (A2A v0.3 security feature)
- **gh** (GitHub CLI) — A2A reference samples clonen en experimenteren

---

---

## Issue #11: Context Engineering voor Agent Workspaces

**Labels:** `research`, `context-engineering`, `optimization`

### Beschrijving

Onderzoek hoe we context efficiënt kunnen beheren binnen agent workspaces. Hoe voorkomen we context-vervuiling, hoe optimaliseren we wat een agent "weet", en hoe zorgen we dat relevante informatie beschikbaar is zonder token-verspilling?

### Achtergrond

Agents werken met LLM context windows die beperkt zijn. Elke .md file, configuratie, en communicatiebericht neemt tokens in beslag. Naarmate een workspace groeit met gegenereerde bestanden en logs, kan de effectieve context vervuild raken. Dit is een kernprobleem in het project Context Engineering & Agentic Workspace Optimalisatie.

### Onderzoeksvragen

- Hoe bepalen we welke informatie een agent nodig heeft voor een specifieke taak? (progressive disclosure, lazy loading)
- Wat is de optimale verhouding tussen system prompt, skills, workspace context, en conversation history?
- Hoe implementeren we "context scoping" — agents zien alleen wat relevant is?
- Global vs local settings: wat hoort op machine-niveau, workspace-niveau, en agent-niveau?
- Hoe voorkomen we dat cumulatieve bestanden (logs, outputs, temp files) context vervuilen?
- Welke patronen uit Anthropic's skills architectuur (progressive disclosure) kunnen we toepassen?

### Deliverables

- [ ] Context budget model: hoeveel tokens per categorie (system, skills, workspace, conversation)
- [ ] Scoping strategie document: welke informatie op welk niveau
- [ ] Cleanup/rotation beleid voor workspace bestanden
- [ ] Best practices document voor skill-ontwerp dat context-efficiënt is
- [ ] Vergelijking: settings op global vs workspace vs agent niveau

### Relevante CLI Tools

- **direnv** — kern tool: global vs local environment settings per directory-niveau
- **ncdu** — analyseer welke bestanden het meeste ruimte innemen in een workspace
- **fd** + **find** — bestanden ouder dan X dagen vinden voor cleanup
- **tokei** — regels code tellen per taal (proxy voor context-grootte)
- **wc** + **jq** — token-schattingen maken van workspace bestanden
- **bat** — snel bestanden inspecteren om context-relevantie te beoordelen
- **tree** / **eza --tree** — workspace structuur visualiseren voor context-audit
- **rg** (ripgrep) — snel zoeken welke bestanden bepaalde context bevatten

---

---

## Issue #12: Security Model voor Autonome Agent Communicatie

**Labels:** `research`, `security`, `priority:high`

### Beschrijving

Ontwerp een security model voor een systeem waarin agents autonoom communiceren, taken delegeren, en acties uitvoeren. Welke risico's ontstaan er en hoe mitigeren we die?

### Achtergrond

Wanneer agents elkaar prompts kunnen sturen en taken kunnen uitvoeren, ontstaan nieuwe aanvalsvectoren: prompt injection via agent-berichten, privilege escalation via delegatie-chains, ongeautoriseerde resource toegang, en uncontrolled spending op API calls.

### Onderzoeksvragen

- Hoe voorkomen we prompt injection via inter-agent berichten?
- Welk permissie-model gebruiken we? (capability-based, role-based, of per-action approval)
- Hoe beperken we wat een agent mag doen? Sandboxing, resource limieten, API budgets?
- Hoe auditen we agent-acties voor compliance en debugging?
- Moet er een human-in-the-loop zijn voor bepaalde acties? Zo ja, welk approval-mechanisme?
- Hoe gaan we om met secrets en credentials in een multi-agent omgeving?

### Deliverables

- [ ] Threat model document specifiek voor multi-agent systemen
- [ ] Permissie-model specificatie
- [ ] Sandboxing strategie per agent-type
- [ ] Audit logging specificatie
- [ ] API budget management mechanisme
- [ ] Human-in-the-loop approval flow design

### Relevante CLI Tools

- **pass** / **age** — secrets management voor API keys en credentials per agent
- **firejail** / **bubblewrap** — sandboxing: beperk filesystem en netwerk-toegang per agent process
- **ulimit** — resource limieten (memory, CPU, open files) als guardrail per agent
- **auditd** — OS-level audit logging van agent process-acties
- **openssl** — certificaat management voor signed inter-agent communicatie
- **gum** (Charm.sh) — interactieve TUI confirmatie-dialogen voor human-in-the-loop approval
- **sudo** / **doas** — privilege separation voor agents die elevated access nodig hebben
- **cgroups** (via systemd) — hard resource isolation per agent groep
