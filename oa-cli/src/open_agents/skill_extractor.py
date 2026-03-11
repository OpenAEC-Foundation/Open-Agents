"""Auto-skill-creation hook — detect patterns and extract reusable skills. (#23)"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from typing import Optional

OA_DIR = Path.home() / ".oa"
SKILLS_DIR = OA_DIR / "skills"
RUNS_DIR = OA_DIR / "runs"


def _load_run_output(run_id: str) -> Optional[str]:
    """Load the output text for a given run_id.

    Searches for result.md inside run workspaces under /tmp/.
    Falls back to RUNS_DIR/<run_id>/result.md.

    Returns:
        Output text, or None if not found.
    """
    # Try ~/.oa/runs/<run_id>/result.md first
    candidate = RUNS_DIR / run_id / "result.md"
    if candidate.exists():
        return candidate.read_text()

    # Try /tmp/oa-agent-<run_id>/output/result.md (common workspace pattern)
    tmp_candidate = Path(f"/tmp/oa-agent-{run_id}") / "output" / "result.md"
    if tmp_candidate.exists():
        return tmp_candidate.read_text()

    return None


def _extract_keywords(text: str, top_n: int = 8) -> list[str]:
    """Extract the most frequent meaningful words from text as trigger keywords."""
    words = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]{3,}\b', text.lower())
    stopwords = {
        "this", "that", "with", "from", "have", "will", "been", "when",
        "then", "they", "them", "their", "also", "into", "more", "some",
        "each", "only", "using", "used", "make", "made", "file", "path",
    }
    filtered = [w for w in words if w not in stopwords]
    return [word for word, _ in Counter(filtered).most_common(top_n)]


def extract_skill_from_run(run_id: str, skill_name: str) -> Path:
    """Extract a skill template from an agent run's output.

    Reads the run output, infers a skill description and trigger keywords,
    and writes a SKILL.md to ~/.oa/skills/<skill_name>/SKILL.md.

    Args:
        run_id: The agent run identifier (name or uuid).
        skill_name: Short slug for the new skill (e.g. "python-refactor").

    Returns:
        Path to the created SKILL.md file.

    Raises:
        FileNotFoundError: If no output can be found for the given run_id.
    """
    output_text = _load_run_output(run_id)
    if output_text is None:
        raise FileNotFoundError(
            f"No output found for run '{run_id}'. "
            f"Checked {RUNS_DIR / run_id} and /tmp/oa-agent-{run_id}."
        )

    keywords = _extract_keywords(output_text)
    first_paragraph = (output_text.strip().split("\n\n")[0])[:300].strip()

    skill_dir = SKILLS_DIR / skill_name
    skill_dir.mkdir(parents=True, exist_ok=True)
    skill_file = skill_dir / "SKILL.md"

    skill_content = f"""---
name: {skill_name}
description: >
  Auto-extracted skill from agent run '{run_id}'.
  {first_paragraph}
trigger-keywords: {json.dumps(keywords)}
user-invocable: false
extracted-from: {run_id}
---

# {skill_name}

## Description

{first_paragraph}

## Trigger keywords

{', '.join(f'`{kw}`' for kw in keywords)}

## Content

{output_text.strip()}
"""
    skill_file.write_text(skill_content)
    return skill_file


def list_skill_candidates(min_runs: int = 3) -> list[str]:
    """List agent names that appear as skill candidates.

    An agent is a candidate when its approach (task description) appears
    in at least `min_runs` separate run workspaces, indicating a recurring
    pattern worth extracting as a reusable skill.

    Args:
        min_runs: Minimum number of runs with the same pattern to qualify.

    Returns:
        List of agent/task slugs that are skill candidates.
    """
    # Collect task descriptions from all discoverable run workspaces
    task_texts: list[str] = []

    # Check ~/.oa/runs/
    if RUNS_DIR.exists():
        for run_dir in RUNS_DIR.iterdir():
            claude_md = run_dir / "CLAUDE.md"
            if claude_md.exists():
                task_texts.append(claude_md.read_text()[:500])

    # Check /tmp/ for active/recent agent workspaces
    for ws in Path("/tmp").glob("oa-agent-*"):
        claude_md = ws / "CLAUDE.md"
        if claude_md.exists():
            task_texts.append(claude_md.read_text()[:500])

    # Compute a coarse fingerprint per task and count occurrences
    fingerprints: list[str] = []
    for text in task_texts:
        # Use the first meaningful heading or first 80 chars as fingerprint
        match = re.search(r'^#+\s+(.+)$', text, re.MULTILINE)
        fp = match.group(1).strip().lower() if match else text[:80].strip().lower()
        # Normalize whitespace
        fp = re.sub(r'\s+', ' ', fp)
        fingerprints.append(fp)

    counts = Counter(fingerprints)
    return [fp for fp, count in counts.items() if count >= min_runs]
