"""Self-improvement engine — observes system signals and proposes what to build next.

Philosophy (D-105): Code is deterministic (signals), AI is intelligent (proposals).
collect_signals() is pure Python. analyze() calls claude -p.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .config import OA_DIR

PROPOSALS_PATH = OA_DIR / "improvement-proposals.json"

_REPO_ROOT = Path(os.environ.get("OA_REPO_ROOT", str(Path(__file__).parents[3])))


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class ImprovementProposal:
    priority: int          # 1=hoog, 2=medium, 3=laag
    category: str          # "reliability" | "ux" | "coverage" | "documentation" | "architecture"
    observation: str       # wat het systeem zag (deterministisch vastgesteld)
    proposal: str          # wat er gebouwd moet worden (AI-gegenereerd)
    oa_run_cmd: str        # kant-en-klaar oa run commando om het uit te voeren
    rationale: str         # waarom dit waardevol is


# ---------------------------------------------------------------------------
# Signal collection (deterministic — pure Python, no AI)
# ---------------------------------------------------------------------------

def collect_signals(repo_root: Optional[Path] = None) -> dict:
    """Collect all observable signals from the system. No AI involved."""
    root = repo_root or _REPO_ROOT
    signals: dict = {}

    # --- agents.json: fail rate per model, avg duration, fail patterns ---
    agents_path = OA_DIR / "agents.json"
    try:
        agents_raw = json.loads(agents_path.read_text(encoding="utf-8"))
        total = len(agents_raw)
        failed = sum(1 for a in agents_raw.values() if a.get("status") == "failed")
        models: dict[str, dict] = {}
        for a in agents_raw.values():
            m = a.get("model", "unknown")
            if m not in models:
                models[m] = {"total": 0, "failed": 0}
            models[m]["total"] += 1
            if a.get("status") == "failed":
                models[m]["failed"] += 1

        model_stats = []
        for m, s in models.items():
            rate = round(s["failed"] / s["total"] * 100, 1) if s["total"] else 0
            model_stats.append(f"{m}: {s['failed']}/{s['total']} failed ({rate}%)")

        signals["agents_total"] = total
        signals["agents_failed"] = failed
        signals["agents_fail_rate_pct"] = round(failed / total * 100, 1) if total else 0
        signals["agents_model_stats"] = model_stats
    except Exception as e:
        signals["agents_total"] = 0
        signals["agents_failed"] = 0
        signals["agents_fail_rate_pct"] = 0
        signals["agents_model_stats"] = []
        signals["agents_error"] = str(e)

    # --- po-decisions.json: BLOCK/WARN patterns ---
    po_path = OA_DIR / "po-decisions.json"
    try:
        po_raw = json.loads(po_path.read_text(encoding="utf-8"))
        po_total = len(po_raw)
        po_blocks = sum(1 for p in po_raw if p.get("verdict") == "BLOCK")
        po_warns = sum(1 for p in po_raw if p.get("verdict") == "WARN")
        signals["po_total"] = po_total
        signals["po_blocks"] = po_blocks
        signals["po_warns"] = po_warns
        signals["po_block_rate_pct"] = round(po_blocks / po_total * 100, 1) if po_total else 0
    except Exception as e:
        signals["po_total"] = 0
        signals["po_blocks"] = 0
        signals["po_warns"] = 0
        signals["po_block_rate_pct"] = 0
        signals["po_error"] = str(e)

    # --- runs-index.json: error rate ---
    runs_index_path = OA_DIR / "runs-index.json"
    try:
        runs_raw = json.loads(runs_index_path.read_text(encoding="utf-8"))
        if isinstance(runs_raw, list):
            runs_total = len(runs_raw)
            runs_errors = sum(1 for r in runs_raw if r.get("status") in ("failed", "error"))
        elif isinstance(runs_raw, dict):
            runs_total = len(runs_raw)
            runs_errors = sum(1 for r in runs_raw.values() if r.get("status") in ("failed", "error"))
        else:
            runs_total = 0
            runs_errors = 0
        signals["runs_total"] = runs_total
        signals["runs_errors"] = runs_errors
        signals["runs_error_rate_pct"] = round(runs_errors / runs_total * 100, 1) if runs_total else 0
    except Exception as e:
        signals["runs_total"] = 0
        signals["runs_errors"] = 0
        signals["runs_error_rate_pct"] = 0
        signals["runs_error"] = str(e)

    # --- LESSONS.md: count + recency ---
    lessons_path = root / "LESSONS.md"
    try:
        if lessons_path.exists():
            text = lessons_path.read_text(encoding="utf-8", errors="replace")
            lesson_entries = [l for l in text.splitlines() if l.startswith("## ") or l.startswith("### ")]
            signals["lessons_count"] = len(lesson_entries)
            mtime = datetime.fromtimestamp(lessons_path.stat().st_mtime, tz=timezone.utc)
            signals["lessons_days_old"] = (datetime.now(tz=timezone.utc) - mtime).days
        else:
            signals["lessons_count"] = 0
            signals["lessons_days_old"] = None
    except Exception as e:
        signals["lessons_count"] = 0
        signals["lessons_days_old"] = None
        signals["lessons_error"] = str(e)

    # --- core_files.get_stale_files() ---
    try:
        from .core_files import get_status
        statuses = get_status(root)
        stale = [s["name"] for s in statuses if s.get("is_stale") or not s.get("exists")]
        signals["stale_core_files"] = stale
        signals["stale_core_files_count"] = len(stale)
    except Exception as e:
        signals["stale_core_files"] = []
        signals["stale_core_files_count"] = 0
        signals["core_files_error"] = str(e)

    # --- invocation-scores.json: low prompt scores ---
    scores_path = OA_DIR / "invocation-scores.json"
    try:
        if scores_path.exists():
            scores_raw = json.loads(scores_path.read_text(encoding="utf-8"))
            if isinstance(scores_raw, list):
                low_scores = [s for s in scores_raw if s.get("score", 10) < 5]
            elif isinstance(scores_raw, dict):
                low_scores = [v for v in scores_raw.values() if v.get("score", 10) < 5]
            else:
                low_scores = []
            signals["low_score_prompts"] = len(low_scores)
        else:
            signals["low_score_prompts"] = 0
    except Exception as e:
        signals["low_score_prompts"] = 0
        signals["scores_error"] = str(e)

    # --- agents library: template count ---
    try:
        lib_dir = root / "agents" / "library"
        if lib_dir.exists():
            templates = list(lib_dir.rglob("*.json"))
            signals["agent_templates_count"] = len(templates)
        else:
            signals["agent_templates_count"] = 0
    except Exception:
        signals["agent_templates_count"] = 0

    return signals


# ---------------------------------------------------------------------------
# AI analysis
# ---------------------------------------------------------------------------

_ANALYSIS_PROMPT = """\
Je bent een senior software architect die het Open-Agents systeem analyseert.
Je taak: identificeer de belangrijkste verbetergebieden op basis van de observaties hieronder.

