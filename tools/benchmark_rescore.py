#!/usr/bin/env python3
"""
benchmark_rescore.py — Herscore bestaande benchmark runs met Claude.

Usage:
  python3 tools/benchmark_rescore.py                    # Alle runs
  python3 tools/benchmark_rescore.py --run <run_id>     # Specifieke run
  python3 tools/benchmark_rescore.py --dry-run          # Preview zonder schrijven
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
RUNS_DIR = REPO_ROOT / "docs/benchmarks/runs"
SUITES_DIR = REPO_ROOT / "docs/benchmarks/suites"


def load_suite(suite_name: str) -> dict:
    path = SUITES_DIR / f"{suite_name}.json"
    return json.loads(path.read_text()) if path.exists() else {}


def claude_score(test: dict, response: str) -> tuple[int, str]:
    """Vraag Claude haiku om een score."""
    if test["test_id"] == "instruction-001":
        # Exacte check voor Fibonacci
        expected_nums = {"0","1","2","3","5","8","13","21","34","55","89"}
        resp_nums = set(w.strip(",.") for w in response.split())
        found = expected_nums & resp_nums
        if len(found) == len(expected_nums) and "één per regel" in str(response).lower() or "\n" in response[:200]:
            return 5, "Exact correct, één per regel"
        elif len(found) >= len(expected_nums) - 1:
            return 4, f"Getallen correct ({len(found)}/{len(expected_nums)}), formaat licht afwijkend"
        else:
            return 2, f"Slechts {len(found)}/{len(expected_nums)} Fibonacci getallen aanwezig"

    criteria = test.get("eval_criteria", {})
    criteria_str = "\n".join(f"  {k}: {v}" for k, v in criteria.items())
    prompt = (
        f"Je bent een objectieve LLM benchmark beoordelaar. "
        f"Geef uitsluitend een JSON object als antwoord, geen andere tekst.\n\n"
        f"Test: {test['test_id']} ({test['category']})\n"
        f"Vraag aan het model: {test.get('prompt_nl', test.get('prompt_en', ''))}\n\n"
        f"Antwoord van het model:\n{response[:2000]}\n\n"
        f"Scorecriteria (0-{test['max_score']}):\n{criteria_str}\n\n"
        f"Geef ALLEEN dit JSON object terug:\n"
        f'{{"score": <getal 0-{test["max_score"]}>, "rationale": "<1 zin uitleg>"}}'
    )
    try:
        import os as _os
        env = {k: v for k, v in _os.environ.items() if k != "CLAUDECODE"}
        result = subprocess.run(
            ["claude", "--dangerously-skip-permissions", "-p", prompt,
             "--model", "haiku", "--output-format", "text"],
            capture_output=True, text=True, timeout=45, env=env
        )
        if result.returncode == 0:
            output = result.stdout.strip()
            start = output.find('{')
            end = output.rfind('}') + 1
            if start >= 0 and end > start:
                data = json.loads(output[start:end])
                score = max(0, min(int(data.get("score", 0)), test["max_score"]))
                return score, str(data.get("rationale", f"Score {score}"))
    except Exception as e:
        print(f"  ⚠ Claude scoring mislukt: {e}", file=sys.stderr)
    return 0, "Scoring mislukt"


def rescore_run(run_path: Path, dry_run: bool = False) -> None:
    run = json.loads(run_path.read_text())
    suite_name = run.get("suite", "standard-v1")
    suite = load_suite(suite_name)
    test_map = {t["test_id"]: t for t in suite.get("tests", [])}

    print(f"\n📊 {run_path.name}")
    print(f"   Model: {run.get('model_short', run.get('model', '?'))}")

    changed = False
    for result in run.get("results", []):
        test_id = result["test_id"]
        old_score = result["score"]
        old_rationale = result.get("score_rationale", "")

        # Skip if already properly scored (not auto-score placeholder)
        if "Auto-score niet beschikbaar" not in old_rationale and old_score > 0:
            print(f"   ✓ {test_id}: {old_score}/{result['max_score']} (al gescoord, skip)")
            continue

        test_def = test_map.get(test_id, {})
        if not test_def:
            print(f"   ? {test_id}: test definitie niet gevonden")
            continue

        response = result.get("response", "")
        new_score, new_rationale = claude_score(test_def, response)

        print(f"   {test_id}: {old_score} → {new_score}/{result['max_score']}  [{new_rationale[:60]}]")

        if not dry_run:
            result["score"] = new_score
            result["score_rationale"] = new_rationale
            changed = True

    if changed and not dry_run:
        # Herbereken summary
        total = sum(r["score"] for r in run["results"])
        max_total = sum(r["max_score"] for r in run["results"])
        pct = round(total / max_total * 100, 1) if max_total > 0 else 0
        avg = round(total / len(run["results"]), 2) if run["results"] else 0
        by_cat = {}
        for r in run["results"]:
            cat = r["category"]
            by_cat[cat] = by_cat.get(cat, 0) + r["score"]

        run["summary"]["total_score"] = total
        run["summary"]["pct_score"] = pct
        run["summary"]["avg_score"] = avg
        run["summary"]["by_category"] = by_cat
        run["summary"]["scorer"] = "claude/haiku"

        run_path.write_text(json.dumps(run, indent=2, ensure_ascii=False))
        print(f"   ✅ Opgeslagen: {total}/{max_total} = {pct}%")


def main():
    parser = argparse.ArgumentParser(description="Herscore benchmark runs met Claude")
    parser.add_argument("--run", help="Specifieke run ID of bestandsnaam")
    parser.add_argument("--dry-run", action="store_true", help="Preview zonder schrijven")
    args = parser.parse_args()

    if not RUNS_DIR.exists():
        print(f"Runs directory niet gevonden: {RUNS_DIR}")
        sys.exit(1)

    if args.run:
        candidates = list(RUNS_DIR.glob(f"*{args.run}*.json"))
        if not candidates:
            print(f"Geen runs gevonden voor: {args.run}")
            sys.exit(1)
        run_files = candidates
    else:
        run_files = sorted(RUNS_DIR.glob("*.json"))

    print(f"{'DRY RUN — ' if args.dry_run else ''}Rescoring {len(run_files)} run(s) met Claude haiku...")

    for run_path in run_files:
        rescore_run(run_path, dry_run=args.dry_run)

    if not args.dry_run:
        print(f"\n✅ Klaar. Genereer leaderboard met: python3 tools/benchmark_aggregate.py")


if __name__ == "__main__":
    main()
