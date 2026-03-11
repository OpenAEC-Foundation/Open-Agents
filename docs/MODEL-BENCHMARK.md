# Model Benchmark — Wanneer welk model?

> **Versie**: 1.0 | **Bijgehouden door**: Open-Agents team
> **Scope**: Modellen die beschikbaar zijn via `oa run --model <model>`
> **Filosofie**: Elk model heeft een ideale taakzone. Buiten die zone nemen risico's toe zonder dat de output beter wordt.

---

## Snel overzicht

| Model | Snelheid | Kosten | Redeneren | Schrijven | Code | Compliance-veilig |
|-------|----------|--------|-----------|-----------|------|-------------------|
| `claude/haiku` | ⚡⚡⚡ | $ | ★★☆ | ★★☆ | ★★☆ | ★★☆ |
| `claude/sonnet` | ⚡⚡ | $$ | ★★★ | ★★★ | ★★★ | ★★★ |
| `claude/opus` | ⚡ | $$$ | ★★★★ | ★★★★ | ★★★★ | ★★★★ |
| `ollama/<model>` | ⚡⚡⚡ | gratis | ★☆☆ | ★★☆ | ★★☆ | ★☆☆ |

---

## Claude Haiku 4.5

### Wanneer wél
- Structureerde output genereren (JSON, YAML, tabellen)
- Bestanden scannen, samenvatten, classificeren
- Eenvoudige formattering, vertaling, template invullen
- Batch-operaties waar snelheid > diepte
- Pre-flight checks: "heeft dit bestand X?"
- Regex/patroon extractie uit tekst

### Wanneer niet
- Complexe bugs debuggen (mist chain-of-thought diepte)
- Architectuurbeslissingen nemen
- Juridische of contractuele teksten
- Ethische of gevoelige beslissingen
- Taken die meerdere redenatiestappen vereisen
- Hallucinatiegevoelige domeinen (medisch, financieel, compliance)

### Risicoprofiel
| Risico | Ernst | Toelichting |
|--------|-------|-------------|
| Hallucinatie bij complexe feiten | Hoog | Haiku "invult" onzekerheden eerder dan toe te geven dat het het niet weet |
| Oppervlakkige redenering | Middel | Bij multi-step problemen slaat het stappen over |
| Inconsistente output bij lange context | Middel | Verliest rode draad bij >30k tokens |
| Bias in gevoelige content | Laag-Middel | Minder gecalibreerd op nuance dan grotere modellen |

---

## Claude Sonnet 4.6

### Wanneer wél
- Code schrijven, reviewen, refactoren
- Technische analyse en documentatie
- Research-taken (brede verkenning)
- Agent prompts schrijven
- Multi-stap taken met duidelijke scope
- **Default keuze** — bij twijfel: Sonnet

### Wanneer niet
- Diepgaande juridische interpretatie (contract-analyses, NL wetgeving)
- Ethische dilemma's waar neutraliteit essentieel is
- Compliance-kritisch werk (AVG, NEN, ISO-audits)
- Politiek-gevoelige onderwerpen
- Taken die echt diep redeneren vereisen (gebruik dan Opus)

### Risicoprofiel
| Risico | Ernst | Toelichting |
|--------|-------|-------------|
| Zelfverzekerde fouten bij randgevallen | Middel | Presenteert soms verkeerde antwoorden met hoog vertrouwen |
| Juridische onjuistheden | Middel | Niet getraind op NL juridisch kader; vermeng niet met advies |
| Context-drift bij >100k tokens | Laag-Middel | Consistentie neemt af bij zeer lange runs |
| Bias in politiek/maatschappelijk | Laag | Bewust gecalibreerd maar niet neutraal per definitie |

---

## Claude Opus 4.6

### Wanneer wél
- Architectuurbeslissingen en systeemontwerp
- Diep redeneren, chain-of-thought vereist
- Complexe bugs met onduidelijke oorzaak
- Strategische planning en prioritering
- Orkestratie: planner-agent in pipeline
- Taken waar kwaliteit > snelheid en kosten

