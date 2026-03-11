# Hetzner GPU Server Integration — Technical Proposal v2

> **Author:** hetzner-architect agent
> **Date:** 2026-03-11
> **Status:** Proposal — for review by meta-orchestrator
> **Based on:** Live code analysis of `spawner.py`, `bridge.py`, `config.py`, `SpawnForm.tsx`, `ARCHITECTURE.md`, `CAPABILITIES.md`, `MASTERPLAN.md`

---

## 1. Vision

The Hetzner GPU server at `144.76.60.210` currently functions as a remote Claude Code execution host. We want to expand this to a **full AI stack integration** where oa-cli can:

1. **Spawn Claude Code agents** on the Hetzner server (already partially working via `spawn_remote_agent`)
2. **Route inference requests** to Ollama models running on the GPU (7 models, RTX 4000 Ada, 20 GB VRAM) — eliminating Anthropic API costs for text-only workloads
3. **Invoke GPU-accelerated services** via service-agents: STT (Speaches / Whisper large-v3-turbo), TTS (XTTS-v2), OCR (Docling + PaddleOCR), embedding (BGE-M3), vector search (Qdrant)
4. **Expose dynamic model discovery** so the web UI always shows what's available on the server, without hardcoding

The key principle: **Hetzner is not just an SSH tunnel target — it's a full AI compute node.** oa-cli must treat it as a first-class machine with its own model roster and service capabilities.

Current stack on Hetzner (verified from MASTERPLAN.md + CAPABILITIES.md):

| Service | Internal port | nginx path | Status |
|---------|--------------|------------|--------|
| Ollama | 11434 | — | Phase 1 planned |
| LiteLLM (OpenAI-compat gateway) | 4000 | `/api/llm/v1/` | Phase 3 planned |
| Speaches STT | 8000 | `/api/stt/v1/` | Phase 2 planned |
| XTTS-v2 TTS | 8001 | `/api/tts/` | Phase 2 planned |
| Vision / OCR API | 8002 | `/api/vision/` | Phase 2 planned |
| Qdrant | 6333 | — | Phase 2 planned |
| Open WebUI | 3000 | `/` | Phase 1 planned |
| vLLM | 8003 | `/api/ml/` | Phase 3 planned |

---

## 2. Three Agent Types

The integration introduces three distinct agent execution patterns. Each has different capabilities, resource costs, and use cases.

### Type A: Agentic Claude on Hetzner

**What it is:** A Claude Code agent spawned remotely on the Hetzner server via SSH. Full agentic capabilities: file I/O, tool use, bash execution, sub-agent spawning. Runs against the Anthropic API (Claude subscription required on the server).

**Model ID:** `hetzner/claude/sonnet`, `hetzner/claude/opus`, `hetzner/claude/haiku`

**Use case:** Long-running compute-intensive tasks that benefit from GPU server resources (disk, RAM, proximity to Ollama), tasks that need to spawn sub-agents locally on the server (e.g., a training supervisor that monitors `nvidia-smi` and spawns model evaluation sub-agents).

**Current state:** Already functional via `spawn_remote_agent()` in `spawner.py` with SSH host `hetzner-agent`. Two bugs block it for root users (see Section 6).

**Key characteristic:** Output flows back to local oa-cli via `oa collect`. Agent writes to `/tmp/oa-agent-<name>/output/result.md` and creates `.done`.

---

### Type B: Text-Only Ollama Agent (Hetzner GPU)

**What it is:** An Ollama model running on the GPU server, fed a task prompt, producing text output. No tool use, no file I/O. Text in → text out. Fast, cheap (zero API cost), GPU-accelerated.

**Model ID:** `hetzner/qwen2.5:14b`, `hetzner/qwen2.5-coder:14b`, `hetzner/phi4:14b`, `hetzner/llama3.1:8b`, `hetzner/deepseek-r1:14b`

**Use case:** Summarization, translation, code review, Q&A over documents. Tasks where Claude-level reasoning is not required but GPU speed matters.

**Implementation:** Extend `spawn_remote_agent()` to detect `hetzner/<model>` prefix, SSH to the Hetzner server, and pipe the task to `ollama run <model>`. Analogous to the existing `_build_ollama_command()` but executed remotely.

**Key characteristic:** No ANTHROPIC_API_KEY required on the server for inference. Output collected via same `.done` mechanism.

---

### Type C: Service Agents (STT, TTS, OCR, Embeddings)

