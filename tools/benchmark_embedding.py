#!/usr/bin/env python3
"""
benchmark_embedding.py — Benchmark embedding modellen op Hetzner GPU server.

Tests via SSH + Python op de server (geen directe API toegang van lokaal).

Usage:
  python3 tools/benchmark_embedding.py --model nomic-embed-text --host hetzner-agent
  python3 tools/benchmark_embedding.py --model bge-m3 --host hetzner-agent
"""
import argparse
import json
import math
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
RUNS_DIR = REPO_ROOT / "docs/benchmarks/runs"
SUITES_DIR = REPO_ROOT / "docs/benchmarks/suites"

REMOTE_PYTHON = """
import json, math, time, urllib.request, urllib.parse

def embed(model, text, host="http://localhost:11434"):
    data = json.dumps({"model": model, "prompt": text}).encode()
    req = urllib.request.Request(f"{host}/api/embeddings",
        data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())["embedding"]

def cosine(a, b):
    dot = sum(x*y for x,y in zip(a,b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(x*x for x in b))
    return dot / (na * nb) if na and nb else 0.0

model = "{model}"
results = []

# ---- similarity-001 ----
try:
    pos_pairs = [
        ("The cat sat on the mat.", "A feline rested on a rug.", 0.80),
        ("Machine learning is a subset of AI.", "ML is part of artificial intelligence.", 0.85),
        ("Open source software is free to use.", "Free software can be used without cost.", 0.82),
    ]
    neg_pair = ("The cat sat on the mat.", "Quantum computing uses qubits.", 0.50)

    t0 = time.time()
    pos_ok = 0
    pos_sims = []
    for a, b, mn in pos_pairs:
        ea, eb = embed(model, a), embed(model, b)
        sim = cosine(ea, eb)
        pos_sims.append(round(sim, 4))
        if sim >= mn:
            pos_ok += 1

    neg_ea, neg_eb = embed(model, neg_pair[0]), embed(model, neg_pair[1])
    neg_sim = round(cosine(neg_ea, neg_eb), 4)
    neg_ok = neg_sim <= neg_pair[2]
    latency = int((time.time() - t0) * 1000)

    if pos_ok == 3 and neg_ok:
        score = 5
    elif pos_ok == 3 and not neg_ok:
        score = 4
    elif pos_ok == 2 and neg_ok:
        score = 4
    elif pos_ok == 2:
        score = 3
    elif pos_ok == 1:
        score = 2
    else:
        score = 1

    results.append({
        "test_id": "similarity-001", "category": "similarity",
        "score": score, "max_score": 5,
        "latency_ms": latency,
        "response": f"pos_sims={pos_sims} neg_sim={neg_sim}",
        "score_rationale": f"pos_ok={pos_ok}/3 neg_ok={neg_ok} sims={pos_sims} neg={neg_sim}",
    })
except Exception as e:
    results.append({{"test_id": "similarity-001", "category": "similarity",
        "score": 0, "max_score": 5, "latency_ms": 0,
        "response": "", "score_rationale": f"ERROR: {{e}}"}})

# ---- retrieval-001 ----
try:
    query = "How do I deploy a Python web application?"
    docs = [
        ("d1", "Flask is a micro web framework for Python. Deploy it with gunicorn.", True),
        ("d2", "Python is a high-level programming language.", False),
        ("d3", "Docker containers can run any application.", False),
        ("d4", "SQL databases store relational data.", False),
        ("d5", "Nginx is a web server that can proxy requests to your WSGI app.", False),
    ]

    t0 = time.time()
    qe = embed(model, query)
    sims = [(did, cosine(qe, embed(model, txt)), rel) for did, txt, rel in docs]
    sims.sort(key=lambda x: -x[1])
    latency = int((time.time() - t0) * 1000)

    rank = next(i+1 for i, (did, _, rel) in enumerate(sims) if rel)
    score = max(0, 6 - rank)  # rank 1->5, rank 2->4, ..., rank 5->1

    results.append({
        "test_id": "retrieval-001", "category": "retrieval",
        "score": score, "max_score": 5,
        "latency_ms": latency,
        "response": json.dumps([(d, round(s,4)) for d,s,r in sims]),
        "score_rationale": f"Relevant doc d1 at rank {rank}. Top: {sims[0][0]} sim={round(sims[0][1],3)}",
    })
except Exception as e:
    results.append({"test_id": "retrieval-001", "category": "retrieval",
        "score": 0, "max_score": 5, "latency_ms": 0,
        "response": "", "score_rationale": f"ERROR: {e}"})

# ---- multilingual-001 ----
try:
    pairs = [
        ("De kat zat op de mat.", "The cat sat on the mat.", 0.70),
        ("Machine learning is een onderdeel van kunstmatige intelligentie.", "Machine learning is a subset of artificial intelligence.", 0.75),
        ("Open source software is vrij te gebruiken.", "Open source software is free to use.", 0.75),
    ]

    t0 = time.time()
    ok = 0
    sims = []
    for nl, en, mn in pairs:
        enl, een = embed(model, nl), embed(model, en)
        sim = cosine(enl, een)
        sims.append(round(sim, 4))
        if sim >= mn:
            ok += 1
    latency = int((time.time() - t0) * 1000)

    all_above_half = all(s > 0.50 for s in sims)
    if ok == 3:
        score = 5
    elif ok == 2:
        score = 4
    elif ok == 1:
        score = 3
    elif all_above_half:
        score = 2
    else:
        score = 1

    results.append({
        "test_id": "multilingual-001", "category": "multilingual",
        "score": score, "max_score": 5,
        "latency_ms": latency,
        "response": f"nl_en_sims={sims}",
        "score_rationale": f"Cross-lingual ok={ok}/3 sims={sims}",
    })
except Exception as e:
    results.append({"test_id": "multilingual-001", "category": "multilingual",
        "score": 0, "max_score": 5, "latency_ms": 0,
        "response": "", "score_rationale": f"ERROR: {e}"})

# ---- speed-001 ----
try:
    sample_text = "Machine learning is a branch of artificial intelligence that enables computers to learn from experience. It uses algorithms to parse data, learn from it, and make informed decisions. Deep learning is a subset of ML that uses neural networks with many layers. These systems can recognize patterns in images, text, and audio with remarkable accuracy."

    t0 = time.time()
    for _ in range(10):
        embed(model, sample_text)
    total_ms = int((time.time() - t0) * 1000)

    if total_ms < 5000:
        score = 5
    elif total_ms < 10000:
        score = 4
    elif total_ms < 20000:
        score = 3
    elif total_ms < 60000:
        score = 2
    else:
        score = 1

    results.append({
        "test_id": "speed-001", "category": "speed",
        "score": score, "max_score": 5,
        "latency_ms": total_ms,
        "response": f"10 embeddings in {total_ms}ms ({total_ms//10}ms avg)",
        "score_rationale": f"10x embed: {total_ms}ms total, {total_ms//10}ms avg",
    })
except Exception as e:
    results.append({"test_id": "speed-001", "category": "speed",
        "score": 0, "max_score": 5, "latency_ms": 0,
        "response": "", "score_rationale": f"ERROR: {e}"})

print(json.dumps(results))
"""


