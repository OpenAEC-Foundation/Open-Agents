# Hetzner × Open-Agents — Integratiebeoordeling

> **Datum:** 2026-03-12
> **Agent:** hetzner-analyzer
> **Scope:** Hoe werkt de Hetzner GPU server samen met oa-cli? Huidige staat, gaten, aanbevelingen.

---

## 1. Huidige Staat

### 1.1 Server Status (V1 Operationeel — 2026-03-11)

De Hetzner GPU server is volledig operationeel. Alle geplande Fase 1-3 services draaien:

**Docker Containers (7 actief):**

| Service | Poort | Fase | Status |
|---------|-------|------|--------|
| Open WebUI | 3000 | 1 | ✅ Actief |
| Speaches (STT) | 8080 | 2 | ✅ Actief |
| Qdrant (vector DB) | 6333 | 2 | ✅ Actief |
| XTTS-v2 (TTS) | 8001 | 2 | ✅ Actief |
| OCR Service | 8002 | 2 | ✅ Actief |
| LiteLLM gateway | 4000 | 3 | ✅ Actief |
| n8n (automation) | 5678 | 3 | ✅ Actief |

**Systemd services:** Ollama (:11434), Nginx (:80/:443), MLflow (:5000), Netdata (:19999)
**Extra:** Claude Code CLI ✅, oa-cli ✅, tmux ✅, Miniconda + aec-ml env ✅

**LLM Modellen in Ollama:**

| Model | VRAM (Q4_K_M) | Gebruik |
|-------|--------------|---------|
| qwen2.5:14b | ~9.5 GB | Generalist, Nederlands |
| qwen2.5-coder:14b | ~9.5 GB | Code, debugging |
| phi4:14b | ~9.5 GB | STEM, redenering |
| llama3.1:8b | ~5.0 GB | Snelle chat, tool use |
| deepseek-r1:14b | ~9.2 GB | Complexe redenering |
| bge-m3 | ~0.6 GB | RAG embeddings |
| nomic-embed-text | ~0.3 GB | Embeddings |

---

### 1.2 oa-cli Integratie: Hoe Hetzner-modellen Aangesproken Worden

De integratie in `spawner.py` werkt via **model-prefix routing**:

```python
# spawner.py — routing logica (vereenvoudigd)

# 1. hetzner/* prefix → spawn_remote_agent()
if model.startswith("hetzner/"):
    host = get_machine_host("hetzner") or HETZNER_SSH_HOST  # "hetzner-agent"
    return spawn_remote_agent(name, task, host=host, model=model, direct=True)

# 2. prefer_gpu config → redirect ollama/* naar hetzner/
if cfg.get("prefer_gpu") and model.startswith("ollama/"):
    model = gpu_map.get(model, f"hetzner/{model.split('/', 1)[1]}")
```

**Model-prefix patronen:**

| Prefix | Gedrag | Voorbeeld |
|--------|--------|-----------|
| `hetzner/claude/sonnet` | Claude Code CLI op Hetzner server | Agentic werk met bestandstoegang |
| `hetzner/qwen2.5:14b` | Ollama tekst-agent op GPU | Tekst-in/tekst-uit, geen tools |
| `hetzner/qwen2.5-coder:14b` | Ollama code-model op GPU | Code generatie zonder file I/O |
| `ollama/*` + `prefer_gpu=true` | Auto-redirect naar Hetzner | Transparante GPU-routing |

**VRAM Guard (GpuQueue — L-088):**

```python
# Vóór spawn van Hetzner Ollama-agent: check VRAM beschikbaarheid
_gpu_queue.wait_for_vram(host, ollama_model_name)

# Intern: pollt 'ollama ps' via SSH totdat er genoeg VRAM vrij is
# Timeout: 600 seconden, dan RuntimeError
```

**Root-check (D-074):**

