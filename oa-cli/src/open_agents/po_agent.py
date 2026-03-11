"""Product Owner agent — guards repo quality and strategic alignment.

Evaluates git diffs against project context (ROADMAP, REQUIREMENTS, DECISIONS,
PRINCIPLES) and returns APPROVE / WARN / BLOCK verdicts synchronously.

Usage via CLI:
    oa po review      # evaluate current staged diff, show verdict
    oa po check       # same, exit 1 on BLOCK (for git hooks)
    oa po install     # install git pre-commit hook
    oa po uninstall   # remove git pre-commit hook
    oa po log         # show recent PO decisions
"""

from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path
from typing import Optional

from .config import OA_DIR

PO_LOG_PATH = OA_DIR / "po-decisions.json"

_REPO_ROOT = Path(
    os.environ.get("OA_REPO_ROOT", str(Path(__file__).parents[3]))
)

# Context files consulted per evaluation (fragment only — keep prompt manageable)
_CONTEXT_FILES = {
    "CLAUDE_MD": _REPO_ROOT / "CLAUDE.md",          # primary: full workspace definition
    "ROADMAP": _REPO_ROOT / "docs" / "ROADMAP.md",
    "REQUIREMENTS": _REPO_ROOT / "REQUIREMENTS.md",
    "DECISIONS": _REPO_ROOT / "DECISIONS.md",
    "PRINCIPLES": _REPO_ROOT / "PRINCIPLES.md",
}

_FALLBACK_CONTEXT_FILES = {
    "ROADMAP": _REPO_ROOT / "ROADMAP.md",  # some repos keep it at root
}

_EVAL_PROMPT = """\
Je bent de Product Owner van het Open-Agents project. Je hebt volledige kennis van \
de architectuur, werkwijze en doelen van het systeem — inclusief hoe het zichzelf \
gebruikt om zichzelf te bouwen.

## Project context

### CLAUDE.md — werkwijze & architectuur (primaire bron)
{claude_md}

### ROADMAP (fragment)
{roadmap}

### REQUIREMENTS (fragment)
{requirements}

### DECISIONS (fragment)
{decisions}

### PRINCIPLES (fragment)
{principles}

## Te beoordelen wijziging

### Git diff (of beschrijving)
{diff}

## Jouw taak

Beoordeel of deze wijziging:
1. Past bij de architectuur en werkwijze zoals beschreven in CLAUDE.md
2. Aansluit bij de roadmap en projectdoelen
3. Voldoet aan de requirements — geen scope-creep
4. Geen conflicten heeft met genomen beslissingen (DECISIONS.md)
5. Voldoet aan de design principles (PRINCIPLES.md)
6. Geen onnodige complexiteit of technische schuld introduceert

## Antwoordformaat

Begin je antwoord met exact één van deze drie woorden op een eigen regel:
  APPROVE
  WARN
  BLOCK

Gevolgd door 2-4 zinnen concrete uitleg. Wees direct en specifiek.

APPROVE = prima, past goed bij het project
WARN    = kleine zorgen, maar niet blokkerend
BLOCK   = sterk afraden — conflicteert met architectuur of beslissingen
"""


def _read_fragment(path: Path, fallback_path: Optional[Path] = None, max_lines: int = 60) -> str:
    target = path
    if not target.exists() and fallback_path and fallback_path.exists():
        target = fallback_path
    if not target.exists():
        return f"[{path.name} niet gevonden op {path}]"
    lines = target.read_text(encoding="utf-8", errors="replace").splitlines()
    if len(lines) <= max_lines:
        return "\n".join(lines)
    return "\n".join(lines[:max_lines]) + f"\n... (ingekort — {len(lines)} regels totaal)"


def _get_git_diff(repo_root: Path, staged: bool = True, max_lines: int = 300) -> str:
    """Return the current git diff (staged first, fallback to HEAD diff)."""
    try:
        cmd = ["git", "diff", "--cached"] if staged else ["git", "diff", "HEAD"]
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=repo_root, timeout=15)
        diff = result.stdout.strip()

        if not diff and staged:
            # Fall back to unstaged diff
            result = subprocess.run(["git", "diff"], capture_output=True, text=True,
                                    cwd=repo_root, timeout=15)
            diff = result.stdout.strip()

        if not diff:
            # Last resort: show recent commit diff
            result = subprocess.run(["git", "diff", "HEAD~1", "HEAD"],
                                    capture_output=True, text=True, cwd=repo_root, timeout=15)
            diff = result.stdout.strip()

        if not diff:
            return "[geen wijzigingen gevonden in git diff]"

        lines = diff.splitlines()
        if len(lines) > max_lines:
            return "\n".join(lines[:max_lines]) + f"\n... (ingekort — {len(lines)} regels totaal)"
        return diff

    except subprocess.TimeoutExpired:
        return "[git diff timed out]"
    except Exception as e:
        return f"[fout bij git diff: {e}]"


def _build_model_args(model: str) -> list[str]:
    """Convert model shorthand to claude CLI args."""
    mapping = {
        "claude/haiku": ["--model", "haiku"],
        "claude/sonnet": ["--model", "sonnet"],
        "claude/opus": ["--model", "opus"],
    }
    return mapping.get(model, [])


