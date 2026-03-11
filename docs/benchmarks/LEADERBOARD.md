# Open-Agents GPU Model Leaderboard

> Automatisch gegenereerd op 2026-03-11 17:15 UTC
> Bijgewerkt met: `python3 tools/benchmark_aggregate.py`

## Overzicht

Dit leaderboard toont de prestaties van GPU-modellen op de Hetzner server (RTX 4000 Ada).
Scores zijn gebaseerd op de [Standard Benchmark Suite v1](suites/standard-v1.json).

## Ranglijst

| Rang | Model | Beste Score | Gem. Score | Laatste Score | Trend | Runs | Laatste Run |
|------|-------|------------|-----------|--------------|-------|------|------------|
| #1 | `gemma3:27b` | **90.0%** | 90.0% | 90.0% | → stabiel | 2 | 2026-03-11 |
| #2 | `phi4:14b` | **85.0%** | 77.5% | 70.0% | ↓ -15.0% | 2 | 2026-03-11 |
| #3 | `qwen2.5-coder:14b` | **85.0%** | 80.0% | 85.0% | ↑ +10.0% | 2 | 2026-03-11 |
| #4 | `bge-m3` | **85.0%** | 85.0% | 85.0% | — | 1 | 2026-03-11 |
| #5 | `qwen2.5:14b` | **80.0%** | 77.5% | 80.0% | ↑ +5.0% | 2 | 2026-03-11 |
| #6 | `qwen2.5:32b` | **80.0%** | 60.0% | 80.0% | ↑ +15.0% | 4 | 2026-03-11 |
| #7 | `llama3.1:8b` | **70.0%** | 61.2% | 60.0% | ↓ -10.0% | 4 | 2026-03-11 |
| #8 | `deepseek-r1:14b` | **60.0%** | 52.5% | 60.0% | ↑ +15.0% | 2 | 2026-03-11 |
| #9 | `nomic-embed-text` | **60.0%** | 60.0% | 60.0% | — | 1 | 2026-03-11 |

## Per Categorie

| Model | Reasoning | Code | Taal | Instructie | Gem. Latency |
|-------|-----------|------|------|-----------|-------------|
| `gemma3:27b` | 4.0 | 4.0 | 5.0 | 5.0 | 278456ms |
| `phi4:14b` | 3.5 | 4.0 | 3.0 | 5.0 | 163040ms |
| `qwen2.5-coder:14b` | 3.5 | 5.0 | 2.5 | 5.0 | 57052ms |
| `bge-m3` | - | - | - | - | 33378ms |
| `qwen2.5:14b` | 3.0 | 5.0 | 4.5 | 3.0 | 171659ms |
| `qwen2.5:32b` | 1.0 | 3.8 | 3.8 | 3.5 | 304791ms |
| `llama3.1:8b` | 1.8 | 3.5 | 2.2 | 4.8 | 136235ms |
| `deepseek-r1:14b` | 4.0 | 1.0 | 2.0 | 3.5 | 238424ms |
| `nomic-embed-text` | - | - | - | - | 52906ms |

## Trendanalyse

### gemma3:27b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 90.0% | 208331ms |
| 2026-03-11 | 90.0% | 348582ms |

### phi4:14b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 85.0% | 74297ms |
| 2026-03-11 | 70.0% | 251783ms |

### qwen2.5-coder:14b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 75.0% | 56270ms |
| 2026-03-11 | 85.0% | 57834ms |

### qwen2.5:14b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 75.0% | 52260ms |
| 2026-03-11 | 80.0% | 291058ms |

### qwen2.5:32b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 65.0% | 292909ms |
| 2026-03-11 | 60.0% | 285638ms |
| 2026-03-11 | 35.0% | 302931ms |
| 2026-03-11 | 80.0% | 337687ms |

### llama3.1:8b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 70.0% | 14314ms |
| 2026-03-11 | 65.0% | 18303ms |
| 2026-03-11 | 50.0% | 286476ms |
| 2026-03-11 | 60.0% | 225850ms |

### deepseek-r1:14b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 45.0% | 191619ms |
| 2026-03-11 | 60.0% | 285230ms |

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
*Gegenereerd op 2026-03-11 17:15 UTC*