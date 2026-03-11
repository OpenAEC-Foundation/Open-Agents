# Open-Agents GPU Model Leaderboard

> Automatisch gegenereerd op 2026-03-11 16:34 UTC
> Bijgewerkt met: `python3 tools/benchmark_aggregate.py`

## Overzicht

Dit leaderboard toont de prestaties van GPU-modellen op de Hetzner server (RTX 4000 Ada).
Scores zijn gebaseerd op de [Standard Benchmark Suite v1](suites/standard-v1.json).

## Ranglijst

| Rang | Model | Beste Score | Gem. Score | Laatste Score | Trend | Runs | Laatste Run |
|------|-------|------------|-----------|--------------|-------|------|------------|
| #1 | `gemma3:27b` | **90.0%** | 90.0% | 90.0% | — | 1 | 2026-03-11 |
| #2 | `phi4:14b` | **85.0%** | 85.0% | 85.0% | — | 1 | 2026-03-11 |
| #3 | `qwen2.5:14b` | **75.0%** | 75.0% | 75.0% | — | 1 | 2026-03-11 |
| #4 | `qwen2.5-coder:14b` | **75.0%** | 75.0% | 75.0% | — | 1 | 2026-03-11 |
| #5 | `llama3.1:8b` | **70.0%** | 67.5% | 65.0% | ↓ -5.0% | 2 | 2026-03-11 |
| #6 | `qwen2.5:32b` | **65.0%** | 53.3% | 35.0% | ↓ -30.0% | 3 | 2026-03-11 |
| #7 | `deepseek-r1:14b` | **45.0%** | 45.0% | 45.0% | — | 1 | 2026-03-11 |

## Per Categorie

| Model | Reasoning | Code | Taal | Instructie | Gem. Latency |
|-------|-----------|------|------|-----------|-------------|
| `gemma3:27b` | 4.0 | 4.0 | 5.0 | 5.0 | 208331ms |
| `phi4:14b` | 4.0 | 5.0 | 3.0 | 5.0 | 74297ms |
| `qwen2.5:14b` | 3.0 | 5.0 | 4.0 | 3.0 | 52260ms |
| `qwen2.5-coder:14b` | 3.0 | 5.0 | 2.0 | 5.0 | 56270ms |
| `llama3.1:8b` | 1.5 | 4.5 | 2.5 | 5.0 | 16308ms |
| `qwen2.5:32b` | 0.0 | 3.3 | 3.7 | 3.7 | 293826ms |
| `deepseek-r1:14b` | 4.0 | 1.0 | 1.0 | 3.0 | 191619ms |

## Trendanalyse

### llama3.1:8b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 70.0% | 14314ms |
| 2026-03-11 | 65.0% | 18303ms |

### qwen2.5:32b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 65.0% | 292909ms |
| 2026-03-11 | 60.0% | 285638ms |
| 2026-03-11 | 35.0% | 302931ms |

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
*Gegenereerd op 2026-03-11 16:34 UTC*