**What it is:** Thin wrapper agents that call a specific HTTP service on the Hetzner server and return structured output. Not spawned via tmux — instead, oa-cli makes an HTTP call over SSH tunnel or via HTTPS and wraps the response.

**Model ID / Service ID:** `hetzner/service/stt`, `hetzner/service/tts`, `hetzner/service/ocr`, `hetzner/service/embed`

**Use case:** Audio transcription pipelines (meeting recordings → text), document parsing (PDF/scan → markdown), TTS for voice output, semantic search (embed → Qdrant query).

**Implementation:** These are not spawned as tmux agents but as Python coroutines in oa-cli that POST to the Hetzner nginx endpoints via HTTPS (`https://144.76.60.210/api/stt/v1/`, etc.) or SSH tunnel. Agent templates in `agents/library/hetzner-services/` provide task descriptions and prompt scaffolding.

**Key characteristic:** Synchronous HTTP call, no tmux session, output is immediate. Can be orchestrated by agentic Claude agents (Type A) running on the server.

---

## 3. Model-ID Schema

### Current Schema (spawner.py lines 36–41)

```python
CLAUDE_MODEL_MAP = {
    "claude": None,           # default subscription model
    "claude/opus": "opus",
    "claude/sonnet": "sonnet",
    "claude/haiku": "haiku",
}
```

And in `spawn_agent()` lines 208–218:
```python
if model.startswith("ollama/"):
    ollama_model = model.split("/", 1)[1]
    agent_command = _build_ollama_command(workspace, name, ollama_model)
elif model.startswith("claude/"):
    claude_model = CLAUDE_MODEL_MAP.get(model)
    ...
else:
    agent_command = _build_claude_command(workspace, name)
```

### Proposed Extended Schema

The `hetzner/` prefix always means: execute on the Hetzner server (SSH host `hetzner-agent`).

| Model ID | Execution | Runtime | API cost |
|----------|-----------|---------|----------|
| `claude` | Local tmux | Claude Code CLI | Yes |
| `claude/sonnet` | Local tmux | Claude Code CLI | Yes |
| `claude/opus` | Local tmux | Claude Code CLI | Yes |
| `claude/haiku` | Local tmux | Claude Code CLI | Yes |
| `ollama/<model>` | Local tmux | Local Ollama | No |
| `hetzner/claude/sonnet` | Remote SSH | Claude Code CLI on server | Yes |
| `hetzner/claude/opus` | Remote SSH | Claude Code CLI on server | Yes |
| `hetzner/claude/haiku` | Remote SSH | Claude Code CLI on server | Yes |
| `hetzner/qwen2.5:14b` | Remote SSH | Ollama on GPU server | No |
| `hetzner/qwen2.5-coder:14b` | Remote SSH | Ollama on GPU server | No |
| `hetzner/phi4:14b` | Remote SSH | Ollama on GPU server | No |
| `hetzner/llama3.1:8b` | Remote SSH | Ollama on GPU server | No |
| `hetzner/deepseek-r1:14b` | Remote SSH | Ollama on GPU server | No |
| `hetzner/service/stt` | HTTP | Speaches (Whisper turbo) | No |
| `hetzner/service/tts` | HTTP | XTTS-v2 | No |
| `hetzner/service/ocr` | HTTP | Docling + PaddleOCR | No |
| `hetzner/service/embed` | HTTP | BGE-M3 via Ollama | No |

**Parsing rule:** When a model ID starts with `hetzner/`, strip the prefix. If the remainder starts with `claude/`, spawn a remote Claude Code agent. If it's a known Ollama model name (contains `:` or matches known model names), spawn a remote Ollama agent. If it starts with `service/`, make a direct HTTP call.

---

## 4. Routing Table

Decision logic for when to use which agent type and model:

| Scenario | Model ID | Rationale |
|----------|----------|-----------|
| Architecture, deep reasoning | `claude/opus` | Maximum depth, local |
| Implementation, coding (cloud) | `claude/sonnet` | Default quality/speed |
| Batch formatting, listing | `claude/haiku` | Fast, cheap, local |
| Code review, Dutch text analysis | `hetzner/qwen2.5-coder:14b` | GPU speed, zero API cost |
| Long document summarization | `hetzner/qwen2.5:14b` | 20 GB VRAM, no cost |
| Complex reasoning without Claude | `hetzner/deepseek-r1:14b` | Chain-of-thought, free |
| Fast chat / tool use | `hetzner/llama3.1:8b` | 5 GB VRAM, fastest response |
| STEM / math problems | `hetzner/phi4:14b` | Specialized, free |
| Meeting transcription | `hetzner/service/stt` | Whisper large-v3-turbo |
| TTS for Dutch content | `hetzner/service/tts` | XTTS-v2, voice cloning |
| PDF / scan parsing | `hetzner/service/ocr` | Docling + PaddleOCR |
| RAG embeddings | `hetzner/service/embed` | BGE-M3, multilingual |
| Remote task + GPU access | `hetzner/claude/sonnet` | Agent runs ON server, near Ollama |
| Training supervisor | `hetzner/claude/opus` | Deep reasoning + server filesystem |
| Local dev, no internet | `ollama/<model>` | Local Ollama instance |

