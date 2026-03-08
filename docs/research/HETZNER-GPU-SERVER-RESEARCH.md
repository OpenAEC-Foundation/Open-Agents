# Hetzner GPU Server Research — Open-Agents Infrastructure

> **Datum**: 2026-03-07
> **Auteur**: Freek Heijting (met Claude Code research)
> **Status**: Onderzoek / Besluitvorming
> **Doel**: Juiste Hetzner GPU-server kiezen voor agentic AI platform

---

## 1. Context & Visie

### Wat we bouwen
Een **agentic layer** bovenop dedicated hardware. Dit platform wordt aangeboden aan klanten:
- Klant doet een verzoek → automatisch wordt een **orchestrator agent** gespawned
- Orchestrator spawnt **specialistische atomaire agents** (code, docs, devops, etc.)
- Agents draaien op een combinatie van **cloud APIs** (Claude, OpenAI) en **lokale LLMs** (Ollama)

### Waarom eigen hardware
- **Kosten**: Claude Code subscription vs. per-API-call — eigen LLMs voor repetitieve taken
- **Privacy**: Klantdata blijft op eigen servers in Duitsland (GDPR)
- **Flexibiliteit**: Elk model draaien dat we willen (open source, fine-tuned, custom)
- **Onafhankelijkheid**: Niet 100% afhankelijk van Anthropic/OpenAI uptime en pricing

### Schaalbaarheid
- **Korte termijn**: Onderzoek & development, weinig productie-load
- **Middellange termijn**: Eerste klanten, moderate workloads
- **Lange termijn**: Veel klanten, hoge concurrency, mogelijk meerdere servers
- **Vraag**: Kan dit modulair groeien? → Ja, zie Sectie 6.

### Idle Resources
Als er geen klant-workloads draaien:
- **Optie A**: GPU compute verhuren via Vast.ai / RunPod marketplace
- **Optie B**: Pre-compute embeddings, fine-tune modellen, benchmark testen
- **Optie C**: Distributed computing (Folding@Home, wetenschappelijk)
- **Optie D**: Crypto mining — **NIET rendabel met GPUs** voor Bitcoin (SHA-256 vereist ASICs), wél marginaal voor Ethereum-achtige PoW coins, maar ROI is twijfelachtig
- **Aanbeveling**: Optie A (compute verhuren) of B (eigen modellen verbeteren) zijn het meest waardevol

---

## 2. Hetzner GPU Server Aanbod (maart 2026)

Hetzner biedt **drie dedicated GPU-servers** (bare metal, geen virtuele GPU instances):

### Overzicht

| Model | GPU | VRAM | CPU | RAM | Storage | Prijs/maand | Setup |
|-------|-----|------|-----|-----|---------|-------------|-------|
| **GEX44** | RTX 4000 SFF Ada | **20 GB** GDDR6 ECC | i5-13500 (14 cores) | 64 GB DDR4 | 2×1.92TB NVMe | **€184** | €264-312 |
| **GEX130** | RTX 6000 Ada | **48 GB** GDDR6 ECC | Xeon Gold 5412U (24c/48t) | 128 GB DDR5 ECC | 2×1.92TB NVMe | **€838** | €79 |
| **GEX131** | RTX PRO 6000 Blackwell | **96 GB** GDDR7 ECC | Xeon Gold 5412U (24c/48t) | 256 GB DDR5 ECC | 2×960GB NVMe | **€889** | €1.555 |

### ⚠️ Prijsverhoging per 1 april 2026
Hetzner verhoogt prijzen met 3-37% door stijgende DRAM-kosten. De GEX44 gaat naar ~€212/maand. **Bestel vóór 1 april** om huidige prijzen te locken.

### Belangrijke beperkingen
- **Eén GPU per server** — geen multi-GPU configuraties mogelijk
- **Alleen in Duitsland** — Falkenstein (alle modellen) en Nuremberg (GEX130/131)
- **Geen cloud GPUs** — alles is bare metal
- **Geen NVLink** — geen GPU-naar-GPU interconnect

---

## 3. Welke Modellen Passen op Welke Server?

### VRAM Vereisten per Model (Ollama/vLLM)

