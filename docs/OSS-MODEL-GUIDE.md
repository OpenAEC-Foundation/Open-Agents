# Open-Source Modellen in Open-Agents

> Praktische handleiding voor `hetzner/*` en `ollama/*` modellen.
> Claude-agents en OSS-agents werken fundamenteel anders — lees dit vóór je een OSS-agent spawnt.

---

## Beschikbare modellen (Hetzner GPU server)

| Model | Prefix | VRAM | Responstijd | Geschikt voor |
|-------|--------|------|-------------|---------------|
| `mistral:7b` | `hetzner/mistral:7b` | 5 GB | ~10s | Analyse, samenvatten, extraheren |
| `mistral-nemo` | `hetzner/mistral-nemo` | 8 GB | ~15s | Lange teksten (128k context) |
| `mixtral:8x7b` | `hetzner/mixtral:8x7b` | 26 GB* | ~60-240s | Complexe analyse, hoge kwaliteit |
| `olmo2:7b` | `hetzner/olmo2:7b` | 6 GB | ~12s | Privacy-kritisch, non-profit |
| `mistral:7b` | `ollama/mistral:7b` | lokaal | ~10s | Offline, geen SSH |

*mixtral overflowt naar RAM (64GB beschikbaar op server) — werkt maar trager

---

## Fundamentele verschillen met Claude

| | Claude | OSS (Mistral/OLMo) |
|--|--------|-------------------|
| **Tool use** | ✅ Bash, bestanden lezen/schrijven | ❌ Alleen tekst genereren |
| **Multi-step** | ✅ Betrouwbaar | ❌ Onbetrouwbaar |
| **Context** | 200k tokens | 8k–32k tokens |
| **Instructie volgen** | Zeer precies | Simpele instructies werken het best |
| **Sub-agents spawnen** | ✅ Via oa run | ❌ Kan niet |
| **Kosten** | Claude subscription | Gratis (lokale GPU) |
| **Privacy** | Naar Anthropic cloud | Volledig lokaal |

**Kernregel**: OSS-agents genereren tekst en schrijven die naar stdout. Ze voeren geen acties uit.

---

## Taak-geschiktheid

### ✅ Geschikt voor OSS

```bash
# Samenvatten
oa run "Vat dit rapport samen in 5 punten: [tekst]" --model hetzner/mistral:7b --direct

# Extraheren
oa run "Extraheer alle URL's uit deze tekst: [tekst]" --model hetzner/mistral:7b --direct

# Classificeren
oa run "Classificeer deze bug als: critical/high/medium/low. Bug: [beschrijving]" --model hetzner/mistral:7b --direct

# Vertalen
oa run "Vertaal naar Engels: [Nederlandse tekst]" --model hetzner/mistral:7b --direct

# Simpele analyse
oa run "Wat zijn de 3 risico's in deze aanpak: [tekst]" --model hetzner/mistral:7b --direct

# Tekst genereren
oa run "Schrijf een release note voor deze changelog: [diff]" --model hetzner/mixtral:8x7b --direct
```

### ❌ Niet geschikt voor OSS

```bash
# ❌ Multi-step workflows
oa run "Lees het bestand, analyseer het, schrijf tests, en fix de bugs" --model hetzner/mistral:7b

# ❌ Code schrijven en uitvoeren
oa run "Implementeer OAuth2 en test het" --model hetzner/mistral:7b

# ❌ Sub-agents spawnen
oa run "Coördineer 3 worker-agents om dit te verwerken" --model hetzner/mistral:7b

# ❌ Bestanden lezen via tools
oa run "Lees src/main.py en refactor het" --model hetzner/mistral:7b
```

Gebruik Claude (`claude/sonnet`) voor alles wat tool use, multi-step, of code-uitvoering vereist.

---

## Prompt-regels voor OSS

### DO ✅
- **Kort en direct** — max 3-4 zinnen instructie
- **Één taak** — geen meerdere stappen in één prompt
- **Expliciete output** — "schrijf je antwoord naar `/pad/naar/output.md`"
- **Concrete context inline** — plak de tekst direct in de prompt (OSS heeft geen bestandstoegang)
- **Plain language** — geen complexe markdown-structuren

### DON'T ❌
- Geen CLAUDE.md-achtige instructies (kerngedrag, lessen, beslissingen)
- Geen orchestratie-instructies ("spawn een sub-agent als...")
- Geen tool-use-instructies ("gebruik de Bash tool om...")
- Geen grote context-blokken (>500 tokens aan instructies)

### Goede prompt template

```
[Korte rolbeschrijving]. [Eén duidelijke taak].

Input: [de tekst/data direct inline]

Schrijf je antwoord naar: /absoluut/pad/output.md
Wees beknopt. Geen uitleg, alleen het resultaat.
```

---

## Spawn-regels

### Sequentieel, niet parallel (L-088)

```bash
# ✅ CORRECT — één tegelijk
oa run "taak 1" --model hetzner/mistral:7b --direct
# wacht tot klaar
oa run "taak 2" --model hetzner/mistral:7b --direct

# ❌ FOUT — VRAM contention, tweede agent faalt stil
oa run "taak 1" --model hetzner/mistral:7b --direct &
oa run "taak 2" --model hetzner/mistral:7b --direct &
```

### VRAM-bewustzijn

| Situatie | Actie |
|----------|-------|
| mistral:7b + mistral:7b parallel | ❌ VRAM contention (tweede faalt) |
| mistral:7b → wacht klaar → mistral:7b | ✅ OK |
| mixtral:8x7b alleen | ✅ OK (RAM offload) |
| mixtral:8x7b + mistral:7b parallel | ❌ Geen VRAM voor tweede |

Check VRAM vóór spawn als je twijfelt:
```bash
ssh hetzner "nvidia-smi --query-gpu=memory.free --format=csv,noheader"
# > 6000 MiB = veilig voor mistral:7b
# > 26000 MiB = veilig voor mixtral:8x7b (bijna nooit)
```

---

## Responstijden in de praktijk

| Model | Koud (eerste load) | Warm (model al in VRAM) |
|-------|-------------------|------------------------|
| `mistral:7b` | ~30s | ~10s |
| `mistral-nemo` | ~45s | ~15s |
| `mixtral:8x7b` | ~240s (RAM offload) | ~60s |
| `olmo2:7b` | ~35s | ~12s |

---

## Troubleshooting

| Symptoom | Oorzaak | Oplossing |
|----------|---------|-----------|
| Output leeg, status `error` | VRAM vol door andere agent | Wacht, controleer `oa status` |
| Agent draait >5 min zonder output | mixtral RAM-offload bezig | Normaal — wacht of gebruik mistral:7b |
| Output gaat over de prompt zelf | Context-injectie te groot (L-089) | Gebruik kortere prompt, geen CLAUDE.md context |
| `ssh: connect to host hetzner` error | SSH config / server down | Check `ssh hetzner uptime` |
| Antwoord in het Engels ipv NL | OSS models defaulten naar EN | Voeg "Antwoord in het Nederlands." toe aan prompt |

---

*Zie ook: `docs/MODEL-BENCHMARK.md` voor risicoprofielen | `DECISIONS.md` D-028 voor modelpool beleid*