**Cost optimization rule:** For text-only tasks under 2000 tokens input, prefer `hetzner/<ollama-model>` over `claude/sonnet`. Savings: ~$0.003 per task × volume.

**VRAM budget rule** (RTX 4000 Ada, 20 GB):
- One 14B model active at a time (~9.5 GB)
- BGE-M3 embeddings always loaded alongside (~0.6 GB)
- STT (Speaches) + TTS (XTTS-v2) can run with Llama 3.1 8B (~14 GB total)

---

## 5. Technical Implementation

### 5.1 spawner.py Changes

**File:** `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/spawner.py`

#### 5.1.1 Extend CLAUDE_MODEL_MAP for remote tiers

```python
# Add after existing CLAUDE_MODEL_MAP (line 41)
HETZNER_CLAUDE_MODEL_MAP = {
    "hetzner/claude": None,
    "hetzner/claude/opus": "opus",
    "hetzner/claude/sonnet": "sonnet",
    "hetzner/claude/haiku": "haiku",
}

# Default SSH host alias for Hetzner (configurable via machines.json)
HETZNER_SSH_HOST = "hetzner-agent"
```

#### 5.1.2 Extend spawn_agent() routing for hetzner/ prefix

Insert at the beginning of the model routing block in `spawn_agent()` (after line 207, before the `if model.startswith("ollama/"):` check):

```python
# Route hetzner/* models to spawn_remote_agent
if model.startswith("hetzner/"):
    host = HETZNER_SSH_HOST
    # Check machines config for override
    from .config import get_machine_host
    configured_host = get_machine_host("hetzner")
    if configured_host:
        host = configured_host
    rec = spawn_remote_agent(name, task, host=host, model=model, direct=True)
    # Override tmux_window to indicate remote spawn
    return rec
```

#### 5.1.3 Add _build_remote_ollama_command()

New function for Ollama execution on remote host:

```python
def _build_remote_ollama_command(workspace_path: str, name: str, ollama_model: str) -> str:
    """Build shell command for an Ollama agent running on a remote host.

    Similar to _build_ollama_command but uses the system ollama installation.
    The workspace_path is the REMOTE workspace path (e.g. /tmp/oa-agent-<name>).
    TERM=dumb prevents ANSI spinner codes from polluting output.
    """
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}', ollama_model):
        raise ValueError(f"Invalid Ollama model name: {ollama_model!r}")
    return (
        f"export PATH=\"/root/.local/bin:/usr/local/sbin:/usr/local/bin:"
        f"/usr/sbin:/usr/bin:/sbin:/bin:$PATH\" && "
        f"cd {workspace_path} && "
        f"echo $$ > .oa-pid && "
        f"mkdir -p output && "
        f"TERM=dumb cat CLAUDE.md | ollama run {shlex.quote(ollama_model)} "
        f"2>/dev/null | sed 's/\\x1b\\[[0-9;]*[a-zA-Z]//g' "
        f"> output/result.md; "
        f"touch .done; "
        f"echo '--- Agent {shlex.quote(name)} finished ---'"
    )
```

#### 5.1.4 Extend spawn_remote_agent() for Ollama and hetzner/ prefix

Extend the existing `spawn_remote_agent()` function to handle `hetzner/<model>` model strings:

```python
def spawn_remote_agent(
    name: str,
    task: str,
    host: str,
    model: str = "claude/sonnet",
    direct: bool = True,
) -> AgentRecord:
    """Spawn an agent on a remote host via SSH.

    Extended model support:
    - "claude/sonnet"            → Claude Code CLI (agentic, full tools)
    - "hetzner/claude/sonnet"    → Claude Code CLI on Hetzner (same as above)
    - "hetzner/qwen2.5:14b"      → Ollama model on GPU server (text only)
    - "hetzner/service/*"        → Not handled here; use invoke_hetzner_service()
    """
    # Normalize: strip hetzner/ prefix for processing
    effective_model = model
    is_hetzner_ollama = False
    ollama_model_name = None

    if model.startswith("hetzner/"):
        remainder = model[len("hetzner/"):]
        if remainder.startswith("claude"):
            # Map to claude model: hetzner/claude/sonnet -> claude/sonnet
            effective_model = remainder if remainder.startswith("claude/") else "claude"
        elif remainder.startswith("service/"):
            raise ValueError(
                f"Service agents ({model}) must use invoke_hetzner_service(), not spawn_remote_agent()"
            )
        else:
            # It's a hetzner Ollama model: hetzner/qwen2.5:14b -> qwen2.5:14b
            is_hetzner_ollama = True
            ollama_model_name = remainder

    # Validate agent name
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,61}', name):
        raise RuntimeError(
            f"Invalid agent name '{name}': must match [a-z0-9-], "
            f"start with alphanumeric, max 62 characters."
        )

    existing = get_agent(name)
    if existing and existing.status == "running":
        raise RuntimeError(f"Agent '{name}' is already running.")

    # 1. Create local workspace for state tracking
    local_ws = create_workspace(name, task)
    remote_ws = f"/tmp/oa-agent-{name}"

    # 2. Upload workspace to remote
    sync_workspace_to_remote(host, local_ws, remote_ws)

    # 3. Build remote command based on model type
    if is_hetzner_ollama:
        # Ollama text-only agent on GPU server
        remote_cmd = _build_remote_ollama_command(remote_ws, name, ollama_model_name)
        # Wrap in background execution so SSH returns immediately
        remote_cmd = f"({remote_cmd}) > /dev/null 2>&1 &"
    else:
        # Claude Code agentic agent on remote host
        claude_model = CLAUDE_MODEL_MAP.get(effective_model)
        if claude_model is None and "/" in effective_model:
            claude_model = effective_model.split("/", 1)[1]
        claude_model = _validate_claude_model(claude_model)
        model_flag = f" --model {shlex.quote(claude_model)}" if claude_model else ""
        claude_prompt = shlex.quote(
            "Lees CLAUDE.md en voer de taak uit. "
            "Schrijf al je output naar ./output/ en maak een .done file als je klaar bent."
        )
        # FIX #64: Use remote-specific PATH; wrap in subshell to background properly
        remote_path = "/root/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        remote_cmd = (
            f"export PATH=\"{remote_path}:$PATH\" && "
            f"cd {remote_ws} && "
            f"unset CLAUDECODE && "
            f"mkdir -p output && "
            f"(nohup {CLAUDE_CMD}{model_flag} --dangerously-skip-permissions -p {claude_prompt} "
            f"> output/result.md 2>&1; touch .done) &"  # group + background
        )

    # 4. Execute on remote host via SSH (BatchMode=yes prevents password prompts)
    subprocess.run(["ssh", "-o", "BatchMode=yes", host, remote_cmd], check=True)

    # 5. Register in local state
    rec = AgentRecord(
        name=name,
        task=task,
        workspace=str(local_ws),
        tmux_window=f"remote:{host}",
        model=model,
        status="running",
        created_at=time.time(),
        project_root=None,
        remote_host=host,
        remote_workspace=remote_ws,
    )
    add_agent(rec)
    return rec
```

---

### 5.2 bridge.py Changes

**File:** `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/bridge.py`

#### 5.2.1 Add /api/machines/<id>/models endpoint

This endpoint dynamically queries the Hetzner server for available Ollama models. Add after the existing `/api/machines` GET endpoint (after line 237):