## Observaties (deterministisch verzameld)

Agents totaal: {agents_total}
Agents gefaald: {agents_failed} ({agents_fail_rate_pct}%)
Model statistieken: {agents_model_stats}

PO-evaluaties totaal: {po_total}
PO blokkeringen: {po_blocks} ({po_block_rate_pct}%)
PO waarschuwingen: {po_warns}

Runs totaal: {runs_total}
Runs met fouten: {runs_errors} ({runs_error_rate_pct}%)

LESSONS.md entries: {lessons_count}
LESSONS.md ouderdom: {lessons_days_old} dagen

Verouderde kernbestanden: {stale_core_files} ({stale_core_files_count} stuks)

Lage invocation scores: {low_score_prompts} prompts

Agent templates: {agent_templates_count}

## Jouw taak

Genereer 3-7 concrete verbetervoorstellen in EXACT dit formaat (geen afwijkingen):

PROPOSAL
priority: 1
category: reliability
observation: <wat je zag in de data — specifiek en concreet>
proposal: <wat er gebouwd moet worden — specifiek en concreet, geen vage omschrijvingen>
oa_run_cmd: oa run '<taakomschrijving>' --name <naam> --model claude/sonnet --direct
rationale: <waarom dit nu de hoogste prioriteit heeft>
---

