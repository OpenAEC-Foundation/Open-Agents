# Open-Agents GPU Model Leaderboard

> Automatisch gegenereerd door `python3 tools/benchmark_aggregate.py`
> Bijgewerkt na elke benchmark run.

## Overzicht

Dit leaderboard toont de prestaties van GPU-modellen op de Hetzner server (RTX 4000 Ada).
Scores zijn gebaseerd op de [Standard Benchmark Suite v1](suites/standard-v1.json).

**Nog geen benchmark runs beschikbaar.**

Voer je eerste benchmark uit met:
```bash
python3 tools/benchmark_runner.py --model <model-naam> --host hetzner-agent
```

Na de run, update het leaderboard:
```bash
python3 tools/benchmark_aggregate.py
```

---

## Beschikbare Modellen

Bekijk beschikbare modellen op de Hetzner server:
```bash
python3 tools/benchmark_runner.py --list-models --host hetzner-agent
```

Typische modellen die beschikbaar zijn:
- `qwen2.5:14b`
- `phi4:14b`
- `mistral:7b`
- `llama3.1:8b`
- `deepseek-r1:14b`

---

## Benchmark Suite

| Test ID | Categorie | Beschrijving | Max Score |
|---------|-----------|-------------|-----------|
| reasoning-001 | Reasoning | nohup/SSH process kennis en uitleg | 5 |
| code-001 | Code | Python deduplicatie functie met type hints | 5 |
| language-001 | Taal | NL uitleg agent vs workflow (3 zinnen) | 5 |
| instruction-001 | Instructie | Fibonacci reeks t/m 100 (exacte output) | 5 |

**Totaal: 20 punten** per run.

Zie [suites/standard-v1.json](suites/standard-v1.json) voor volledige details en evaluatiecriteria.

---

## Hardware

| Spec | Waarde |
|------|--------|
| GPU | RTX 4000 Ada |
| VRAM | 20 GB |
| Host | hetzner-agent |
| Backend | Ollama |

---

*Dit bestand wordt automatisch overschreven bij elke `benchmark_aggregate.py` run.*