```python
@app.route('/api/machines/<machine_id>/models', methods=['GET'])
def api_machine_models(machine_id: str):
    """List models available on a specific machine.

    For Hetzner machines with Ollama: SSHes to the host and runs 'ollama list'.
    Returns list of model descriptors compatible with the SpawnForm model picker.
    Falls back to static list from machines.json capabilities field.
    """
    from .config import load_machines_config
    machines = load_machines_config()
    machine = next((m for m in machines if m['id'] == machine_id), None)

    if machine is None:
        return jsonify({'error': f"Machine '{machine_id}' not found"}), 404

    # Try dynamic discovery via SSH + ollama list
    host = machine.get('host', '')
    if host and machine.get('capabilities', {}).get('ollama', False):
        try:
            result = subprocess.run(
                ['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5',
                 host, 'ollama list --json 2>/dev/null || ollama list'],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                models = _parse_ollama_list(result.stdout, machine_id)
                return jsonify(models)
        except (subprocess.TimeoutExpired, Exception):
            pass  # Fall through to static capabilities

    # Fall back to static capabilities from machines.json
    static_models = machine.get('capabilities', {}).get('models', [])
    return jsonify([
        {
            'id': f"{machine_id}/{m}",
            'name': m,
            'machine': machine_id,
            'type': 'ollama',
        }
        for m in static_models
    ])


def _parse_ollama_list(output: str, machine_id: str) -> list[dict]:
    """Parse 'ollama list' output into model descriptors."""
    models = []
    for line in output.strip().splitlines():
        # Skip header line
        if line.startswith('NAME') or not line.strip():
            continue
        parts = line.split()
        if parts:
            name = parts[0]
            models.append({
                'id': f"hetzner/{name}",
                'name': name,
                'machine': machine_id,
                'type': 'ollama',
                'size': parts[2] if len(parts) > 2 else None,
            })
    return models
```

#### 5.2.2 Update api_spawn_agent() for hetzner/ model routing

The existing `/api/agents POST` handler (line 200–229) passes `machine` as the SSH host. Update to handle `hetzner/*` models:

```python
@app.route("/api/agents", methods=["POST"])
@require_auth
def api_spawn_agent():
    """Spawn a new agent."""
    data = request.get_json()
    if not data or "task" not in data:
        return jsonify({"error": "Missing 'task' field"}), 400

    task = data["task"]
    name = data.get("name", "")
    model = data.get("model", "claude")
    parent = data.get("parent", None)
    machine = data.get("machine", "")

    if not name:
        name = generate_agent_name(task)

    if not session_exists():
        start_session()

    try:
        # If model has hetzner/ prefix, auto-route to Hetzner regardless of machine field
        if model.startswith("hetzner/"):
            from .config import get_machine_host
            host = machine if machine else (get_machine_host("hetzner") or "hetzner-agent")
            rec = spawn_remote_agent(name, task, host=host, model=model, direct=True)
        elif machine:
            rec = spawn_remote_agent(name, task, host=machine, model=model, direct=True)
        else:
            rec = spawn_agent(name, task, model=model, parent=parent or None)
        return jsonify(_agent_to_dict(rec)), 201
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400
```

---

### 5.3 machines.json Schema Extension

**File:** `~/.oa/machines.json`

Current schema (from `config.py` `DEFAULT_MACHINES`, lines 71–86):

```json
{
  "machines": [
    {
      "id": "local",
      "host": "",
      "description": "Local (tmux)",
      "is_default": true
    },
    {
      "id": "hetzner",
      "host": "hetzner",
      "description": "Hetzner RTX 4000",
      "is_default": false
    }
  ]
}
```

**Extended schema** — add `capabilities` field:

```json
{
  "machines": [
    {
      "id": "local",
      "host": "",
      "description": "Local (tmux)",
      "is_default": true,
      "capabilities": {
        "ollama": false,
        "claude": true,
        "gpu": false,
        "models": [],
        "services": []
      }
    },
    {
      "id": "hetzner",
      "host": "hetzner-agent",
      "description": "Hetzner RTX 4000 Ada — 20 GB VRAM",
      "is_default": false,
      "capabilities": {
        "ollama": true,
        "claude": true,
        "gpu": true,
        "vram_gb": 20,
        "models": [
          "qwen2.5:14b",
          "qwen2.5-coder:14b",
          "phi4:14b",
          "llama3.1:8b",
          "deepseek-r1:14b",
          "bge-m3",
          "nomic-embed-text"
        ],
        "services": [
          {
            "id": "stt",
            "name": "Speaches STT",
            "endpoint": "/api/stt/v1/audio/transcriptions",
            "model": "large-v3-turbo"
          },
          {
            "id": "tts",
            "name": "XTTS-v2",
            "endpoint": "/api/tts/",
            "languages": ["nl", "en", "de", "fr"]
          },
          {
            "id": "ocr",
            "name": "Vision / OCR API",
            "endpoint": "/api/vision/",
            "engines": ["docling", "paddleocr", "marker"]
          },
          {
            "id": "embed",
            "name": "BGE-M3 Embeddings",
            "endpoint": "ollama:11434/api/embed",
            "model": "bge-m3"
          }
        ]
      }
    }
  ]
}
```

**Update `config.py` DEFAULT_MACHINES** to include the capabilities field:

```python
# In config.py, update DEFAULT_MACHINES:
DEFAULT_MACHINES = {
    'machines': [
        {
            'id': 'local',
            'host': '',
            'description': 'Local (tmux)',
            'is_default': True,
            'capabilities': {
                'ollama': False,
                'claude': True,
                'gpu': False,
                'models': [],
                'services': [],
            },
        },
        {
            'id': 'hetzner',
            'host': 'hetzner-agent',
            'description': 'Hetzner RTX 4000 Ada (20 GB VRAM)',
            'is_default': False,
            'capabilities': {
                'ollama': True,
                'claude': True,
                'gpu': True,
                'vram_gb': 20,
                'models': [
                    'qwen2.5:14b', 'qwen2.5-coder:14b', 'phi4:14b',
                    'llama3.1:8b', 'deepseek-r1:14b', 'bge-m3', 'nomic-embed-text'
                ],
                'services': ['stt', 'tts', 'ocr', 'embed'],
            },
        },
    ]
}
```

---

### 5.4 Service-Agent Templates

Service agents wrap direct HTTP calls to Hetzner GPU services. They live in `agents/library/hetzner-services/`.

#### Template: STT Agent

**File:** `agents/library/hetzner-services/stt-transcriber.json`

```json
{
  "id": "hetzner-stt-transcriber",
  "name": "Hetzner STT Transcriber",
  "description": "Transcribes audio files using Speaches (Whisper large-v3-turbo) on the Hetzner GPU server",
  "modelHint": "hetzner/service/stt",
  "category": "hetzner-services",
  "systemPrompt": "Je bent een transcriptie-agent. Gegeven een audiobestand op het lokale bestandssysteem:\n1. Stuur het naar de Speaches API op de Hetzner server: POST https://144.76.60.210/api/stt/v1/audio/transcriptions\n2. Parameters: model=large-v3-turbo, language=nl\n3. Schrijf de transcriptie naar ./output/result.md\n4. Maak .done aan wanneer klaar\n\nVoorbeeldcommando:\ncurl -X POST https://144.76.60.210/api/stt/v1/audio/transcriptions \\\n  -F 'file=@<AUDIO_FILE>' \\\n  -F 'model=large-v3-turbo' \\\n  -F 'language=nl' \\\n  -k | jq '.text' > output/result.md"
}
```

#### Template: OCR Agent

**File:** `agents/library/hetzner-services/ocr-parser.json`

```json
{
  "id": "hetzner-ocr-parser",
  "name": "Hetzner OCR Parser",
  "description": "Extracts text from PDFs and scanned documents using Docling + PaddleOCR on the Hetzner GPU server",
  "modelHint": "hetzner/service/ocr",
  "category": "hetzner-services",
  "systemPrompt": "Je bent een OCR-agent voor het verwerken van documenten.\n\nVoor digitale PDFs:\ncurl -X POST https://144.76.60.210/api/vision/parse-pdf -F 'file=@<PDF>' -k | jq '.markdown'\n\nVoor gescande documenten / foto's:\ncurl -X POST https://144.76.60.210/api/vision/ocr -F 'file=@<IMAGE>' -k | jq '.full_text'\n\nSchrijf output naar ./output/result.md en maak .done aan."
}
```

#### Template: Ollama Researcher

**File:** `agents/library/hetzner-services/ollama-researcher.json`

```json
{
  "id": "hetzner-ollama-researcher",
  "name": "Hetzner Ollama Researcher",
  "description": "Fast text-only research agent using Qwen2.5 14B on the Hetzner GPU server. Zero API cost.",
  "modelHint": "hetzner/qwen2.5:14b",
  "category": "hetzner-services",
  "systemPrompt": "Je bent een onderzoeksagent. Lees CLAUDE.md, voer de taak uit, schrijf een gestructureerd rapport naar output/result.md.\n\nBeperkingen:\n- Geen file I/O buiten je workspace\n- Geen tool use of bash\n- Alleen tekst in/uit\n- Schrijf altijd naar output/result.md\n- Maak .done aan na voltooiing"
}
```

---

## 6. Bug Fixes (Directly Actionable)

### Fix #64: spawn_remote_agent fails on root

**Problem:** In `spawner.py` `spawn_remote_agent()` (line 324–332), the remote command is:

```python
remote_cmd = (
    f"export PATH=\"{_AGENT_PATH}:$PATH\" && "
    f"cd {remote_ws} && "
    f"unset CLAUDECODE && "
    f"mkdir -p output && "
    f"nohup {CLAUDE_CMD}{model_flag} --dangerously-skip-permissions -p {claude_prompt} "
    f"> output/result.md 2>&1; "
    f"touch .done &"               # ← BUG: & applies only to touch, not to nohup
)
```

**Root cause:** The `&` at the end only backgrounds `touch .done`, NOT the `nohup claude` command. The SSH connection in `subprocess.run(["ssh", ..., remote_cmd], check=True)` blocks until the entire shell exits, which means it waits for `nohup claude ...` to complete (potentially hours). For root users specifically, the SSH session may timeout before Claude finishes, causing the process to receive SIGHUP and die.

Additionally, `_AGENT_PATH` uses `$HOME/.local/bin` which is the LOCAL machine's path literal. On a non-interactive SSH session, `$HOME` is expanded on the remote host — but if Claude Code or oa-cli is installed under a different prefix on the server (e.g., `/usr/local/bin` via npm), it won't be found.

**Fix in `spawner.py` — exact change:**

```python
# BEFORE (spawner.py lines 324-332):
remote_cmd = (
    f"export PATH=\"{_AGENT_PATH}:$PATH\" && "
    f"cd {remote_ws} && "
    f"unset CLAUDECODE && "
    f"mkdir -p output && "
    f"nohup {CLAUDE_CMD}{model_flag} --dangerously-skip-permissions -p {claude_prompt} "
    f"> output/result.md 2>&1; "
    f"touch .done &"
)

# AFTER (spawner.py — fix #64):
# Use hardcoded remote PATH that covers root and npm global installs
_REMOTE_PATH = (
    "/root/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
)
remote_cmd = (
    f"export PATH=\"{_REMOTE_PATH}:$PATH\" && "
    f"cd {remote_ws} && "
    f"unset CLAUDECODE && "
    f"mkdir -p output && "
    f"(nohup {CLAUDE_CMD}{model_flag} --dangerously-skip-permissions -p {claude_prompt} "
    f"> output/result.md 2>&1; touch .done) &"  # subshell + background entire group
)
```

**Key changes:**
1. `_REMOTE_PATH` replaces local `_AGENT_PATH` — covers npm global (`/usr/local/bin`) and root local (`/root/.local/bin`)
2. Parentheses `(nohup ...; touch .done)` group the entire sequence as a single subshell
3. `&` at the end backgrounds the entire subshell — SSH returns immediately, agent continues in background
4. `.done` is created AFTER Claude finishes (inside the group, not as a separate `&` command)

**Verification:**
```bash
# Test: SSH returns immediately (< 1 second), agent keeps running
time ssh hetzner-agent "(sleep 5; echo done > /tmp/test-done) &"
# Should return in ~0.1s, not 5s
```

---

### Fix #73: wrong auth header in SpawnForm

**Problem:** In `web/src/components/dashboard/SpawnForm.tsx` (lines 72–79), the machines endpoint is fetched as:

```typescript
useEffect(() => {
  authHeaders().then(headers =>
    fetch('/api/machines', { headers })
      .then(r => r.json())
      .then(data => setMachines(Array.isArray(data) ? data : []))
      .catch(() => {})
  );
}, []);
```

The `authHeaders()` function returns `{ 'X-API-Token': token }` from a cached async fetch to `/api/auth/token`. During component initialization, if the token hasn't been fetched yet (`_cachedToken === null`), `getToken()` fires. If it fails (bridge not ready), `_cachedToken` is set to `''` permanently. Then `authHeaders()` returns `{}` (empty — the conditional `token ? {...} : {}` evaluates falsy for empty string). The `/api/machines` endpoint has `@require_auth`, so it responds `401`. The `.catch(() => {})` silently swallows the error, and the machines dropdown stays empty forever — even after the bridge is ready, because the cache is poisoned with `''`.

**Fix in `SpawnForm.tsx` — exact change:**

```typescript
// BEFORE (SpawnForm.tsx lines 72-79):
useEffect(() => {
  authHeaders().then(headers =>
    fetch('/api/machines', { headers })
      .then(r => r.json())
      .then(data => setMachines(Array.isArray(data) ? data : []))
      .catch(() => {})
  );
}, []);

// AFTER (SpawnForm.tsx — fix #73):
useEffect(() => {
  let cancelled = false;
  const loadMachines = async (retries = 3): Promise<void> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const headers = await authHeaders();
        const r = await fetch('/api/machines', { headers });
        if (!r.ok) {
          // Token may be stale — wait and retry
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }
        const data = await r.json();
        if (!cancelled) setMachines(Array.isArray(data) ? data : []);
        return;
      } catch {
        // Network error — retry after backoff
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  };
  loadMachines();
  return () => { cancelled = true; };
}, []);
```