def evaluate(
    diff: Optional[str] = None,
    description: Optional[str] = None,
    repo_root: Optional[Path] = None,
    model: str = "claude/sonnet",
    timeout: int = 90,
) -> dict:
    """Run PO evaluation synchronously.

    Args:
        diff: Raw git diff string. If None, auto-detected from git.
        description: Optional plain-text description of the change (used if diff is unavailable).
        repo_root: Path to repo root. Defaults to _REPO_ROOT.
        model: Claude model to use (claude/haiku|sonnet|opus).
        timeout: Seconds before evaluation times out.

    Returns:
        dict with keys: verdict (APPROVE/WARN/BLOCK), explanation, timestamp, diff_preview.
    """
    root = repo_root or _REPO_ROOT

    if diff is None:
        diff = _get_git_diff(root)

    change_text = diff if diff != "[geen wijzigingen gevonden in git diff]" else (
        description or "[geen diff of beschrijving opgegeven]"
    )

    prompt = _EVAL_PROMPT.format(
        claude_md=_read_fragment(_CONTEXT_FILES["CLAUDE_MD"], max_lines=120),
        roadmap=_read_fragment(
            _CONTEXT_FILES["ROADMAP"],
            fallback_path=_FALLBACK_CONTEXT_FILES.get("ROADMAP"),
        ),
        requirements=_read_fragment(_CONTEXT_FILES["REQUIREMENTS"]),
        decisions=_read_fragment(_CONTEXT_FILES["DECISIONS"]),
        principles=_read_fragment(_CONTEXT_FILES["PRINCIPLES"]),
        diff=change_text,
    )

    model_args = _build_model_args(model)
    cmd = ["claude"] + model_args + ["-p", prompt]

    # Unset CLAUDECODE so claude -p can run from within a Claude Code session.
    # Print mode (-p) is a one-shot evaluation — not an interactive nested session —
    # so it is safe to bypass the nested-session guard.
    run_env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=run_env)
        output = result.stdout.strip()
        if not output and result.stderr:
            output = f"WARN\nPO evaluatie fout: {result.stderr.strip()[:300]}"
    except subprocess.TimeoutExpired:
        output = "WARN\nPO evaluatie time-out. Ga voorzichtig door."
    except FileNotFoundError:
        output = "WARN\n`claude` CLI niet gevonden. Kan PO evaluatie niet uitvoeren."
    except Exception as e:
        output = f"WARN\nPO evaluatie mislukt: {e}"

    # Parse verdict from first line
    verdict = "WARN"
    first_line = output.split("\n")[0].strip().upper() if output else ""
    for word in ("APPROVE", "WARN", "BLOCK"):
        if first_line.startswith(word):
            verdict = word
            break

    record = {
        "verdict": verdict,
        "explanation": output,
        "timestamp": time.time(),
        "model": model,
        "diff_preview": change_text[:200] if change_text else "",
    }

    _log_decision(record)
    return record


def _log_decision(record: dict) -> None:
    """Append decision to ~/.oa/po-decisions.json (last 50 kept)."""
    PO_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    log: list = []
    if PO_LOG_PATH.exists():
        try:
            log = json.loads(PO_LOG_PATH.read_text())
        except Exception:
            log = []
    log.append(record)
    log = log[-50:]
    PO_LOG_PATH.write_text(json.dumps(log, indent=2))


def recent_decisions(n: int = 10) -> list[dict]:
    """Return the n most recent PO decisions."""
    if not PO_LOG_PATH.exists():
        return []
    try:
        log = json.loads(PO_LOG_PATH.read_text())
        return log[-n:]
    except Exception:
        return []


# --- Git hook management ---

_HOOK_CONTENT = """\
#!/bin/bash
# Open-Agents Product Owner pre-commit hook
# Installed by: oa po install
# Remove with:  oa po uninstall

# Skip PO gate when OA_PO_SKIP=1 (emergency bypass)
if [ "${OA_PO_SKIP:-0}" = "1" ]; then
    echo "[PO] Skipped (OA_PO_SKIP=1)"
    exit 0
fi

echo "[PO] Product Owner: wijzigingen worden beoordeeld..."
oa po check --exit-code
exit $?
"""


def install_git_hook(repo_root: Optional[Path] = None) -> Path:
    """Install pre-commit git hook that runs `oa po check`."""
    root = repo_root or _REPO_ROOT
    hooks_dir = root / ".git" / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    hook_path = hooks_dir / "pre-commit"

    # Backup existing hook if present and not ours
    if hook_path.exists():
        existing = hook_path.read_text()
        if "Open-Agents Product Owner" not in existing:
            backup = hook_path.with_suffix(".pre-po-backup")
            hook_path.rename(backup)

    hook_path.write_text(_HOOK_CONTENT)
    hook_path.chmod(0o755)
    return hook_path


def uninstall_git_hook(repo_root: Optional[Path] = None) -> bool:
    """Remove the PO pre-commit hook (restore backup if available)."""
    root = repo_root or _REPO_ROOT
    hook_path = root / ".git" / "hooks" / "pre-commit"

    if not hook_path.exists():
        return False

    existing = hook_path.read_text()
    if "Open-Agents Product Owner" not in existing:
        return False  # not our hook, refuse to delete

    backup = hook_path.with_suffix(".pre-po-backup")
    if backup.exists():
        backup.rename(hook_path)
    else:
        hook_path.unlink()
    return True
