"""Agent Selector — intelligent agent and skill selection for oa-cli.

Combines deterministic keyword filtering with optional AI ranking to suggest
the best agent templates and skills for a given task.

Philosophy (D-105):
    Code = deterministic (scan, filter, index)
    AI = intelligent (ranking, fitness judgement)
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .config import OA_DIR

_INDEX_CACHE_PATH = OA_DIR / "agent-index.json"


@dataclass
class AgentMatch:
    agent_id: str
    name: str
    category: str
    description: str
    model_hint: str
    tags: list[str]
    score: float        # 0.0-1.0 keyword match score
    ai_rank: int | None  # AI-given rank (1=best), None if not AI-ranked
    rationale: str      # why this agent fits
    template_path: str


@dataclass
class SkillMatch:
    skill_id: str
    name: str
    path: str
    description: str
    score: float
    rationale: str


# ---------------------------------------------------------------------------
# Index building & caching
# ---------------------------------------------------------------------------

def build_index(library_dir: Path) -> list[dict]:
    """Scan all JSON templates in library_dir, build in-memory index.

    Cache to ~/.oa/agent-index.json (rebuilt if library is newer).
    Each entry: id, name, category, description, tags, modelHint, path.
    """
    if not library_dir.exists():
        return []

    # Check cache freshness
    if _INDEX_CACHE_PATH.exists():
        cache_mtime = _INDEX_CACHE_PATH.stat().st_mtime
        lib_mtime = _newest_mtime(library_dir)
        if lib_mtime <= cache_mtime:
            try:
                cached = json.loads(_INDEX_CACHE_PATH.read_text(encoding="utf-8"))
                if isinstance(cached, list) and cached:
                    return cached
            except Exception:
                pass

    # Build fresh index
    index: list[dict] = []
    for json_file in library_dir.rglob("*.json"):
        if "_archive" in json_file.parts:
            continue
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
        except Exception:
            continue

        if not isinstance(data, dict):
            continue

        entry = {
            "id": data.get("id", json_file.stem),
            "name": data.get("name", json_file.stem),
            "category": data.get("category", ""),
            "description": data.get("description", ""),
            "tags": data.get("tags", []),
            "modelHint": data.get("modelHint", ""),
            "path": str(json_file),
        }
        index.append(entry)

    # Persist cache
    _INDEX_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        _INDEX_CACHE_PATH.write_text(json.dumps(index, indent=2), encoding="utf-8")
    except Exception:
        pass

    return index


def _newest_mtime(directory: Path) -> float:
    """Return the newest mtime of any .json file in directory (recursive)."""
    newest = 0.0
    for f in directory.rglob("*.json"):
        try:
            mtime = f.stat().st_mtime
            if mtime > newest:
                newest = mtime
        except OSError:
            pass
    return newest


# ---------------------------------------------------------------------------
# Keyword filtering (deterministic, <100ms for 1626 templates)
# ---------------------------------------------------------------------------

def keyword_filter(task: str, index: list[dict], top_n: int = 20) -> list[dict]:
    """Deterministic: score each agent on keyword overlap with task.

    Search in: name, description, tags, category.
    Score = weighted overlap (tags=3x, description=2x, name=2x, category=1x).
    Returns top_n sorted by score descending.
    """
    task_words = _tokenize(task)
    if not task_words:
        return index[:top_n]

    scored: list[tuple[float, dict]] = []
    for entry in index:
        score = _score_entry(task_words, entry)
        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    max_score = scored[0][0] if scored else 1.0
    for s, e in scored[:top_n]:
        entry = dict(e)
        entry["score"] = round(s / max_score, 3) if max_score > 0 else 0.0
        results.append(entry)
    return results


def _tokenize(text: str) -> set[str]:
    """Split text into lowercase tokens, ignoring short words."""
    words = re.findall(r"[a-z][a-z0-9_-]*", text.lower())
    return {w for w in words if len(w) >= 3}


def _score_entry(task_words: set[str], entry: dict) -> float:
    """Compute weighted keyword overlap score for one template entry."""
    score = 0.0

    # Tags: 3x weight
    for tag in entry.get("tags", []):
        tag_words = _tokenize(tag)
        overlap = len(task_words & tag_words)
        score += overlap * 3.0

    # Description: 2x weight
    desc_words = _tokenize(entry.get("description", ""))
    score += len(task_words & desc_words) * 2.0

    # Name: 2x weight
    name_words = _tokenize(entry.get("name", ""))
    score += len(task_words & name_words) * 2.0

    # Category: 1x weight
    cat_words = _tokenize(entry.get("category", ""))
    score += len(task_words & cat_words) * 1.0

    # Normalize by task word count to get 0.0-1.0 range
    if task_words:
        max_possible = len(task_words) * (3 + 2 + 2 + 1)
        score = min(score / max_possible, 1.0) if max_possible > 0 else 0.0

    return score


# ---------------------------------------------------------------------------
# AI ranking (intelligent, with timeout + fallback)
# ---------------------------------------------------------------------------

_AI_RANK_PROMPT = """\
Je bent een agent-selector. Kies de 3 meest geschikte agents voor deze taak.

