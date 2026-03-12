# Hetzner Gap-Analyse — oa-cli vs GPU Server

> **Versie:** 1.0 — 2026-03-12
> **Auteur:** hetzner-gaps agent (claude/sonnet)
> **Doel:** Concrete missing features en configuratie voor optimale oa-cli × Hetzner integratie

---

## Samenvatting

De basisintegratie werkt: `hetzner/*` model routing, VRAM queue (`GpuQueue`), SSH-based workspace sync, remote Ollama agent spawning, en root-detectie zijn geïmplementeerd. De **grootste gaps** zitten in:

1. Collect/polling ontbreekt voor remote agents
2. Model-catalogue is verouderd / onvolledig (Hetzner heeft andere modellen dan de map)
3. `prefer_gpu` is opt-in maar niet documentatie-gedreven
4. Service-layer (LiteLLM, STT, TTS, OCR) is **volledig ongeïntegreerd** in oa-cli
5. VRAM-schattingen dekken niet de Fase 1 modellen op de server

---

## Gap 1 — `oa collect` werkt niet voor remote agents

**Prioriteit: P0 | Impact: Hoog | Implementatietijd: Klein (1-2u)**

| | Detail |
|---|---|
| **Huidige situatie** | `sync_output_from_remote()` en `remote_is_done()` bestaan in `workspace.py` maar worden **nergens aangeroepen** vanuit `oa collect`. `oa collect <naam>` hangt of faalt voor remote agents. |
| **Gewenste situatie** | `oa collect <naam>` detecteert `remote_host` in `AgentRecord`, roept `sync_output_from_remote()` aan, en toont de output zoals bij lokale agents. |
| **Gap** | `commands/agents.py` → `collect` command checkt `AgentRecord.remote_host` niet. |
| **Fix** | In `collect`-command: als `rec.remote_host` gevuld is, roep `remote_is_done()` en `sync_output_from_remote()` aan vóór output tonen. |

---

## Gap 2 — VRAM-schattingen verouderd (Fase 1 + Fase 4 modellen ontbreken)

**Prioriteit: P0 | Impact: Hoog (VRAM contention bij parallel spawnen) | Implementatietijd: Klein (30 min)**

| | Detail |
|---|---|
| **Huidige situatie** | `_VRAM_ESTIMATES` in `spawner.py` bevat: mistral:7b, mistral-nemo, codestral:22b, olmo2:7b, mixtral:8x7b, qwen2.5:14b, qwen2.5:32b, gemma3:27b, llama3.1:8b. **Ontbrekend:** qwen2.5-coder:14b, phi4:14b, deepseek-r1:14b, bge-m3:latest (embeddings). |
| **Gewenste situatie** | Alle modellen die daadwerkelijk op de server draaien (ONBOARDING Stap 1.2 + Fase 4 roadmap) zijn opgenomen met correcte Q4_K_M schattingen. |
| **Gap** | `HETZNER_VRAM_MB` (in `check_hetzner_vram`) en `_VRAM_ESTIMATES` (in `GpuQueue`) zijn twee aparte dicts — inconsistent en dubbel onderhoud. |
| **Fix** | Eén gecombineerde `VRAM_ESTIMATES` dict; voeg toe: `qwen2.5-coder:14b: 9.0`, `phi4:14b: 9.5`, `deepseek-r1:14b: 9.5`, `bge-m3:latest: 1.2`, `nomic-embed-text:latest: 0.3`. Merge `HETZNER_VRAM_MB` in `_VRAM_ESTIMATES`. |

---

## Gap 3 — `gpu_model_map` klopt niet met werkelijke servermodellen

**Prioriteit: P1 | Impact: Hoog (stille routing naar niet-bestaand model) | Implementatietijd: Klein (30 min)**

| | Detail |
|---|---|
| **Huidige situatie** | `config.py` `gpu_model_map` mapt `ollama/phi4-mini → hetzner/phi4:14b`. De server heeft `phi-4` als modelnaam (Ollama-conventie verschilt per versie). Map bevat ook `hetzner/llama3.1:8b` — correct. |
| **Gewenste situatie** | Elke mapping verwijst naar een model dat `ollama list` op de server toont. Discrepantie = stille fout (GpuQueue defaultt naar 10GB, ollama faalt met "model not found"). |
| **Gap** | Geen runtime validatie van `gpu_model_map` tegen werkelijke `ollama list` output. |
| **Fix** | `oa machines validate` subcommand: SSH naar elke machine, voer `ollama list` uit, vergelijk met `gpu_model_map` en rapporteer ontbrekende modellen. Correcte namen op basis van ONBOARDING: `llama3.1:8b`, `qwen2.5:14b`, `qwen2.5-coder:14b`, `phi4:14b`, `deepseek-r1:14b`. |