| Model | Parameters | Q4 (4-bit) | Q8 (8-bit) | FP16 (vol) | Past op |
|-------|-----------|------------|------------|------------|---------|
| Llama 3.2 3B | 3B | ~2 GB | ~3 GB | ~6 GB | GEX44 ✅ |
| Mistral 7B | 7B | ~4 GB | ~7 GB | ~14 GB | GEX44 ✅ |
| Llama 3 8B | 8B | ~4 GB | ~7 GB | ~14 GB | GEX44 ✅ |
| CodeLlama 13B | 13B | ~7 GB | ~13 GB | ~26 GB | GEX44 ✅ (Q4/Q8) |
| DeepSeek-Coder-V2 | 236B (21B actief, MoE) | ~12 GB | ~21 GB | ~42 GB | GEX44 ✅ (Q4), GEX130 ✅ |
| Qwen 2.5 Coder 32B | 32B | ~18 GB | ~32 GB | ~64 GB | GEX44 ❌, GEX130 ✅ (Q4/Q8) |
| Llama 3 70B | 70B | ~35-42 GB | ~70 GB | ~140 GB | GEX130 ✅ (Q4), GEX131 ✅ (Q4/Q8) |
| Llama 3.1 405B | 405B | ~230 GB | ~405 GB | ~972 GB | ❌ Geen Hetzner optie |

### Andere AI-modellen

| Model Type | VRAM Nodig | Past op GEX44 | Past op GEX130 | Past op GEX131 |
|------------|-----------|:------------:|:-------------:|:-------------:|
| Stable Diffusion XL | 8-16 GB | ✅ | ✅ | ✅ |
| FLUX.1 (image gen) | 16-24 GB | ⚠️ krappe | ✅ | ✅ |
| Whisper Large-v3 (speech) | ~10 GB | ✅ | ✅ | ✅ |
| Text embeddings | 2-4 GB | ✅ | ✅ | ✅ |
| Video generation | 16-48 GB | ❌ | ✅ | ✅ |

---

## 4. Wat is Nodig voor Ons Platform?

### Component 1: Lokale LLM Inference (Ollama)
- **Doel**: Open source modellen draaien voor klant-agents
- **Bottleneck**: GPU VRAM (hoe groter het model, hoe meer VRAM)
- **Aanbeveling**: Minimaal 48 GB VRAM om 70B-modellen in Q4 te kunnen draaien

### Component 2: Claude Code CLI (API-based agents)
- **Doel**: Orchestratie en complexe taken via Anthropic API
- **Bottleneck**: Netwerk + API rate limits, NIET lokale hardware
- **Vereisten**: CPU 4+ cores, 8+ GB RAM, stabiele internetverbinding
- **Per agent**: ~200-500 MB RAM, ~0.1-0.5 CPU core

### Component 3: Agent Orchestratie (oa-cli / tmux)
- **Doel**: Meerdere agents parallel draaien
- **Vereisten per 10 agents**: 2-5 GB RAM, 2-4 CPU cores
- **Vereisten per 20 agents**: 4-10 GB RAM, 4-8 CPU cores
- **De GEX130/131 met 128-256 GB RAM kan 50+ agents simultaan aan**

### Component 4: Hugging Face / Multimedia
- **Doel**: Image generation, speech-to-text, embeddings, etc.
- **Vereisten**: Varieert sterk per model (2-48 GB VRAM)
- **Kan naast LLM draaien** als er voldoende VRAM beschikbaar is

---

## 5. Aanbeveling: Welke Server?

### 🏆 Winner: GEX131 — RTX PRO 6000 Blackwell (96 GB)

| Criterium | GEX44 (€184) | GEX130 (€838) | GEX131 (€889) |
|-----------|:------------:|:-------------:|:--------------:|
| 70B modellen draaien | ❌ | ✅ Q4 only | ✅ Q4 én Q8 |
| 32B code modellen | ❌ | ✅ | ✅ |
| Meerdere modellen tegelijk | ❌ | ⚠️ beperkt | ✅ ruimte over |
| Image generation + LLM tegelijk | ❌ | ⚠️ | ✅ |
| Toekomstbestendig | ❌ | ⚠️ | ✅ |
| Prijs/VRAM verhouding | €9.20/GB | €17.46/GB | **€9.26/GB** |
| Tensor Performance | 307 TFLOPS | 1.457 TFLOPS | **3.511 TFLOPS** |
| RAM | 64 GB | 128 GB | **256 GB** (uitbreidbaar tot 768 GB) |

**Waarom GEX131 en niet GEX130?**
- Slechts €51/maand meer (+6%)
- **Dubbele VRAM** (96 vs 48 GB)
- **2.4× snellere tensor performance**
- **Dubbele RAM** (256 vs 128 GB)
- Nieuwere architectuur (Blackwell vs Ada)
- Uitbreidbaar tot 768 GB RAM

