# Open-Agents Benchmark Systeem

Een persistent benchmark systeem voor het evalueren van GPU-modellen (Ollama) op de Hetzner server.
Resultaten accumuleren over tijd en zijn PR-materiaal voor de Open-Agents repository.

## Doel

- **Vergelijken** van LLM-modellen op consistente taken
- **Volgen** van prestatieveranderingen over tijd (trend per model)
- **Documenteren** van hardware-specifieke performance (RTX 4000 Ada, 20 GB VRAM)
- **Genereren** van PR-waardige rapporten: "wij hebben X weken getest"

---

## Snelstart

### 1. Benchmark uitvoeren

```bash
# Standaard benchmark (standard-v1 suite)
python3 tools/benchmark_runner.py --model qwen2.5:14b --host hetzner-agent

# Andere suite of model
python3 tools/benchmark_runner.py --model phi4:14b --host hetzner-agent --suite standard-v1

# Lijst beschikbare modellen op de server
python3 tools/benchmark_runner.py --list-models --host hetzner-agent

# Dry-run: bekijk suite zonder uit te voeren
python3 tools/benchmark_runner.py --model qwen2.5:14b --dry-run
```

De runner vraagt om scores voor 3 van de 4 tests (instructie-001 wordt automatisch gescoord).
Resultaat wordt opgeslagen in `docs/benchmarks/runs/<timestamp>-<model>.json`.

### 2. Leaderboard bijwerken

```bash
# Update LEADERBOARD.md
python3 tools/benchmark_aggregate.py

# Bekijk als JSON
python3 tools/benchmark_aggregate.py --format json

# Model geschiedenis
python3 tools/benchmark_aggregate.py --model qwen2.5:14b

# Filter op datum
python3 tools/benchmark_aggregate.py --since 2026-03-01
```

### 3. Resultaten committen

```bash
git add docs/benchmarks/runs/ docs/benchmarks/LEADERBOARD.md
git commit -m "benchmark: qwen2.5:14b run 2026-03-11 — 80%"
```

---

## Mapstructuur

```
docs/benchmarks/
├── README.md               # Dit bestand
├── LEADERBOARD.md          # Automatisch gegenereerd leaderboard
├── schema/
│   └── run-v1.json         # JSON Schema voor run resultaten
├── suites/
│   └── standard-v1.json    # Standaard test suite (4 tests)
└── runs/
    └── <timestamp>-<model>.json    # Individuele run resultaten

tools/
├── benchmark_runner.py     # Runner script (SSH + Ollama)
└── benchmark_aggregate.py  # Aggregator / leaderboard generator
```

---

## Test Suites

| Suite ID | Versie | Tests | Max Score | Beschrijving |
|----------|--------|-------|-----------|-------------|
| standard-v1 | 1.0 | 4 | 20 | Standaard suite: reasoning, code, taal, instructie |

### standard-v1 Tests

| Test ID | Categorie | Prompt Samenvatting | Max Score |
|---------|-----------|-------------------|-----------|
| reasoning-001 | Reasoning | nohup/SSH proces: wat gebeurt er na disconnect? | 5 |
| code-001 | Code | Python `deduplicate()` met type hints + docstring | 5 |
| language-001 | Taal | 3 zinnen NL: agent vs workflow (voor leken) | 5 |
| instruction-001 | Instructie | Fibonacci reeks t/m 100, alleen getallen | 5 |

**Scoring:**
- 5 = perfect
- 4 = grotendeels correct, kleine missen
- 3 = gedeeltelijk correct
- 2 = basis begrip, fouten
- 1 = nauwelijks correct
- 0 = fout of geen antwoord

---

## Run Schema

Elk run bestand volgt het schema in `schema/run-v1.json`. Voorbeeld:

```json
{
  "run_id": "2026-03-11T14-30-00-qwen2.5-14b",
  "timestamp": "2026-03-11T14:30:00Z",
  "model": "hetzner/qwen2.5:14b",
  "model_short": "qwen2.5:14b",
  "provider": "hetzner-ollama",
  "hardware": { "gpu": "RTX 4000 Ada", "vram_gb": 20, "host": "hetzner-agent" },
  "suite": "standard-v1",
  "suite_version": "1.0",
  "results": [...],
  "summary": {
    "total_score": 16,
    "max_score": 20,
    "pct_score": 80.0,
    "avg_score": 4.0,
    "by_category": { "reasoning": 4, "code": 5, "language": 3, "instruction": 4 },
    "total_latency_ms": 4800
  }
}
```

---

## Workflow voor Regelmatige Benchmarks

```bash
# Wekelijkse benchmark van alle 9 modellen (via script)
for model in qwen2.5:14b phi4:14b mistral:7b llama3.1:8b deepseek-r1:14b; do
  python3 tools/benchmark_runner.py --model $model --host hetzner-agent --auto-score
done
python3 tools/benchmark_aggregate.py
git add docs/benchmarks/
git commit -m "benchmark: wekelijkse run $(date +%Y-%m-%d)"
```

---

## Gerelateerde Bestanden

- [`LEADERBOARD.md`](LEADERBOARD.md) — Huidige ranglijst
- [`schema/run-v1.json`](schema/run-v1.json) — Run schema definitie
- [`suites/standard-v1.json`](suites/standard-v1.json) — Test suite
- [`../../tools/benchmark_runner.py`](../../tools/benchmark_runner.py) — Runner script
- [`../../tools/benchmark_aggregate.py`](../../tools/benchmark_aggregate.py) — Aggregator

---

*Open-Agents Benchmark Systeem — opgezet 2026-03-11*