---

## Gap 4 — Service-laag volledig ongeïntegreerd (LiteLLM, STT, TTS, OCR, Qdrant)

**Prioriteit: P1 | Impact: Hoog (hele Fase 2/3 stack onbereikbaar voor agents) | Implementatietijd: Groot (4-8u)**

| | Detail |
|---|---|
| **Huidige situatie** | De server draait: LiteLLM (:4000), Speaches/Whisper (:8080), XTTS-v2 (:8001), OCR (:8002), Qdrant (:6333), n8n (:5678), MLflow (:5000). Spawner.py kent alleen `hetzner/claude/*` en `hetzner/<ollama-model>` — geen service routing. `invoke_hetzner_service()` bestaat als exception in spawner.py maar is **niet geïmplementeerd**. |
| **Gewenste situatie** | Agents kunnen aanroepen: `oa service hetzner/stt transcribe --file audio.wav`, `oa service hetzner/embed --text "..."`, `oa service hetzner/ocr --file doc.pdf`. |
| **Gap** | `hetzner/service/*` gooit een `ValueError` — de code is een stub. Geen SSH-tunnel management voor lokale poortforwarding. Agents schrijven nu handmatig SSH-tunnel commands in hun task-prompt. |
| **Fix (stap 1)** | `invoke_hetzner_service(service, method, **kwargs)`: SSH-tunnel opzetten (of hergebruiken), HTTP call via requests naar forwarded poort, resultaat terugsturen. |
| **Fix (stap 2)** | `oa service <machine>/<service> <method>` CLI command + documentatie. |
| **Workaround nu** | Agent-prompt bevat expliciete SSH-tunnel instructies + curl calls. Werkt maar is foutgevoelig. |

---

## Gap 5 — Geen `oa status --remote` / geen live monitoring van Hetzner agents

**Prioriteit: P1 | Impact: Medium | Implementatietijd: Klein (1-2u)**

| | Detail |
|---|---|
| **Huidige situatie** | `oa status` toont `remote:hetzner-agent` als tmux_window maar kan niet live output zien (geen tmux op Hetzner voor oa-cli agents — ze draaien als nohup background process). `remote_is_done()` bestaat maar is niet geïntegreerd in `status` command. |
| **Gewenste situatie** | `oa status` toont voor remote agents: running/done status (via `.done` check over SSH), plus optioneel `tail -20 output/result.md` als live preview. |
| **Gap** | `commands/agents.py` → `status` command itereert over `AgentRecord` maar doet geen SSH-check voor remote agents. |
| **Fix** | In status-loop: als `rec.remote_host`, doe asynchrone SSH-check op `.done`; toon `[remote: checking...]` of `[done]` afhankelijk van resultaat. |

---

## Gap 6 — `machines.json` default SSH host `hetzner` vs ONBOARDING alias `hetzner-<naam>`

**Prioriteit: P2 | Impact: Medium (multi-user setup) | Implementatietijd: Minimaal (docs + config)**

| | Detail |
|---|---|
| **Huidige situatie** | `machines.json` default heeft `host: "hetzner"`. ONBOARDING.md beschrijft alias `hetzner-<naam>` per gebruiker. Spawner.py fallback is `HETZNER_SSH_HOST = "hetzner-agent"`. Drie verschillende defaults — inconsistent. |
| **Gewenste situatie** | ONBOARDING en `machines.json` template zijn synchroon: gebruiker configureert één alias in `~/.ssh/config`, één regel in `machines.json`. |
| **Fix** | `oa init` of `oa machines add hetzner --host hetzner-freek` wizard; update ONBOARDING.md stap 3 zodat het `machines.json` in plaats van `config.json` toont (beide werken, maar machines.json is de nieuwe standaard). |

---

## Gap 7 — Root-check mist non-root pad voor Ollama agents