**Waarom niet GEX44?**
- 20 GB VRAM is te weinig voor serieuze modellen (max 13B)
- Consumer-grade CPU (i5 vs Xeon)
- Alleen 64 GB RAM
- Wél goed als **goedkope tweede server** voor simple taken

### Alternatief: Start met GEX44, upgrade later

Als het budget nu een issue is:

| Fase | Server | Kosten | Wat je kunt doen |
|------|--------|--------|-----------------|
| **Nu (R&D)** | GEX44 | €184/mo | 7B-13B modellen testen, platform bouwen, Claude Code agents |
| **Q2 2026** | GEX131 | €889/mo | 70B modellen, klanten bedienen, volledige stack |
| **Later** | GEX131 + GEX44 | €1.073/mo | Dedicated inference (131) + orchestratie (44) |

---

## 6. Modulair Opschalen — Hoe Werkt Dat?

### Horizontaal schalen (meerdere servers)

Hetzner maakt het makkelijk om servers toe te voegen:
1. **Nieuwe server bestellen** (GEX44/130/131) — beschikbaar binnen uren
2. **Intern netwerk** via Hetzner vSwitch (private VLAN tussen servers)
3. **Load balancing** met oa-cli: routeer modellen naar de juiste server
4. **Per-uur billing** beschikbaar — spin op/neer op basis van demand

### Architectuur bij meerdere servers

```
                    ┌─────────────────┐
                    │   Load Balancer  │
                    │  (oa-cli router) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────┴───────┐ ┌───┴──────────┐ ┌─┴────────────┐
     │   GEX131 #1    │ │  GEX131 #2   │ │   GEX44      │
     │ 96GB VRAM      │ │ 96GB VRAM    │ │ 20GB VRAM    │
     │ 70B LLM        │ │ 70B LLM      │ │ 7B/13B LLM   │
     │ Primary        │ │ Overflow     │ │ Light tasks   │
     └────────────────┘ └──────────────┘ └──────────────┘
```

### Dynamisch schalen

Hetzner heeft **geen auto-scaling** (het is bare metal). Opties:
1. **Hourly billing**: Servers handmatig aan/uit zetten
2. **API automatisering**: Hetzner Robot API om servers te provisionen
3. **Hybrid**: Hetzner voor baseline + cloud GPU (RunPod/Vast.ai) voor pieken

---

## 7. Vergelijking met Alternatieven

### Waarom Hetzner en niet anderen?

| Provider | GPU opties | VRAM/€ | Locatie | Voordeel | Nadeel |
|----------|-----------|--------|---------|----------|--------|
| **Hetzner** | RTX 4000/6000/PRO 6000 | ✅ Beste | DE | Prijs, GDPR, betrouwbaar | Geen multi-GPU, beperkte modellen |
| **OVH** | A100, H100 | ⚠️ Duurder | FR/DE | Meer GPU opties | 2-3× duurder |
| **RunPod** | A100, H100, 4090 | ⚠️ | US/EU | On-demand, multi-GPU | Geen dedicated, variabele prijzen |
| **Lambda** | H100, A100 | ❌ Duur | US | Enterprise-grade | Geen EU, duur |
| **Vast.ai** | Alles | ✅ Goedkoop | Wereldwijd | Spotmarkt, goedkoop | Onbetrouwbaar, geen SLA |

**Hetzner wint op prijs/VRAM** en is de logische keuze voor een EU-gebaseerd bedrijf met GDPR-vereisten.

---

## 8. Technische Setup (na bestelling)

### Wat er geïnstalleerd moet worden

```bash
# OS: Ubuntu 22.04 LTS (Hetzner installImage)

# 1. NVIDIA Drivers + CUDA Toolkit
sudo apt install nvidia-driver-550 nvidia-cuda-toolkit

# 2. Container Runtime
sudo apt install docker.io nvidia-container-toolkit

# 3. Ollama (lokale LLM inference)
curl -fsSL https://ollama.com/install.sh | sh

# 4. Python environment (oa-cli)
sudo apt install python3.12 python3.12-venv
pip install open-agents-cli

# 5. Node.js (Claude Code CLI)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install nodejs

# 6. tmux (agent orchestratie)
sudo apt install tmux

# 7. Monitoring
# - nvidia-smi (GPU monitoring)
# - Prometheus + Grafana (metrics dashboard)
# - htop, btop (system monitoring)
```

### Beveiligingsmaatregelen