Gebruik category uit: reliability, ux, coverage, documentation, architecture
Prioriteit 1 = meest urgent, 3 = nice-to-have.
Genereer minimaal 3, maximaal 7 proposals.
Schrijf alleen de PROPOSAL blokken, geen inleiding of afsluiting.
"""


def _build_model_args(model: str) -> list[str]:
    mapping = {
        "claude/haiku": ["--model", "haiku"],
        "claude/sonnet": ["--model", "sonnet"],
        "claude/opus": ["--model", "opus"],
    }
    return mapping.get(model, [])


def _parse_proposals(text: str) -> list[ImprovementProposal]:
    """Parse AI output into ImprovementProposal objects. Tolerant of formatting variations."""
    proposals = []
    # Split on PROPOSAL headers (with or without leading newline)
    blocks = re.split(r'\bPROPOSAL\b', text)
    for block in blocks:
        if not block.strip():
            continue
        # Remove trailing --- separator
        block = re.sub(r'---\s*$', '', block.strip())

        def _extract(key: str) -> str:
            pattern = rf'(?i)^{re.escape(key)}:\s*(.+)'
            # Single-line extraction: take first match
            for line in block.splitlines():
                m = re.match(pattern, line.strip())
                if m:
                    return m.group(1).strip()
            return ""

        try:
            priority_raw = _extract("priority")
            priority = int(priority_raw) if priority_raw.isdigit() else 2
            category = _extract("category") or "reliability"
            observation = _extract("observation")
            proposal = _extract("proposal")
            oa_run_cmd = _extract("oa_run_cmd")
            rationale = _extract("rationale")

            if not proposal:
                continue  # skip malformed blocks

            proposals.append(ImprovementProposal(
                priority=max(1, min(3, priority)),
                category=category,
                observation=observation,
                proposal=proposal,
                oa_run_cmd=oa_run_cmd,
                rationale=rationale,
            ))
        except Exception:
            continue

    return proposals


def analyze(signals: dict, model: str = "claude/sonnet") -> list[ImprovementProposal]:
    """Feed signals to AI, get back structured improvement proposals."""
    prompt = _ANALYSIS_PROMPT.format(
        agents_total=signals.get("agents_total", 0),
        agents_failed=signals.get("agents_failed", 0),
        agents_fail_rate_pct=signals.get("agents_fail_rate_pct", 0),
        agents_model_stats=", ".join(signals.get("agents_model_stats", [])) or "geen data",
        po_total=signals.get("po_total", 0),
        po_blocks=signals.get("po_blocks", 0),
        po_block_rate_pct=signals.get("po_block_rate_pct", 0),
        po_warns=signals.get("po_warns", 0),
        runs_total=signals.get("runs_total", 0),
        runs_errors=signals.get("runs_errors", 0),
        runs_error_rate_pct=signals.get("runs_error_rate_pct", 0),
        lessons_count=signals.get("lessons_count", 0),
        lessons_days_old=signals.get("lessons_days_old", "onbekend"),
        stale_core_files=signals.get("stale_core_files", []),
        stale_core_files_count=signals.get("stale_core_files_count", 0),
        low_score_prompts=signals.get("low_score_prompts", 0),
        agent_templates_count=signals.get("agent_templates_count", 0),
    )

    model_args = _build_model_args(model)
    cmd = ["claude"] + model_args + ["-p", prompt]

    # Unset CLAUDECODE so claude -p can run from within a Claude Code session.
    run_env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120, env=run_env)
        output = result.stdout.strip()
        if not output:
            output = result.stderr.strip()
    except subprocess.TimeoutExpired:
        return []
    except FileNotFoundError:
        return []
    except Exception:
        return []

    return _parse_proposals(output)


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def save_proposals(proposals: list[ImprovementProposal]) -> Path:
    """Save proposals to ~/.oa/improvement-proposals.json"""
    data = [asdict(p) for p in proposals]
    PROPOSALS_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return PROPOSALS_PATH


def load_proposals() -> list[ImprovementProposal]:
    """Load previously generated proposals."""
    if not PROPOSALS_PATH.exists():
        return []
    try:
        data = json.loads(PROPOSALS_PATH.read_text(encoding="utf-8"))
        return [ImprovementProposal(**p) for p in data]
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Execution
# ---------------------------------------------------------------------------

def run_proposal(proposal: ImprovementProposal) -> bool:
    """Execute the oa_run_cmd of a proposal via subprocess. Returns True if spawned."""
    cmd_str = proposal.oa_run_cmd.strip()
    if not cmd_str:
        return False

    run_env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    try:
        result = subprocess.run(
            cmd_str,
            shell=True,
            env=run_env,
            timeout=30,
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        # Spawning timed out — likely the agent launched but didn't return quickly (OK for tmux)
        return True
    except Exception:
        return False