def run_remote_python(host: str, script: str, model: str) -> list:
    """Run a Python script on the remote host via SSH using base64 to avoid quoting issues."""
    import base64
    filled = script.replace("{model}", model)
    encoded = base64.b64encode(filled.encode()).decode()
    remote_cmd = f"echo {encoded} | base64 -d | python3"
    cmd = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", host, remote_cmd]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            print(f"SSH error: {result.stderr[:200]}", file=sys.stderr)
            return []
        # Extract JSON from output (last line)
        for line in reversed(result.stdout.strip().splitlines()):
            if line.strip().startswith('['):
                return json.loads(line.strip())
        return []
    except subprocess.TimeoutExpired:
        print(f"Timeout after 300s", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return []


def run_benchmark(model: str, host: str) -> dict:
    """Run embedding benchmark suite on remote host."""
    print(f"\n🧮 Embedding benchmark: {model} @ {host}")
    print("  Tests: similarity, retrieval, multilingual, speed")

    t0 = time.time()
    results = run_remote_python(host, REMOTE_PYTHON, model)
    total_elapsed = int((time.time() - t0) * 1000)

    if not results:
        print("  ❌ Geen resultaten ontvangen")
        return {}

    for r in results:
        status = "✓" if r["score"] >= 3 else "✗"
        print(f"  {status} {r['test_id']}: {r['score']}/{r['max_score']} — {r.get('score_rationale','')[:70]}")

    total = sum(r["score"] for r in results)
    max_total = sum(r["max_score"] for r in results)
    pct = round(total / max_total * 100, 1) if max_total else 0
    avg = round(total / len(results), 2) if results else 0

    model_safe = model.replace(":", "-").replace("/", "-").replace(".", "-")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    run_id = f"{timestamp}-{model_safe}"

    run = {
        "run_id": run_id,
        "model": model,
        "model_short": model.split(":")[0],
        "suite": "embedding-v1",
        "host": host,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_elapsed_ms": total_elapsed,
        "results": results,
        "summary": {
            "total_score": total,
            "max_score": max_total,
            "pct_score": pct,
            "avg_score": avg,
            "by_category": {r["category"]: r["score"] for r in results},
            "scorer": "automatic",
        },
    }

    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    run_path = RUNS_DIR / f"{run_id}.json"
    run_path.write_text(json.dumps(run, indent=2, ensure_ascii=False))
    print(f"\n  📊 Score: {total}/{max_total} = {pct}%")
    print(f"  💾 Opgeslagen: {run_path.name}")
    return run


def main():
    parser = argparse.ArgumentParser(description="Benchmark embedding modellen op Hetzner")
    parser.add_argument("--model", default="nomic-embed-text", help="Model naam")
    parser.add_argument("--host", default="hetzner-agent", help="SSH host")
    args = parser.parse_args()

    run = run_benchmark(args.model, args.host)
    if run:
        print(f"\n✅ Klaar! Genereer leaderboard: python3 tools/benchmark_aggregate.py")


if __name__ == "__main__":
    main()
