#!/usr/bin/env python3
"""
benchmark_runner.py — Voer een benchmark suite uit tegen een Ollama model via SSH.

Gebruik:
  python3 benchmark_runner.py --model qwen2.5:14b --host hetzner-agent
  python3 benchmark_runner.py --model phi4:14b --host hetzner-agent --suite standard-v1
  python3 benchmark_runner.py --list-models --host hetzner-agent

Vereisten:
  - SSH toegang tot de host (via ~/.ssh/config of direct)
  - Ollama draait op de remote host
  - Python 3.8+ (alleen stdlib)

Output:
  - JSON run bestand in docs/benchmarks/runs/
  - Progressie naar stdout
  - Score samenvatting tabel aan het einde
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


# Bepaal de repo root relatief aan dit script
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
SUITES_DIR = REPO_ROOT / "docs" / "benchmarks" / "suites"
RUNS_DIR = REPO_ROOT / "docs" / "benchmarks" / "runs"
SCHEMA_DIR = REPO_ROOT / "docs" / "benchmarks" / "schema"


def load_suite(suite_name: str) -> dict:
    """Laad een suite definitie uit docs/benchmarks/suites/."""
    suite_file = SUITES_DIR / f"{suite_name}.json"
    if not suite_file.exists():
        available = [f.stem for f in SUITES_DIR.glob("*.json")]
        print(f"FOUT: Suite '{suite_name}' niet gevonden.", file=sys.stderr)
        print(f"Beschikbare suites: {', '.join(available)}", file=sys.stderr)
        sys.exit(1)
    with open(suite_file, "r", encoding="utf-8") as f:
        return json.load(f)


def list_models(host: str) -> None:
    """Lijst beschikbare Ollama modellen op de remote host."""
    print(f"Ophalen van modellen van {host}...")
    try:
        result = subprocess.run(
            ["ssh", host, "ollama list"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            print(f"FOUT: SSH commando mislukt: {result.stderr}", file=sys.stderr)
            sys.exit(1)
        print(f"\nBeschikbare modellen op {host}:")
        print(result.stdout)
    except subprocess.TimeoutExpired:
        print("FOUT: SSH timeout na 30 seconden", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("FOUT: ssh niet gevonden in PATH", file=sys.stderr)
        sys.exit(1)


def run_ollama(host: str, model: str, prompt: str, timeout: int = 120) -> tuple[str, int]:
    """
    Voer een prompt uit via SSH + ollama op de remote host.
    Geeft (response_text, latency_ms) terug.
    """
    # Escape aanhalingstekens in de prompt voor shell veiligheid
    safe_prompt = prompt.replace("'", "'\\''")
    cmd = ["ssh", host, f"ollama run {model} '{safe_prompt}'"]

    start_time = time.time()
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        elapsed_ms = int((time.time() - start_time) * 1000)

        if result.returncode != 0:
            error_msg = result.stderr.strip() or "onbekende fout"
            return f"[FOUT] {error_msg}", elapsed_ms

        return result.stdout.strip(), elapsed_ms

    except subprocess.TimeoutExpired:
        elapsed_ms = int((time.time() - start_time) * 1000)
        return f"[TIMEOUT na {timeout}s]", elapsed_ms
    except FileNotFoundError:
        return "[FOUT] ssh niet gevonden in PATH", 0


def estimate_tokens(text: str) -> int:
    """Schatting van tokens op basis van woorden (ruwe benadering: 1 woord ≈ 1.3 tokens)."""
    words = len(text.split())
    return int(words * 1.3)


def score_response_auto(test: dict, response: str) -> tuple[int, str]:
    """Auto-score een response. Gebruikt Claude CLI voor open-ended tests,
    exacte matching voor instruction tests."""
    # Instruction test: exacte/heuristische vergelijking
    if test["test_id"] == "instruction-001":
        return score_response(test, response)  # reuse existing exact logic

    # Open-ended tests: vraag Claude om te scoren
    criteria = test.get("eval_criteria", {})
    criteria_str = "\n".join(f"  {k}: {v}" for k, v in criteria.items())
    prompt = (
        f"Je bent een objectieve LLM benchmark beoordelaar. "
        f"Geef uitsluitend een JSON object als antwoord, geen andere tekst.\n\n"
        f"Test: {test['test_id']} ({test['category']})\n"
        f"Vraag aan het model: {test.get('prompt_nl', test.get('prompt_en', ''))}\n\n"
        f"Antwoord van het model:\n{response[:1500]}\n\n"
        f"Scorecriteria (0-{test['max_score']}):\n{criteria_str}\n\n"
        f"Geef ALLEEN dit JSON object terug:\n"
        f'{{\"score\": <getal 0-{test["max_score"]}>, \"rationale\": \"<1 zin uitleg>\"}}'
    )
    try:
        import os as _os
        env = {k: v for k, v in _os.environ.items() if k != "CLAUDECODE"}
        result = subprocess.run(
            ["claude", "--dangerously-skip-permissions", "-p", prompt,
             "--model", "haiku", "--output-format", "text"],
            capture_output=True, text=True, timeout=30, env=env
        )
        if result.returncode == 0:
            output = result.stdout.strip()
            # Extract JSON from output
            import json as _json
            # Try to find JSON in output
            start = output.find('{')
            end = output.rfind('}') + 1
            if start >= 0 and end > start:
                data = _json.loads(output[start:end])
                score = max(0, min(int(data.get("score", 0)), test["max_score"]))
                rationale = str(data.get("rationale", f"Claude score: {score}"))
                return score, rationale
    except Exception:
        pass
    # Fallback: geen score beschikbaar
    return 0, "Auto-score mislukt (Claude niet beschikbaar)"


def score_response(test: dict, response: str) -> tuple[int, str]:
    """
    Interactief of automatisch scoren van een response.
    Voor automatische runs: vraag score via stdin of gebruik heuristiek.
    Geeft (score, rationale) terug.
    """
    # Automatische scoring voor instruction-001 (exacte vergelijking)
    if test["test_id"] == "instruction-001":
        expected = test.get("expected_output", "")
        # Normaliseer: verwijder spaties rondom komma's
        def normalize_seq(s):
            return re.sub(r'\s*,\s*', ',', s.strip())

        resp_normalized = normalize_seq(response)
        exp_normalized = normalize_seq(expected)

        # Check of verwachte getallen aanwezig zijn
        expected_nums = exp_normalized.split(',')
        resp_nums = resp_normalized.replace(' ', '').split(',')

        if resp_normalized == exp_normalized or resp_nums == expected_nums:
            return 5, "Exact correct antwoord"
        elif all(n in resp_nums for n in expected_nums):
            return 4, "Correct getallen maar formaat afwijkend"
        else:
            # Controleer hoeveel getallen correct zijn
            correct = sum(1 for n in expected_nums if n in resp_nums)
            if correct >= len(expected_nums) - 1:
                return 3, f"Bijna correct: {correct}/{len(expected_nums)} getallen aanwezig"
            elif correct >= len(expected_nums) // 2:
                return 2, f"Gedeeltelijk correct: {correct}/{len(expected_nums)} getallen"
            else:
                return 1, f"Weinig correct: {correct}/{len(expected_nums)} getallen"

    # Voor overige tests: interactieve scoring via stdin
    print(f"\n{'='*60}")
    print(f"Test: {test['test_id']} ({test['category']})")
    print(f"Prompt: {test.get('prompt_nl', test.get('prompt_en', ''))[:200]}...")
    print(f"\nResponse:\n{response[:500]}{'...' if len(response) > 500 else ''}")
    print(f"\nEvaluatiecriteria:")
    for score, criteria in test.get("eval_criteria", {}).items():
        print(f"  {score}: {criteria}")
    print(f"{'='*60}")

    while True:
        try:
            score_input = input(f"Score (0-{test['max_score']}): ").strip()
            score = int(score_input)
            if 0 <= score <= test["max_score"]:
                rationale = input("Toelichting (optioneel, Enter om over te slaan): ").strip()
                return score, rationale or f"Score {score}/{test['max_score']}"
            else:
                print(f"Voer een getal in tussen 0 en {test['max_score']}")
        except ValueError:
            print("Ongeldige invoer, probeer opnieuw")
        except (EOFError, KeyboardInterrupt):
            print("\nScore overgeslagen, standaard 0")
            return 0, "Overgeslagen (geen invoer)"


def make_run_id(model: str, timestamp: str) -> str:
    """Maak een veilige run ID van timestamp en model naam."""
    safe_model = re.sub(r'[^a-zA-Z0-9._-]', '-', model)
    safe_ts = timestamp[:19].replace(':', '-').replace('T', 'T')
    return f"{safe_ts}-{safe_model}"


def run_benchmark(model: str, host: str, suite_name: str, provider: str,
                  gpu: str, vram_gb: int, auto_score: bool, timeout: int) -> dict:
    """
    Voer de volledige benchmark suite uit en retourneer het run object.
    """
    suite = load_suite(suite_name)
    timestamp = datetime.now(timezone.utc).isoformat()
    run_id = make_run_id(model, timestamp)

    print(f"\n{'='*60}")
    print(f"BENCHMARK START")
    print(f"Model:    {model}")
    print(f"Host:     {host}")
    print(f"Suite:    {suite_name} ({len(suite['tests'])} tests)")
    print(f"Run ID:   {run_id}")
    print(f"{'='*60}\n")

    results = []

    for i, test in enumerate(suite["tests"], 1):
        test_id = test["test_id"]
        category = test["category"]
        prompt = test.get("prompt_nl", test.get("prompt_en", ""))
        max_score = test["max_score"]

        print(f"[{i}/{len(suite['tests'])}] {test_id} ({category}) ... ", end="", flush=True)

        response, latency_ms = run_ollama(host, model, prompt, timeout=timeout)
        tokens = estimate_tokens(response)

        print(f"{latency_ms}ms, ~{tokens} tokens")

        if auto_score:
            score, rationale = score_response_auto(test, response)
        else:
            score, rationale = score_response(test, response)

        results.append({
            "test_id": test_id,
            "category": category,
            "prompt": prompt,
            "response": response,
            "score": score,
            "max_score": max_score,
            "score_rationale": rationale,
            "latency_ms": latency_ms,
            "tokens_estimated": tokens,
        })

    # Bereken samenvatting
    total_score = sum(r["score"] for r in results)
    max_possible = sum(r["max_score"] for r in results)
    pct_score = round(total_score / max_possible * 100, 1) if max_possible > 0 else 0
    avg_score = round(total_score / len(results), 2) if results else 0
    total_latency = sum(r["latency_ms"] for r in results)

    by_category = {}
    for r in results:
        cat = r["category"]
        by_category[cat] = by_category.get(cat, 0) + r["score"]

    run = {
        "run_id": run_id,
        "timestamp": timestamp,
        "model": f"{provider.split('-')[0]}/{model}" if "/" not in model else model,
        "model_short": model,
        "provider": provider,
        "hardware": {
            "gpu": gpu,
            "vram_gb": vram_gb,
            "host": host,
        },
        "suite": suite_name,
        "suite_version": suite["version"],
        "results": results,
        "summary": {
            "total_score": total_score,
            "max_score": max_possible,
            "pct_score": pct_score,
            "avg_score": avg_score,
            "by_category": by_category,
            "total_latency_ms": total_latency,
        },
        "notes": "",
        "linked_decisions": [],
        "runner": "benchmark_runner.py",
        "run_by": os.environ.get("USER", "unknown"),
    }

    return run


def print_summary(run: dict) -> None:
    """Print een overzichtstabel naar stdout."""
    summary = run["summary"]
    print(f"\n{'='*60}")
    print(f"BENCHMARK SAMENVATTING: {run['model_short']}")
    print(f"Run: {run['run_id']}")
    print(f"{'='*60}")
    print(f"{'Test':<20} {'Cat':<12} {'Score':<10} {'Max':<8} {'Latency':<12}")
    print(f"{'-'*20} {'-'*12} {'-'*10} {'-'*8} {'-'*12}")
    for r in run["results"]:
        print(f"{r['test_id']:<20} {r['category']:<12} {r['score']:<10} {r['max_score']:<8} {r['latency_ms']}ms")
    print(f"{'-'*20} {'-'*12} {'-'*10} {'-'*8} {'-'*12}")
    print(f"{'TOTAAL':<20} {'':<12} {summary['total_score']:<10} {summary['max_score']:<8} {summary['total_latency_ms']}ms")
    print(f"\nScore: {summary['total_score']}/{summary['max_score']} = {summary['pct_score']}%")
    print(f"Gemiddeld: {summary['avg_score']}/5")
    print(f"\nPer categorie:")
    for cat, score in summary["by_category"].items():
        print(f"  {cat}: {score}")
    print(f"{'='*60}\n")


def save_run(run: dict) -> Path:
    """Sla het run object op als JSON bestand."""
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{run['run_id']}.json"
    filepath = RUNS_DIR / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(run, f, indent=2, ensure_ascii=False)
    return filepath


def main():
    parser = argparse.ArgumentParser(
        description="Voer een Open-Agents benchmark uit via SSH + Ollama",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--model", help="Model naam (bijv. qwen2.5:14b)")
    parser.add_argument("--host", default="hetzner-agent", help="SSH hostname (default: hetzner-agent)")
    parser.add_argument("--suite", default="standard-v1", help="Suite naam (default: standard-v1)")
    parser.add_argument("--provider", default="hetzner-ollama", help="Provider ID (default: hetzner-ollama)")
    parser.add_argument("--gpu", default="RTX 4000 Ada", help="GPU naam (default: RTX 4000 Ada)")
    parser.add_argument("--vram", type=int, default=20, help="VRAM in GB (default: 20)")
    parser.add_argument("--timeout", type=int, default=120, help="SSH timeout in seconden per test (default: 120)")
    parser.add_argument("--auto-score", action="store_true", help="Automatisch scoren waar mogelijk (geen interactieve input)")
    parser.add_argument("--list-models", action="store_true", help="Lijst beschikbare modellen op de host")
    parser.add_argument("--dry-run", action="store_true", help="Toon suite zonder daadwerkelijk te runnen")

    args = parser.parse_args()

    if args.list_models:
        list_models(args.host)
        return

    if not args.model:
        parser.error("--model is vereist (tenzij --list-models gebruikt wordt)")

    if args.dry_run:
        suite = load_suite(args.suite)
        print(f"Suite: {suite['name']}")
        print(f"Tests:")
        for test in suite["tests"]:
            print(f"  - {test['test_id']} ({test['category']}): max {test['max_score']}")
        return

    # Voer benchmark uit
    run = run_benchmark(
        model=args.model,
        host=args.host,
        suite_name=args.suite,
        provider=args.provider,
        gpu=args.gpu,
        vram_gb=args.vram,
        auto_score=args.auto_score,
        timeout=args.timeout,
    )

    # Toon samenvatting
    print_summary(run)

    # Sla op
    filepath = save_run(run)
    print(f"Run opgeslagen: {filepath}")
    print(f"\nUpdate leaderboard met:")
    print(f"  python3 tools/benchmark_aggregate.py")


if __name__ == "__main__":
    main()
