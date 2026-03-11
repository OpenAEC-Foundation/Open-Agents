# Open-Agents GPU Model Leaderboard

> Automatisch gegenereerd op 2026-03-11 12:49 UTC
> Bijgewerkt met: `python3 tools/benchmark_aggregate.py`

## Overzicht

Dit leaderboard toont de prestaties van GPU-modellen op de Hetzner server (RTX 4000 Ada).
Scores zijn gebaseerd op de [Standard Benchmark Suite v1](suites/standard-v1.json).

## Ranglijst

| Rang | Model | Beste Score | Gem. Score | Laatste Score | Trend | Runs | Laatste Run |
|------|-------|------------|-----------|--------------|-------|------|------------|
| #1 | `llama3.1:8b` | **25.0%** | 25.0% | 25.0% | → stabiel | 2 | 2026-03-11 |
| #2 | `phi4:14b` | **25.0%** | 25.0% | 25.0% | — | 1 | 2026-03-11 |
| #3 | `qwen2.5-coder:14b` | **25.0%** | 25.0% | 25.0% | — | 1 | 2026-03-11 |
| #4 | `qwen2.5:14b` | **15.0%** | 15.0% | 15.0% | — | 1 | 2026-03-11 |
| #5 | `deepseek-r1:14b` | **15.0%** | 15.0% | 15.0% | — | 1 | 2026-03-11 |

## Per Categorie

| Model | Reasoning | Code | Taal | Instructie | Gem. Latency |
|-------|-----------|------|------|-----------|-------------|
| `llama3.1:8b` | 0.0 | 0.0 | 0.0 | 5.0 | 16308ms |
| `phi4:14b` | 0.0 | 0.0 | 0.0 | 5.0 | 74297ms |
| `qwen2.5-coder:14b` | 0.0 | 0.0 | 0.0 | 5.0 | 56270ms |
| `qwen2.5:14b` | 0.0 | 0.0 | 0.0 | 3.0 | 52260ms |
| `deepseek-r1:14b` | 0.0 | 0.0 | 0.0 | 3.0 | 191619ms |

## Trendanalyse

### llama3.1:8b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 25.0% | 14314ms |
| 2026-03-11 | 25.0% | 18303ms |

## Hardware

| Spec | Waarde |
|------|--------|
| GPU | RTX 4000 Ada |
| VRAM | 20 GB |
| Host | hetzner-agent |
| Backend | Ollama |

## Benchmark Suite

| Test ID | Categorie | Beschrijving |
|---------|-----------|-------------|
| reasoning-001 | Reasoning | nohup/SSH process kennis |
| code-001 | Code | Python deduplicatie functie |
| language-001 | Taal | NL uitleg agent vs workflow |
| instruction-001 | Instructie | Fibonacci reeks t/m 100 |

Zie [suites/standard-v1.json](suites/standard-v1.json) voor volledige details.

---
*Gegenereerd op 2026-03-11 12:49 UTC*