```python
# Hetzner server draait als root → Claude Code blokkeert dit (#64)
# spawner.py detecteert dit vóór spawn:
uid_result = subprocess.run(["ssh", host, "id -u"], ...)
if remote_uid == "0":
    raise RuntimeError("Remote host is root. Claude Code blokkeert --dangerously-skip-permissions voor root.")
```

---

### 1.3 SSH Tunnel Setup (lokaal → Hetzner Ollama)

**Eénmalige tunnel voor alle services:**

```bash
# ~/.ssh/config — aanbevolen alias
Host hetzner-agent
    HostName 144.76.60.210
    User oa-agent          # NIET root — zie §2.1
    IdentityFile ~/.ssh/hetzner_key
    StrictHostKeyChecking accept-new

# Alle services tegelijk forwarden:
ssh -NT \
  -L 11434:localhost:11434 \  # Ollama API
  -L 4000:localhost:4000 \    # LiteLLM gateway
  -L 3000:localhost:3000 \    # Open WebUI
  -L 6333:localhost:6333 \    # Qdrant
  -L 5000:localhost:5000 \    # MLflow
  hetzner-agent
```

**Na tunnel: Ollama direct aanspreken vanuit WSL:**

```bash
# Test via tunnel
curl http://localhost:11434/api/generate \
  -d '{"model":"qwen2.5:14b","prompt":"Hallo","stream":false}' | jq '.response'

# LiteLLM gateway (OpenAI-compatible, alle modellen via één endpoint)
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-litellm-master" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:14b","messages":[{"role":"user","content":"Hallo"}]}'
```

**oa run commando's die Hetzner-modellen gebruiken:**

```bash
# Type A: Claude Code agent op Hetzner (agentic, met bestandstoegang)
oa run "Analyseer Ollama model performance op de GPU server" \
  --name hetzner-claude-1 \
  --model hetzner/claude/sonnet \
  --direct

# Type B: Ollama tekst-agent op GPU (sneller, goedkoper, geen tools)
oa run "Samenvatting van dit document: $(cat document.txt)" \
  --name hetzner-qwen-1 \
  --model hetzner/qwen2.5:14b \
  --direct

# Type B: Code-model voor snelle codegeneratie
oa run "Schrijf een Python functie die IFC-bestanden inleest en ruimtenamen extraheert" \
  --name hetzner-coder-1 \
  --model hetzner/qwen2.5-coder:14b \
  --direct

# Type B: Redenering-intensief werk (deepseek chain-of-thought)
oa run "Analyseer deze architectuurtekening en identificeer bouwkundige bezwaren: ..." \
  --name hetzner-reason-1 \
  --model hetzner/deepseek-r1:14b \
  --direct

# Prefer-GPU modus: automatische redirect van lokale ollama/* naar Hetzner
# ~/.oa/config.json: {"prefer_gpu": true, "gpu_model_map": {"ollama/qwen2.5:14b": "hetzner/qwen2.5:14b"}}
oa run "Taakbeschrijving" --name agent-1 --model ollama/qwen2.5:14b --direct
# → oa-cli redirect dit automatisch naar hetzner/qwen2.5:14b
```

---

## 2. Gaten in de Integratie

### 2.1 Root-User Blokkade (KRITIEK — Issue #64)

**Probleem:** De Hetzner server draait als `root`. Claude Code blokkeert `--dangerously-skip-permissions` voor root. Dit maakt Type A agents (Claude Code op Hetzner) onbruikbaar totdat een non-root user aangemaakt wordt.

**Impact:** `spawn_remote_agent()` gooit `RuntimeError` bij UID=0. Alle `hetzner/claude/*` agent spawns falen.

**Fix vereist op server:**
```bash
# Op de Hetzner server (eénmalig):
adduser oa-agent
usermod -aG sudo oa-agent
# SSH key toevoegen:
mkdir -p /home/oa-agent/.ssh
cp /root/.ssh/authorized_keys /home/oa-agent/.ssh/
chown -R oa-agent:oa-agent /home/oa-agent/.ssh
chmod 700 /home/oa-agent/.ssh

# Lokaal SSH config bijwerken:
# Host hetzner-agent → User oa-agent
```

