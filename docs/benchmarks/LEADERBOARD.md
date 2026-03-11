# Open-Agents GPU Model Leaderboard

> Automatisch gegenereerd op 2026-03-11 22:13 UTC
> Bijgewerkt met: `python3 tools/benchmark_aggregate.py`

## Overzicht

Dit leaderboard toont de prestaties van GPU-modellen op de Hetzner server (RTX 4000 Ada).
Scores zijn gebaseerd op de [Standard Benchmark Suite v1](suites/standard-v1.json).

## Ranglijst

| Rang | Model | Beste Score | Gem. Score | Laatste Score | Trend | Runs | Laatste Run |
|------|-------|------------|-----------|--------------|-------|------|------------|
| #1 | `qwen2.5:14b` | **95.0%** | 83.3% | 95.0% | ↑ +20.0% | 3 | 2026-03-11 |
| #2 | `gemma3:27b` | **90.0%** | 83.3% | 70.0% | ↓ -20.0% | 3 | 2026-03-11 |
| #3 | `phi4:14b` | **85.0%** | 71.7% | 60.0% | ↓ -25.0% | 3 | 2026-03-11 |
| #4 | `qwen2.5-coder:14b` | **85.0%** | 81.7% | 85.0% | ↑ +10.0% | 3 | 2026-03-11 |
| #5 | `bge-m3` | **85.0%** | 85.0% | 85.0% | — | 1 | 2026-03-11 |
| #6 | `qwen2.5:32b` | **80.0%** | 60.0% | 60.0% | ↓ -5.0% | 5 | 2026-03-11 |
| #7 | `llama3.1:8b` | **75.0%** | 64.0% | 75.0% | ↑ +5.0% | 5 | 2026-03-11 |
| #8 | `deepseek-r1:14b` | **60.0%** | 48.3% | 40.0% | ↓ -5.0% | 3 | 2026-03-11 |
| #9 | `nomic-embed-text` | **60.0%** | 60.0% | 60.0% | — | 1 | 2026-03-11 |

## Per Categorie

| Model | Reasoning | Code | Taal | Instructie | Gem. Latency |
|-------|-----------|------|------|-----------|-------------|
| `qwen2.5:14b` | 3.3 | 5.0 | 4.7 | 3.7 | 132761ms |
| `gemma3:27b` | 2.7 | 4.0 | 5.0 | 5.0 | 413926ms |
| `phi4:14b` | 3.7 | 2.7 | 3.0 | 5.0 | 131661ms |
| `qwen2.5-coder:14b` | 3.7 | 5.0 | 2.7 | 5.0 | 53642ms |
| `bge-m3` | - | - | - | - | 33378ms |
| `qwen2.5:32b` | 1.6 | 4.0 | 3.0 | 3.4 | 334061ms |
| `llama3.1:8b` | 1.4 | 3.8 | 2.8 | 4.8 | 112776ms |
| `deepseek-r1:14b` | 4.0 | 0.7 | 1.7 | 3.3 | 209874ms |
| `nomic-embed-text` | - | - | - | - | 52906ms |

## Trendanalyse

### qwen2.5:14b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 75.0% | 52260ms |
| 2026-03-11 | 80.0% | 291058ms |
| 2026-03-11 | 95.0% | 54967ms |

### gemma3:27b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 90.0% | 208331ms |
| 2026-03-11 | 90.0% | 348582ms |
| 2026-03-11 | 70.0% | 684865ms |

### phi4:14b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 85.0% | 74297ms |
| 2026-03-11 | 70.0% | 251783ms |
| 2026-03-11 | 60.0% | 68903ms |

### qwen2.5-coder:14b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 75.0% | 56270ms |
| 2026-03-11 | 85.0% | 57834ms |
| 2026-03-11 | 85.0% | 46823ms |

### qwen2.5:32b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 65.0% | 292909ms |
| 2026-03-11 | 60.0% | 285638ms |
| 2026-03-11 | 35.0% | 302931ms |
| 2026-03-11 | 80.0% | 337687ms |
| 2026-03-11 | 60.0% | 451142ms |

### llama3.1:8b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 70.0% | 14314ms |
| 2026-03-11 | 65.0% | 18303ms |
| 2026-03-11 | 50.0% | 286476ms |
| 2026-03-11 | 60.0% | 225850ms |
| 2026-03-11 | 75.0% | 18941ms |

### deepseek-r1:14b

| Datum | Score | Latency |
|-------|-------|---------|
| 2026-03-11 | 45.0% | 191619ms |
| 2026-03-11 | 60.0% | 285230ms |
| 2026-03-11 | 40.0% | 152774ms |

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
*Gegenereerd op 2026-03-11 22:13 UTC*