"""Assumption Tracker (#34) — prompt generation and parsing for agent assumptions."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

_ASSUMPTIONS_FILENAME = "assumptions-log.md"

_ASSUMPTION_PROMPT = """\
## Assumption Tracking (Required)

Before starting your task, explicitly state all assumptions you are making.
Write them to `assumptions-log.md` in your workspace using this format:

```markdown
# Assumptions Log

## Session: {timestamp}

### Assumptions Made
- ASSUME: <assumption text>
- ASSUME: <assumption text>

### Risks
- RISK: <potential issue if assumption is wrong>
```

Rules:
1. Every non-trivial decision based on incomplete information must be logged.
2. Prefix each assumption with `ASSUME:` and each risk with `RISK:`.
3. Update the file if new assumptions arise mid-task.
4. Do NOT skip this step — assumptions left unstated cause silent failures.
"""


def generate_assumption_prompt() -> str:
    """Return a prompt fragment instructing an agent to log its assumptions.

    Embed this in the agent's system or task prompt so that assumptions
    are surfaced and written to the workspace before execution begins.

    Returns:
        Formatted prompt string ready to insert into an agent prompt.
    """
    timestamp = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return _ASSUMPTION_PROMPT.format(timestamp=timestamp)


def parse_assumptions(workspace_path: str) -> list[str]:
    """Parse assumptions written by an agent from its workspace log.

    Looks for lines matching ``ASSUME: <text>`` in the workspace's
    ``assumptions-log.md`` file.

    Args:
        workspace_path: Absolute path to the agent workspace directory.

    Returns:
        List of assumption strings (without the ``ASSUME:`` prefix).
        Empty list if the file does not exist or contains no assumptions.
    """
    log_path = Path(workspace_path) / _ASSUMPTIONS_FILENAME
    if not log_path.exists():
        logger.debug("assumption_tracker: no assumptions log at %s", log_path)
        return []

    try:
        content = log_path.read_text(encoding="utf-8")
    except OSError as exc:
        logger.warning("assumption_tracker: could not read %s: %s", log_path, exc)
        return []

    pattern = re.compile(r"[-*]\s*ASSUME:\s*(.+)", re.IGNORECASE)
    assumptions = [m.group(1).strip() for m in pattern.finditer(content)]
    logger.info("assumption_tracker: found %d assumptions in %s", len(assumptions), log_path)
    return assumptions


def write_assumptions(workspace_path: str, assumptions: list[str], risks: list[str] | None = None) -> Path:
    """Write assumptions to the workspace log file.

    Creates or overwrites ``assumptions-log.md`` in the given workspace.

    Args:
        workspace_path: Absolute path to the agent workspace directory.
        assumptions: List of assumption strings.
        risks: Optional list of risk strings.

    Returns:
        Path to the written file.
    """
    ws = Path(workspace_path)
    ws.mkdir(parents=True, exist_ok=True)
    log_path = ws / _ASSUMPTIONS_FILENAME

    timestamp = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [f"# Assumptions Log\n", f"\n## Session: {timestamp}\n", "\n### Assumptions Made\n"]
    for a in assumptions:
        lines.append(f"- ASSUME: {a}\n")
    if risks:
        lines.append("\n### Risks\n")
        for r in risks:
            lines.append(f"- RISK: {r}\n")

    log_path.write_text("".join(lines), encoding="utf-8")
    return log_path