Taak: {task}

Kandidaten:
{candidates_list}

Output exact dit formaat (herhaal voor elke keuze):
RANK 1
id: <agent-id>
rationale: <1 zin waarom dit de beste keuze is>
---
RANK 2
id: <agent-id>
rationale: <1 zin waarom dit de beste keuze is>
---
RANK 3
id: <agent-id>
rationale: <1 zin waarom dit de beste keuze is>
---
"""


def ai_rank(
    task: str,
    candidates: list[dict],
    model: str = "claude/sonnet",
    timeout: int = 60,
) -> list[AgentMatch]:
    """AI ranks candidates by fitness for the task.

    Sends task + candidate list to claude. Parses response into AgentMatch
    objects with ai_rank and rationale. Unsets CLAUDECODE (same pattern as
    po_agent.py). On failure, returns keyword-filtered results without AI ranking.
    """
    if not candidates:
        return []

    # Build candidates list for prompt
    lines = []
    for c in candidates:
        tags_str = ", ".join(c.get("tags", []))
        lines.append(
            f"- id: {c['id']}\n"
            f"  name: {c['name']}\n"
            f"  category: {c.get('category', '')}\n"
            f"  description: {c.get('description', '')}\n"
            f"  tags: {tags_str}"
        )
    candidates_list = "\n\n".join(lines)

    prompt = _AI_RANK_PROMPT.format(task=task, candidates_list=candidates_list)

    # Map model shorthand to claude CLI args
    model_map = {
        "claude/haiku": ["--model", "haiku"],
        "claude/sonnet": ["--model", "sonnet"],
        "claude/opus": ["--model", "opus"],
    }
    model_args = model_map.get(model, [])
    cmd = ["claude"] + model_args + ["-p", prompt]

    # Unset CLAUDECODE so claude -p can run from within a Claude Code session
    run_env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout, env=run_env
        )
        output = result.stdout.strip()
    except subprocess.TimeoutExpired:
        output = ""
    except Exception:
        output = ""

    if not output:
        # Fallback: return candidates as AgentMatch without AI ranking
        return _candidates_to_matches(candidates)

    ranked = _parse_ai_response(output, candidates)
    if not ranked:
        return _candidates_to_matches(candidates)

    return ranked


def _parse_ai_response(output: str, candidates: list[dict]) -> list[AgentMatch]:
    """Parse RANK N / id: / rationale: blocks from AI response."""
    candidate_map = {c["id"]: c for c in candidates}
    matches: list[AgentMatch] = []
    seen_ids: set[str] = set()

    # Split on --- separator
    blocks = re.split(r"^---\s*$", output, flags=re.MULTILINE)

    for block in blocks:
        rank_match = re.search(r"RANK\s+(\d+)", block, re.IGNORECASE)
        id_match = re.search(r"^id:\s*(.+)$", block, re.MULTILINE)
        rationale_match = re.search(r"^rationale:\s*(.+)$", block, re.MULTILINE)

        if not rank_match or not id_match:
            continue

        rank = int(rank_match.group(1))
        agent_id = id_match.group(1).strip()
        rationale = rationale_match.group(1).strip() if rationale_match else ""

        if agent_id in seen_ids:
            continue
        seen_ids.add(agent_id)

        candidate = candidate_map.get(agent_id)
        if not candidate:
            # Try partial match
            for cid, c in candidate_map.items():
                if agent_id in cid or cid in agent_id:
                    candidate = c
                    agent_id = cid
                    break

        if candidate:
            matches.append(AgentMatch(
                agent_id=candidate["id"],
                name=candidate["name"],
                category=candidate.get("category", ""),
                description=candidate.get("description", ""),
                model_hint=candidate.get("modelHint", ""),
                tags=candidate.get("tags", []),
                score=0.0,
                ai_rank=rank,
                rationale=rationale,
                template_path=candidate.get("path", ""),
            ))

    matches.sort(key=lambda m: m.ai_rank or 999)
    return matches


def _candidates_to_matches(candidates: list[dict]) -> list[AgentMatch]:
    """Convert raw candidate dicts to AgentMatch without AI ranking."""
    return [
        AgentMatch(
            agent_id=c["id"],
            name=c["name"],
            category=c.get("category", ""),
            description=c.get("description", ""),
            model_hint=c.get("modelHint", ""),
            tags=c.get("tags", []),
            score=0.0,
            ai_rank=None,
            rationale="",
            template_path=c.get("path", ""),
        )
        for c in candidates
    ]


# ---------------------------------------------------------------------------
# Main entry points
# ---------------------------------------------------------------------------

def find_agents(
    task: str,
    library_dir: Optional[Path] = None,
    top_n: int = 5,
    use_ai: bool = True,
    model: str = "claude/sonnet",
) -> list[AgentMatch]:
    """Main entry: index → keyword_filter → ai_rank → top_n results."""
    if library_dir is None:
        # Default: repo root / agents / library
        library_dir = Path(__file__).parents[3] / "agents" / "library"

    index = build_index(library_dir)
    if not index:
        return []

    # Keyword filter: get top 20 candidates
    candidates = keyword_filter(task, index, top_n=20)
    if not candidates:
        return []

    if use_ai:
        ranked = ai_rank(task, candidates, model=model)
        # Attach keyword scores to AI-ranked results
        score_map = {c["id"]: _score_entry(_tokenize(task), c) for c in candidates}
        for m in ranked:
            m.score = score_map.get(m.agent_id, 0.0)
        # Return top_n from AI-ranked, then fill with remaining keyword matches
        ai_ids = {m.agent_id for m in ranked}
        remaining = [
            AgentMatch(
                agent_id=c["id"],
                name=c["name"],
                category=c.get("category", ""),
                description=c.get("description", ""),
                model_hint=c.get("modelHint", ""),
                tags=c.get("tags", []),
                score=score_map.get(c["id"], 0.0),
                ai_rank=None,
                rationale="",
                template_path=c.get("path", ""),
            )
            for c in candidates if c["id"] not in ai_ids
        ]
        combined = ranked + remaining
        return combined[:top_n]
    else:
        # Pure keyword results
        task_words = _tokenize(task)
        results = []
        for c in candidates[:top_n]:
            score = _score_entry(task_words, c)
            results.append(AgentMatch(
                agent_id=c["id"],
                name=c["name"],
                category=c.get("category", ""),
                description=c.get("description", ""),
                model_hint=c.get("modelHint", ""),
                tags=c.get("tags", []),
                score=score,
                ai_rank=None,
                rationale="",
                template_path=c.get("path", ""),
            ))
        return results


def find_skills(task: str, top_n: int = 3) -> list[SkillMatch]:
    """Scan skill registry, keyword-match on task, return top_n.

    Searches in: skill name, SKILL.md first 20 lines (description/trigger words).
    No AI needed — keyword matching is sufficient for skills.
    """
    from .skill_registry import scan_skills

    try:
        all_skills = scan_skills()
    except Exception:
        return []

    task_words = _tokenize(task)
    if not task_words:
        return []

    scored: list[tuple[float, SkillMatch]] = []

    for name, match in all_skills.items():
        score = 0.0

        # Score on skill name (2x)
        name_words = _tokenize(name)
        score += len(task_words & name_words) * 2.0

        # Score on description from frontmatter (2x)
        if match.description:
            desc_words = _tokenize(match.description)
            score += len(task_words & desc_words) * 2.0

        # Score on tags (3x)
        for tag in match.tags:
            tag_words = _tokenize(tag)
            score += len(task_words & tag_words) * 3.0

        # Score on first 20 lines of SKILL.md body (1x)
        try:
            content = match.path.read_text(encoding="utf-8", errors="replace")
            lines = content.splitlines()[:20]
            preview = " ".join(lines)
            preview_words = _tokenize(preview)
            score += len(task_words & preview_words) * 1.0
        except Exception:
            pass

        if score > 0:
            max_possible = len(task_words) * (2 + 2 + 3 + 1)
            normalized = min(score / max_possible, 1.0) if max_possible > 0 else 0.0
            result = SkillMatch(
                skill_id=name,
                name=name,
                path=str(match.path),
                description=match.description,
                score=normalized,
                rationale=f"Keyword overlap: {score:.1f}",
            )
            scored.append((normalized, result))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [s for _, s in scored[:top_n]]