**Key changes:**
1. Retry loop (3 attempts) with exponential backoff handles bridge startup race
2. Checks `r.ok` before calling `r.json()` — avoids treating `{ error: 'Unauthorized' }` as valid machine list
3. `cancelled` flag prevents `setMachines` call after component unmount (React StrictMode safety)
4. Errors are retried, not silently swallowed

---

## 7. Roadmap

### Sprint 1 (Week 1) — Foundation

Priority: Fix existing bugs, verify Hetzner server prerequisites.

| # | Task | File | Effort |
|---|------|------|--------|
| 1 | Fix #64: remote cmd backgrounding | `spawner.py` | 15 min |
| 2 | Fix #73: machines fetch retry | `SpawnForm.tsx` | 20 min |
| 3 | Install Ollama + models on Hetzner (Phase 1.2) | server-side | 1–2h |
| 4 | Verify `oa run --remote hetzner "echo test"` | integration | 30 min |
| 5 | Update `machines.json` with capabilities field | `~/.oa/machines.json` | 10 min |
| 6 | Update `config.py` DEFAULT_MACHINES | `config.py` | 10 min |

### Sprint 2 (Week 2) — Hetzner Ollama Integration

| # | Task | File | Effort |
|---|------|------|--------|
| 7 | Add `hetzner/` model prefix routing in `spawn_agent()` | `spawner.py` | 1h |
| 8 | Add `_build_remote_ollama_command()` | `spawner.py` | 30 min |
| 9 | Extend `spawn_remote_agent()` for Ollama | `spawner.py` | 1h |
| 10 | Add `/api/machines/<id>/models` endpoint | `bridge.py` | 1h |
| 11 | Update SpawnForm to show Hetzner models dynamically | `SpawnForm.tsx` | 1–2h |
| 12 | Integration test: `oa run "Summarize X" --model hetzner/qwen2.5:14b` | integration | 30 min |

### Sprint 3 (Week 3–4) — Service Agents

| # | Task | File | Effort |
|---|------|------|--------|
| 13 | Install Speaches + XTTS-v2 on Hetzner (Phase 2.1) | server-side | 2h |
| 14 | Install Qdrant + Vision API (Phase 2.2) | server-side | 2h |
| 15 | Create service-agent templates in `agents/library/hetzner-services/` | templates | 1h |
| 16 | Add `oa stt <file>` CLI shortcut | `oa-cli` | 2h |
| 17 | Integration test: audio file → transcription via oa | integration | 30 min |

### Sprint 4 (Phase 3) — LiteLLM + Fine-tuning

| # | Task | File | Effort |
|---|------|------|--------|
| 18 | Deploy LiteLLM gateway on Hetzner | server-side | 1h |
| 19 | Add `hetzner/litellm/<model>` prefix (OpenAI-compat) | `spawner.py` | 1h |
| 20 | First QLoRA fine-tune: bouwregelgeving NL | server-side | 6–10h |
| 21 | Add fine-tuned model to machines.json + Ollama | config | 30 min |

### Phase 4 (Future) — Full Autonomy

- Heartbeat loop: guardian that SSH-checks Hetzner health every 5 min
- VRAM budget enforcer: spawn_remote fails gracefully if GPU is overloaded
- Model auto-discovery: daily cron updates machines.json from `ollama list`
- Multi-GPU scaling: GEX131 (96 GB) if VRAM consistently >90%

---

## Appendix: File Reference

| File | Role in this proposal |
|------|----------------------|
| `oa-cli/src/open_agents/spawner.py` | Fix #64; new `hetzner/` routing; `_build_remote_ollama_command()` |
| `oa-cli/src/open_agents/bridge.py` | New `/api/machines/<id>/models` endpoint |
| `oa-cli/src/open_agents/config.py` | Extended `DEFAULT_MACHINES` with capabilities |
| `oa-cli/web/src/components/dashboard/SpawnForm.tsx` | Fix #73; dynamic Hetzner model picker |
| `~/.oa/machines.json` | Extended schema with capabilities + services |
| `agents/library/hetzner-services/` | New service-agent templates |

---

*Generated by hetzner-architect agent — 2026-03-11*
