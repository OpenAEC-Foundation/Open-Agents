# Benchmark Scoring Notes — standard-v1

**Datum herscore:** 2026-03-11  
**Scorer:** benchmark-scorer agent (claude/sonnet)  
**Suite:** standard-v1 (4 tests × max 5 punten = 20 punten max)

> **Opmerking:** De scoring-criteria in CLAUDE.md beschrijft een andere vraagstelling voor reasoning-001  
> ("waarom nohup faalt op een root SSH-sessie") dan de werkelijke prompt in de JSON-bestanden  
> ("wat gebeurt er met het nohup proces wanneer SSH-sessie verbreekt"). Scores zijn beoordeeld  
> op de **werkelijke prompt** in de bestanden, met dezelfde rubric-geest (SIGHUP, process groups, etc.).

---

## Scoretabel per model per test

| Model | reasoning-001 | code-001 | language-001 | instruction-001 | **Totaal** | **%** |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| llama3.1:8b (run1) | 2 | 4 | 3 | 5 | **14** | 70% |
| llama3.1:8b (run2) | 1 | 5 | 2 | 5 | **13** | 65% |
| qwen2.5:14b | 3 | 5 | 4 | 3 | **15** | 75% |
| phi4:14b | 4 | 5 | 2 | 5 | **16** | 80% |
| qwen2.5-coder:14b | 3 | 5 | 2 | 5 | **15** | 75% |
| deepseek-r1:14b | 4 | 5 | 4 | 3 | **16** | 80% |

---

## Toelichting per test

### reasoning-001 — nohup + SSH-sessie verbreking (max 5)

| Model | Score | Toelichting |
|-------|:---:|---|
| llama3.1:8b (run1) | 2 | Vermeldt dat het proces doorgaat maar noemt $PPID als mechanisme i.p.v. SIGHUP |
| llama3.1:8b (run2) | 1 | Contradictoir: zegt eerst dat het proces stopt; beschrijft PID-opslag in /dev/null — feitelijk onjuist |
| qwen2.5:14b | 3 | Correct over SIGHUP maar stelt ten onrechte dat nohup ook SIGINT/SIGTERM blokkeert |
| phi4:14b | 4 | Correct SIGHUP als hoofddoel, nohup.out besproken; mist process-group concept |
| qwen2.5-coder:14b | 3 | Correct over SIGHUP maar stelt foutief dat nohup standaard background draait (& is vereist) |
| deepseek-r1:14b | 4 | Correct en volledig over SIGHUP, process-detachment, nohup.out; thinking-trace geen invloed op inhoud |

### code-001 — deduplicate() met behoud volgorde (max 5)

| Model | Score | Toelichting |
|-------|:---:|---|
| llama3.1:8b (run1) | 4 | Werkend met docstring/type hints maar O(n²) aanpak via `item not in result` |
| llama3.1:8b (run2) | 5 | Correct, efficiënt (seen-set), type hints, goede docstring |
| qwen2.5:14b | 5 | Correct met dict-tracking (creative maar valid), type hints, docstring |
| phi4:14b | 5 | Correct, efficiënt, List[Any] type hints, uitgebreide docstring |
| qwen2.5-coder:14b | 5 | Correct, efficiënt, type hints, docstring met Parameters/Returns |
| deepseek-r1:14b | 5 | Uitstekend: TypeVar voor generieke types, efficiënt, volledige docstring |

### language-001 — AI agent vs AI workflow in precies 3 zinnen (max 5)

| Model | Score | Toelichting |
|-------|:---:|---|
| llama3.1:8b (run1) | 3 | Slechts 2 zinnen (één te weinig); inhoudelijk redelijk |
| llama3.1:8b (run2) | 2 | 4 zinnen én definitie van workflow als "samenstelling van AI-agents" is fout |
| qwen2.5:14b | 4 | Precies 3 zinnen, inhoudelijk goed; mist autonomie/deterministisch nuance |
| phi4:14b | 2 | 8 zinnen — negeert de format-instructie volledig |
| qwen2.5-coder:14b | 2 | 5 zinnen — overschrijdt de limiet significant |
| deepseek-r1:14b | 4 | Precies 3 zinnen in eigenlijk antwoord, correct contrast; mist deterministisch aspect |

### instruction-001 — Fibonacci reeks tot 100, komma-gescheiden (max 5)

Correcte reeks: `0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89` (12 getallen)

| Model | Score | Toelichting |
|-------|:---:|---|
| llama3.1:8b (run1) | 5 | Alle 12 getallen correct, komma-gescheiden |
| llama3.1:8b (run2) | 5 | Alle 12 getallen correct, geen spaties |
| qwen2.5:14b | 3 | Start bij 1 i.p.v. 0 — mist het getal 0 (11/12) |
| phi4:14b | 5 | Alle 12 getallen correct |
| qwen2.5-coder:14b | 5 | Alle 12 getallen correct, geen spaties |
| deepseek-r1:14b | 3 | Getallen correct maar uitgebreide Thinking-sectie schendt "zonder verdere uitleg" |

---

## Observaties

- **code-001**: Bijna alle modellen scoren 5/5 — dit is de sterkste categorie voor alle modellen.
- **language-001**: Zwakste categorie. De meeste modellen negeren de "precies 3 zinnen" eis. Alleen qwen2.5:14b en deepseek-r1:14b halen de 4.
- **reasoning-001**: Grote variatie (1–4). llama3.1:8b scoort slecht; phi4 en deepseek-r1 scoren het best.
- **instruction-001**: qwen2.5:14b en deepseek-r1:14b verliezen punten (qwen mist 0, deepseek heeft thinking-trace).
- **deepseek-r1:14b**: Hoge inhoudsscore maar thinking-traces schenden instruction-following; zeer hoge latency.
- **phi4:14b**: Hoogste totaalscore (gedeeld met deepseek-r1) maar faalt zwaar op language-001 format.