---

### 2.2 VRAM-tabel Incompleet (MEDIUM)

**Probleem:** `_VRAM_ESTIMATES` in `spawner.py` mist de daadwerkelijk geïnstalleerde modellen.

**Huidige tabel bevat:** mistral:7b, olmo2:7b, codestral:22b, qwen2.5:14b ✅, qwen2.5:32b ✅, llama3.1:8b ✅
**Ontbreekt (geïnstalleerd op server):**

| Model | VRAM (GB) | Toe te voegen aan _VRAM_ESTIMATES |
|-------|-----------|----------------------------------|
| `phi4:14b` | 9.5 | `"phi4:14b": 9.5` |
| `deepseek-r1:14b` | 9.2 | `"deepseek-r1:14b": 9.2` |
| `qwen2.5-coder:14b` | 9.5 | `"qwen2.5-coder:14b": 9.5` |
| `bge-m3` | 0.6 | `"bge-m3": 0.6` |
| `nomic-embed-text` | 0.3 | `"nomic-embed-text": 0.3` |

**Fix in spawner.py:**
```python
_VRAM_ESTIMATES: dict[str, float] = {
    # ... bestaande entries ...
    "phi4:14b": 9.5,
    "deepseek-r1:14b": 9.2,
    "qwen2.5-coder:14b": 9.5,
    "bge-m3": 0.6,
    "bge-m3:latest": 0.6,
    "nomic-embed-text": 0.3,
    "nomic-embed-text:latest": 0.3,
}
```

---

### 2.3 Service-Agents Niet Geïmplementeerd (MEDIUM — D-076)

**Probleem:** `spawner.py` refereert aan `hetzner/service/*` prefix en `invoke_hetzner_service()`, maar deze functie bestaat niet in de codebase. De running services (STT op :8080, TTS op :8001, OCR op :8002) zijn niet aanroepbaar vanuit oa agents.

**Wat ontbreekt:**
- `invoke_hetzner_service()` functie in spawner.py
- Definitie van `hetzner/service/stt`, `hetzner/service/tts`, `hetzner/service/ocr` routes
- Agent-template voor document-processing pipelines via Hetzner services

**Gewenste interface (oa run):**
```bash
# STT transcriptie via Hetzner service
oa run "Transcribeer audio naar tekst" \
  --name stt-job-1 \
  --model hetzner/service/stt \
  --input /pad/naar/audio.wav \
  --direct

# OCR van document
oa run "Extraheer tekst uit PDF" \
  --name ocr-job-1 \
  --model hetzner/service/ocr \
  --input /pad/naar/document.pdf \
  --direct
```

---

### 2.4 SSH Tunnel Niet Geautomatiseerd (LAAG)

**Probleem:** De SSH tunnel naar Hetzner is handmatig. Bij Ollama-via-tunnel gebruik moet de ontwikkelaar zelf de tunnel openhouden. Er is geen oa-cli commando voor `oa tunnel start hetzner`.

**Workaround:** Via `~/.oa/config.json` `prefer_gpu=true` routes automatisch naar Hetzner zonder tunnel (direct via SSH spawn). Voor directe API-toegang (LiteLLM, Qdrant) is tunnel nog steeds handmatig.

---

### 2.5 LiteLLM Gateway Niet Benut in oa-cli (MEDIUM)

**Probleem:** LiteLLM draait op Hetzner (:4000) en biedt OpenAI-compatibele toegang tot alle Ollama-modellen via één endpoint. oa-cli gebruikt dit gateway niet — het bypasses LiteLLM en spreekt Ollama direct aan via SSH-spawned processes.

**Voordeel van LiteLLM-routing:**
- Fallback logica (Ollama down → cloud API)
- Rate limiting en logging
- Geen SSH-overhead voor tekst-queries