- [ ] SSH key-only login (geen password)
- [ ] Firewall (UFW): alleen poorten 22, 80, 443, en interne API-poorten
- [ ] Fail2Ban voor brute-force bescherming
- [ ] Automatische security updates
- [ ] VPN (WireGuard) voor interne communicatie tussen servers
- [ ] Let's Encrypt SSL voor publieke endpoints

---

## 9. Kostenberekening

### Scenario A: Alleen GEX131

| Post | Maandelijks | Jaarlijks |
|------|-------------|-----------|
| GEX131 server | €889 | €10.668 |
| Extra storage (2TB) | ~€20 | ~€240 |
| Backup (BX11) | ~€4 | ~€48 |
| Claude Code subscription | $100 (~€92) | ~€1.104 |
| **Totaal** | **~€1.005** | **~€12.060** |

Setup eenmalig: €1.555

### Scenario B: GEX44 (R&D fase) → GEX131 later

| Fase | Post | Maandelijks |
|------|------|-------------|
| R&D (3-6 maanden) | GEX44 + Claude sub | ~€276 |
| Productie | GEX131 + Claude sub | ~€1.005 |

Setup eenmalig: €264-312 (GEX44) + €1.555 (GEX131 later)

### Scenario C: GEX131 + GEX44 (schaal-fase)

| Post | Maandelijks |
|------|-------------|
| GEX131 (primary) | €889 |
| GEX44 (secondary) | €184 |
| Claude Code subscription | ~€92 |
| **Totaal** | **~€1.165** |

---

## 10. Beslispunten

### Nu te beslissen

| # | Vraag | Opties | Aanbeveling |
|---|-------|--------|-------------|
| H-001 | Welke server eerst? | GEX44 (€184) vs GEX131 (€889) | GEX131 — beter VRAM/€, geen migratie nodig |
| H-002 | Bestellen vóór 1 april? | Ja / Nee | **Ja** — prijsverhoging vermijden |
| H-003 | Datacenter locatie? | Falkenstein vs Nuremberg | Falkenstein (alle modellen beschikbaar) |
| H-004 | Hourly of monthly billing? | Per uur / Per maand | Monthly (goedkoper als >~60% uptime) |

### Later te beslissen

| # | Vraag | Wanneer |
|---|-------|---------|
| H-005 | Tweede server nodig? | Bij >80% GPU-bezetting of wachtrijvorming |
| H-006 | Hybrid cloud setup? | Bij onvoorspelbare pieken |
| H-007 | Idle resource monetization? | Na stabiele baseline workload |
| H-008 | RAM upgrade naar 768 GB? | Als modellen + agents samen > 200 GB RAM nodig hebben |

---

## 11. Volgende Stappen

1. [ ] **Beslissing**: GEX44 of GEX131 als eerste server
2. [ ] **Hetzner account** aanmaken (als dat nog niet is gebeurd)
3. [ ] **Server bestellen** — liefst vóór 1 april 2026 (prijsverhoging!)
4. [ ] **OS & tools installeren** (zie Sectie 8)
5. [ ] **oa-cli deployen** op de server
6. [ ] **Eerste modellen testen** (Mistral 7B, Llama 3 70B, DeepSeek Coder)
7. [ ] **Benchmark documenteren** — tokens/sec per model vastleggen
8. [ ] **Klant-facing API** ontwerpen en beveiligen

---

## Bronnen

### Hetzner
- [Hetzner GPU Servers](https://www.hetzner.com/dedicated-rootserver/matrix-gpu/)
- [GEX44](https://www.hetzner.com/dedicated-rootserver/gex44/)
- [GEX130](https://www.hetzner.com/dedicated-rootserver/gex130/)
- [GEX131](https://www.hetzner.com/dedicated-rootserver/gex131/)
- [Hetzner Server Auction](https://www.hetzner.com/sb) — check voor afgeprijsde servers
- [Prijsverhoging April 2026](https://www.hetzner.com/pressroom/statement-price-adjustment/)

### Hardware & AI
- [Ollama VRAM Requirements Guide](https://localllm.in/blog/ollama-vram-requirements-for-local-llms)
- [How Much VRAM for LLM Inference (Modal)](https://modal.com/blog/how-much-vram-need-inference)
- [A100 vs RTX 4090 Benchmarks](https://bizon-tech.com/gpu-benchmarks/NVIDIA-A100-80-GB-(PCIe)-vs-NVIDIA-RTX-4090/624vs637)
- [Multi-GPU LLM Inference Methodology](https://localai.computer/multi-gpu-methodology)

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
