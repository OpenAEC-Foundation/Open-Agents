# Open-Source Model Guide — Open-Agents

> Praktische handleiding voor `hetzner/*` modellen op Ollama.
> OSS-agents zijn textgenerators—geen tool use, geen multi-step. Gebruik voor tekstverwerking; Claude voor orchestratie.

---

## Beschikbare Modellen (Hetzner GPU)

| Model | VRAM | Responstijd | Best For |
|-------|------|-------------|----------|
| **mistral:7b** | 5GB | ~10s | Snelle taken (start hier) |
| **mistral-nemo** | 8GB | ~15s | Lange context (128k) |
| **mixtral:8x7b** | 26GB* | ~60-240s | Complexe analyse |
| **olmo2:7b** | 6GB | ~12s | Privacy-kritisch, non-profit |

*mixtral overflows RAM (64GB server)—OK, maar trager

---

## Fundamentele Verschillen

| | Claude | OSS Model |
|--|--------|-----------|
| **Tool use** | ✅ Ja | ❌ Nee—alleen tekst |
| **Multi-step** | ✅ Betrouwbaar | ❌ Onbetrouwbaar |
| **Context** | 200k | 8k–32k |
| **Responstijd** | 2–5s | 10s–4m |
| **Sub-agents** | ✅ Ja | ❌ Nee |
| **Kosten** | Subscription | Gratis (lokaal) |

**Regel:** OSS = tekstgeneratie. Claude = orchestratie + tools.

---

## Taak-Geschiktheid

| Taak | ✅/❌ | Voorbeeld |
|------|--------|----------|
| Samenvatten | ✅ | `oa run "Vat dit rapport samen in 5 punten: [tekst]" --model hetzner/mistral:7b` |
| Extraheren | ✅ | `oa run "Alle URL's hieruit: [tekst]" --model hetzner/mistral:7b` |
| Classificeren | ✅ | `oa run "Severiteit bug: critical/high/medium? [beschr]" --model hetzner/mistral:7b` |
| Vertalen | ✅ | `oa run "Engels: [NL-tekst]" --model hetzner/mistral:7b` |
| **Multi-step** | ❌ | ❌ Fout: "Lees, analyseer, test, fix" |
| **Code + Tools** | ❌ | ❌ Fout: "Lees src/ en refactor" |
| **Orchestratie** | ❌ | ❌ Fout: "Spawn sub-agents" |

---

## Prompt-Regels

| ✅ DO | ❌ DON'T |
|--------|----------|
| Kort: max 500 tokens prompt | Geen CLAUDE.md context-injectie |
| Één taak per spawn | Geen orchestratie ("spawn agents...") |
| Tekst inline (geen bestandstoegang) | Geen tool use-instructies |
| Directe output: "YAML:" of "JSON:" | Geen komplexe context-blokken |
| Plain language | Geen multi-step workflows |

**Template:**
```bash
oa run "Korte taak. Input: [tekst direct]. Antwoord YAML." \
  --model hetzner/mistral:7b --direct
```

---

## Spawn-Regels (L-088, L-089)

### Sequentieel, Niet Parallel

```bash
# ✅ CORRECT
oa run "taak 1" --model hetzner/mistral:7b --direct
oa collect agent-1  # wacht op output
oa run "taak 2" --model hetzner/mistral:7b --direct

# ❌ FOUT — VRAM contention, agent 2 faalt stil
oa run "taak 1" --model hetzner/mistral:7b --direct &
oa run "taak 2" --model hetzner/mistral:7b --direct &
wait
```

### VRAM-Bewustzijn (RTX 4000 Ada = 20GB)

| Scenario | VRAM nodig | Status |
|----------|-----------|--------|
| mistral:7b (single) | 5GB | ✅ OK |
| mistral:7b parallel | 10GB+ | ❌ Contention |
| mixtral:8x7b alone | 26GB (→RAM) | ✅ OK |

Check VRAM:
```bash
ssh hetzner "nvidia-smi --query-gpu=memory.free --format=csv,noheader"
```

---

## Responstijden

| Model | Cold Load | Warm |
|-------|-----------|------|
| mistral:7b | ~30s | ~10s |
| mistral-nemo | ~45s | ~15s |
| mixtral:8x7b | ~240s | ~60s |
| olmo2:7b | ~35s | ~12s |

*Plan 5-min timeout voor grote modellen.*

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Output leeg | VRAM vol (parallel spawn) | Wacht, spawn sequentieel |
| Draait >5 min | RAM offload (mixtral) | Normaal, wacht; of mistral:7b |
| Output leeg, geen error | Context-injectie te groot (L-089) | Korte prompt, geen CLAUDE.md |
| SSH error | Server down | Check `ssh hetzner uptime` |
| Output Engels | OSS default taal | "Antwoord Nederlands." in prompt |

---

**Golden Rule:** Claude = orchestratie. OSS = tekstverwerking.

*Zie ook: D-077 (open-source LLM beleid), L-088/089 (VRAM contention, context overflow)*