**Hoe te benutten (na tunnel):**
```bash
# In ~/.oa/config.json:
{
  "litellm_endpoint": "http://localhost:4000",
  "litellm_key": "sk-litellm-master"
}

# Dan: oa run met litellm/ prefix (nog te implementeren)
oa run "Taak" --name agent-1 --model litellm/qwen2.5:14b --direct
```

---

### 2.6 VRAM Multi-Agent Contention (MEDIUM — L-088)

**Probleem:** GpuQueue lost VRAM-contention op voor Hetzner Ollama-agents, maar de timeout (600s) is lang voor productiegebruik. Bovendien laadt Open WebUI ook modellen in VRAM — dit wordt niet meegeteld in `_parse_ollama_ps()`.

**Concreet risico:**
```
Situatie: Open WebUI heeft qwen2.5:14b geladen (~9.5 GB)
          oa agent wil ook qwen2.5:14b spawnen
          ollama ps toont 0 GB (Open WebUI gebruikt eigen context)
          → VRAM-check klopt niet → contention
```

**Aanbeveling:** `nvidia-smi` check gebruiken naast `ollama ps`:
```python
def check_hetzner_vram(host: str, model_id: str) -> tuple[bool, str]:
    # nvidia-smi geeft absolute VRAM vrij, ongeacht welk proces
    result = subprocess.run([
        "ssh", host,
        "nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits"
    ], ...)
    free_mb = int(result.stdout.strip())
    # ... rest van check
```

---

## 3. Aanbevelingen (Prioriteit)

### P0 — Non-root user aanmaken (blocker voor Type A agents)
```bash
# Server:
adduser oa-agent && usermod -aG sudo oa-agent
# Lokaal SSH config: User oa-agent voor hetzner-agent alias
```

### P1 — VRAM-tabel completeren in spawner.py
Voeg phi4:14b, deepseek-r1:14b, qwen2.5-coder:14b, bge-m3, nomic-embed-text toe aan `_VRAM_ESTIMATES`.

### P1 — SSH config alias documenteren in Open-Agents CLAUDE.md
```
Host hetzner-agent
    HostName 144.76.60.210
    User oa-agent
    IdentityFile ~/.ssh/hetzner_key
```

### P2 — invoke_hetzner_service() implementeren (D-076 Type C)
Minimale implementatie voor STT, OCR en TTS als oa-cli commando's.

### P2 — prefer_gpu en gpu_model_map documenteren
In Open-Agents/docs/ een HETZNER.md schrijven met exacte config-voorbeelden.

### P3 — LiteLLM-routing in oa-cli (D-076 Type B uitbreiding)
`litellm/` prefix toevoegen dat via de Hetzner tunnel gaat.

---

## 4. VRAM Budget — Multi-Agent Workloads

Met 20 GB VRAM zijn de volgende parallelle oa-agent configuraties veilig:

| Scenario | Agents | VRAM gebruik |
|----------|--------|-------------|
| 2× qwen2.5:14b parallel | Niet mogelijk | 19 GB — krap, risico contention |
| 1× qwen2.5:14b + 1× llama3.1:8b | Mogelijk | ~14.5 GB ✅ |
| 1× phi4:14b + bge-m3 embedding agent | Mogelijk | ~10.1 GB ✅ |
| 3× llama3.1:8b | Mogelijk | ~15 GB ✅ |
| 1× deepseek-r1:14b + STT (Speaches) | Mogelijk | ~15.2 GB ✅ |
| qwen2.5:32b solo | Max 1 agent | ~19.5 GB ⚠️ krap |

**Regel voor multi-agent workloads op Hetzner:**
- Modellen ≤8B: max 3 parallel
- Modellen 14B: max 1 parallel (met ruimte voor embeddings)
- Modellen 32B: altijd solo

**GpuQueue is de safety valve** — als VRAM vol is, wacht de queue automatisch. Maar bij lange waachttijden (>10 min): overweeg sequentieel spawnen of kleinere modellen.

---

*Analyse gegenereerd: 2026-03-12 | Agent: hetzner-analyzer | Model: claude/sonnet*