**Prioriteit: P2 | Impact: Laag (edge case) | Implementatietijd: Klein**

| | Detail |
|---|---|
| **Huidige situatie** | Root-check (`id -u` SSH call) wordt overgeslagen voor `is_hetzner_ollama = True`. Dit klopt — Ollama heeft geen `--dangerously-skip-permissions`. Maar `_build_remote_ollama_command` gebruikt `remote_path` die `/root/.local/bin` bevat — dit pad bestaat niet voor niet-root users. |
| **Gewenste situatie** | Remote PATH is dynamisch op basis van de werkelijke user op de server. |
| **Fix** | `remote_path = f"/home/{remote_user}/.local/bin:..."` als `remote_uid != "0"`, anders `/root/.local/bin`. Remote user opslaan in `AgentRecord`. |

---

## Gap 8 — `prefer_gpu` is opt-in, niet gedocumenteerd als aanbevolen default

**Prioriteit: P3 | Impact: Laag | Implementatietijd: Minimaal (docs)**

| | Detail |
|---|---|
| **Huidige situatie** | `prefer_gpu: false` is de default. CONSTRAINTS.md zegt: *"Hoofdsessie Claude NOOIT gebruiken voor bulk, uitvoering of batch als de GPU server beschikbaar is"* (routing regel D-008). Deze regel staat niet in oa-cli code/docs. |
| **Gewenste situatie** | Als Hetzner beschikbaar is, wordt `prefer_gpu: true` aanbevolen in setup-docs/`oa init`. |
| **Fix** | `oa init` vraagt: "Heb je een remote GPU? → stel prefer_gpu: true in". Voeg toe aan ONBOARDING.md stap 3. |

---

## Prioriteitstabel

| # | Gap | Prioriteit | Impact | Implementatietijd |
|---|-----|-----------|--------|-------------------|
| 1 | `oa collect` werkt niet voor remote agents | **P0** | Hoog — workflow breekt | 1-2u |
| 2 | VRAM-schattingen onvolledig | **P0** | Hoog — stille VRAM contention | 30 min |
| 3 | `gpu_model_map` niet gevalideerd vs server | **P1** | Hoog — stille routing fouten | 30 min + 2u voor command |
| 4 | Service-laag stub (LiteLLM/STT/TTS/OCR) | **P1** | Hoog — Fase 2/3 onbereikbaar | 4-8u |
| 5 | `oa status` geen remote monitoring | **P1** | Medium — zichtbaarheid | 1-2u |
| 6 | SSH alias inconsistentie | **P2** | Medium — multi-user verwarring | Minimaal (docs) |
| 7 | Remote PATH hard-coded `/root/` | **P2** | Laag — edge case non-root Ollama | 30 min |
| 8 | `prefer_gpu` niet aanbevolen als default | **P3** | Laag — UX | Minimaal (docs) |

---

## Aanbevolen implementatievolgorde

**Sprint 1 (snel winst, <4u totaal):**
1. Fix `oa collect` voor remote agents — breekpunt in huidige workflow
2. Merge + aanvullen VRAM dicts — voorkomt stille contention
3. Correcte `gpu_model_map` vullen op basis van `ollama list` output

**Sprint 2 (monitoring, <4u):**
4. `oa status` remote check via SSH
5. SSH alias documentatie sync (ONBOARDING + machines.json)

**Sprint 3 (service-laag, 4-8u):**
6. `invoke_hetzner_service()` implementeren
7. `oa service` CLI command
8. SSH-tunnel lifecycle management

---

## Werkende workarounds (nu)

| Behoefte | Workaround |
|----------|-----------|
| Collect remote output | `ssh hetzner-<naam> "cat /tmp/oa-agent-<naam>/output/result.md"` |
| Monitor remote agent | `ssh hetzner-<naam> "ls /tmp/oa-agent-<naam>/.done 2>/dev/null && echo DONE"` |
| LiteLLM API gebruiken | `ssh -L 4000:localhost:4000 hetzner-<naam>` → `curl localhost:4000/v1/...` |
| STT transcriptie | `ssh -L 8080:localhost:8080 hetzner-<naam>` → whisper API via tunnel |
| VRAM check | `ssh hetzner-<naam> "nvidia-smi --query-gpu=memory.free,memory.used --format=csv"` |
| Ollama status | `ssh hetzner-<naam> "ollama ps"` |
