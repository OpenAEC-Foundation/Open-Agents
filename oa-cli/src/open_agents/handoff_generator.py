"""Handoff generator — schrijft een HANDOFF-<datum>.md document.

Secties: Context, Lopende Agents, Recente Commits, Open Backlog, Volgende Stap.
"""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

REPO_ROOT = Path("/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents")
DOCS_DIR = REPO_ROOT / "docs"
OA_DIR = Path.home() / ".oa"


def _running_agents() -> str:
    """Return a markdown list of currently running agents from agents.json."""
    agents_file = OA_DIR / "agents.json"
    if not agents_file.exists():
        return "_Geen lopende agents gevonden._"
    try:
        data = json.loads(agents_file.read_text())
        running = [
            f"- **{name}** — status: {rec.get('status', '?')}, model: {rec.get('model', '?')}"
            for name, rec in data.items()
            if rec.get("status") in ("running", "idle", "spawned")
        ]
        return "\n".join(running) if running else "_Geen lopende agents._"
    except Exception as exc:
        return f"_Fout bij ophalen agents: {exc}_"


def _recent_commits(n: int = 10) -> str:
    """Return last N git commits as markdown list."""
    try:
        result = subprocess.run(
            ["git", "log", f"--oneline", f"-{n}"],
            capture_output=True,
            text=True,
            cwd=str(REPO_ROOT),
            timeout=10,
        )
        lines = result.stdout.strip().splitlines()
        if not lines:
            return "_Geen commits gevonden._"
        return "\n".join(f"- `{line}`" for line in lines)
    except Exception as exc:
        return f"_Fout bij ophalen commits: {exc}_"


def _open_backlog() -> str:
    """Return open backlog items from ROADMAP.md or a .backlog file if present."""
    candidates = [
        REPO_ROOT / "ROADMAP.md",
        REPO_ROOT / "docs" / "ROADMAP.md",
        REPO_ROOT / ".backlog",
    ]
    for path in candidates:
        if path.exists():
            text = path.read_text(encoding="utf-8")
            # Extract lines with TODO / [ ] / open markers (first 20)
            items = [
                line.strip()
                for line in text.splitlines()
                if any(marker in line for marker in ["[ ]", "TODO", "- #", "| open"])
            ][:20]
            if items:
                return "\n".join(f"- {item.lstrip('- ')}" for item in items)
    return "_Geen open backlog gevonden._"


def generate_handoff(session_summary: Optional[str] = None) -> str:
    """Generate a handoff document and write it to docs/HANDOFF-<datum>.md.

    Args:
        session_summary: Optional summary text to include in the Context section.

    Returns:
        Absolute path to the written handoff document.
    """
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    date_str = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    output_path = DOCS_DIR / f"HANDOFF-{date_str}.md"

    context_block = session_summary or "_Geen samenvatting opgegeven. Zie recente commits voor context._"
    agents_block = _running_agents()
    commits_block = _recent_commits()
    backlog_block = _open_backlog()

    document = f"""# Handoff — {date_str}

> Gegenereerd door `oa handoff`. Geef dit document mee aan de volgende sessie.

---

## Context

{context_block}

---

## Lopende Agents

{agents_block}

---

## Recente Commits

{commits_block}

---

## Open Backlog

{backlog_block}

---

## Volgende Stap

1. Lees dit document aan het begin van de sessie.
2. Controleer lopende agents met `oa status`.
3. Beslis welke taken prioriteit hebben op basis van het backlog.
4. Gebruik `oa run` of `oa pipeline` voor de eerst volgende taak.

---
_Gegenereerd: {datetime.now(tz=timezone.utc).isoformat()}_
"""

    output_path.write_text(document, encoding="utf-8")
    return str(output_path)