### Wanneer niet
- Eenvoudige batch-taken (overkill, duur)
- Real-time toepassingen (te traag)
- Juridische adviezen met aansprakelijkheid
- Content waarvoor een mens verantwoordelijk moet zijn
- Compliance-audits (output is geen officieel document)

### Risicoprofiel
| Risico | Ernst | Toelichting |
|--------|-------|-------------|
| Overconfidentie bij edge cases | Laag-Middel | Diep redeneren ≠ altijd correct; valideer kritieke output |
| Juridische schijn-autoriteit | Middel | Klinkt overtuigend maar is geen jurist — gevaarlijk bij blind vertrouwen |
| Kosten bij misgebruik | Hoog | 10–15× duurder dan Haiku; gebruik alleen waar het loont |
| Langzaam bij urgente taken | Middel | Niet geschikt voor sub-seconde response |

---

## Ollama (lokale modellen)

### Wanneer wél
- Privacy-gevoelige data die niet naar de cloud mag
- Offline werken of cost-zero experimenten
- Eenvoudige code-assistentie (boilerplate, autocomplete)
- Testen van prompts zonder API-kosten
- Batch-runs op niet-kritische content

### Wanneer niet
- Productie-kwaliteit output (significant kwaliteitsverschil)
- Lange context (4–8k tokens typisch, vs 200k+ bij Claude)
- Complexe redenering of multi-step chains
- Enige compliance-, juridische of ethische context
- Nauwkeurige feitelijke informatie (hogere hallucinatiekans)

### Risicoprofiel
| Risico | Ernst | Toelichting |
|--------|-------|-------------|
| Hoge hallucinatiekans | Hoog | Kleinere modellen "verzinnen" eerder bij onzekerheid |
| Beperkt contextvenster | Hoog | Verliest instructies en context snel bij langere taken |
| Geen safety-calibratie | Middel-Hoog | Lokale modellen zijn niet gecalibreerd op schade-vermijding |
| Output-inconsistentie | Middel | Zelfde prompt → andere output; niet deterministisch |
| Kwalitatief inferieur aan hosted | Hoog | Gebruik alleen voor low-stakes of privacy-vereiste taken |

---

## Beslisboom: welk model kiezen?

```
Taak ontvangen
│
├─ Is het gevoelig? (juridisch, ethisch, AVG, compliance)
│   └─ JA → Geen enkel model zonder menselijke review. Sonnet/Opus voor DRAFT, mens voor beslissing.
│
├─ Is het een simpele structuuroperatie? (scan, format, extract)
│   └─ JA → Haiku (snel + goedkoop)
│
├─ Is privacy een vereiste? (data mag niet naar cloud)
│   └─ JA → Ollama (let op kwaliteitsverlies)
│
├─ Vereist het diep redeneren of architectuurbeslissingen?
│   └─ JA → Opus
│
└─ Standaard geval: code, analyse, schrijven
    └─ Sonnet ← DEFAULT
```

---

## Universele regels (gelden voor elk model)

| Situatie | Regel |
|----------|-------|
| Juridische teksten | Altijd menselijke expert laten reviewen — AI-output is NOOIT juridisch advies |
| Ethische beslissingen | AI geeft input, mens beslist — nooit omgekeerd |
| Compliance (AVG, NEN, ISO) | AI helpt draften, compliance officer valideert |
| Medische of financiële context | Gebruik als research-tool, nooit als eindoordeel |
| Politiek-gevoelige content | Output kan onbedoeld bias bevatten; altijd redactioneel toetsen |
| Kritieke productiesystemen | Altijd een mens in de loop bij deployment |

---

## Open-Agents model routing (oa run --model)

```bash
# Snelle structuuroperaties
oa run "Extract all function names from this file" --model claude/haiku --direct

# Standaard code/analyse
oa run "Implement OAuth2 middleware" --model claude/sonnet --direct

# Architectuur / strategisch
oa run "Design the agent state machine" --model claude/opus --direct

# Privacy-first, offline
oa run "Summarize this internal memo" --model ollama/llama3.2 --direct
```

---

*Bijhouden: voeg nieuwe modellen toe zodra ze beschikbaar zijn. Herevalueer risicoprofielen bij nieuwe versies.*
