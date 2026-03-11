"""Context Gap Detector — pre-flight check for agent prompts.

Detects common context gaps that cause agent failures:
- Referenced files not loaded into the prompt
- Vague 'see docs' references without concrete paths
- Relative paths where absolute paths are expected
"""

from __future__ import annotations

import re
from pathlib import Path

# Patterns for detecting referenced-but-missing file content
_FILE_REF_PATTERNS = [
    # Explicit read instructions: "Lees: /path", "Read: /path", "Input: /path"
    re.compile(r"(?:Lees|Read|Input|See|Zie|Bekijk)\s*:\s*([^\s\n,;]+\.[a-zA-Z0-9]+)", re.IGNORECASE),
    # Parenthetical file refs: "(see /path/file.py)" or "(ref: /path/file)"
    re.compile(r"\(\s*(?:see|ref|lees|from)\s*:\s*([^\s\n)]+\.[a-zA-Z0-9]+)\s*\)", re.IGNORECASE),
    # Markdown code links: [label](/path/to/file)
    re.compile(r"\[[^\]]+\]\((/[^\)]+\.[a-zA-Z0-9]+)\)"),
]

# Vague documentation references — signals missing concrete context
_VAGUE_DOC_PATTERNS = [
    re.compile(r"\bsee\s+(?:the\s+)?docs?\b", re.IGNORECASE),
    re.compile(r"\brefer\s+to\s+(?:the\s+)?docs?\b", re.IGNORECASE),
    re.compile(r"\bcheck\s+(?:the\s+)?(?:docs?|readme|documentation)\b", re.IGNORECASE),
    re.compile(r"\bsee\s+(?:the\s+)?readme\b", re.IGNORECASE),
    re.compile(r"\baccording\s+to\s+(?:the\s+)?docs?\b", re.IGNORECASE),
    re.compile(r"\bper\s+(?:the\s+)?docs?\b", re.IGNORECASE),
    re.compile(r"\bvolgens\s+(?:de\s+)?docs?\b", re.IGNORECASE),
    re.compile(r"\bzie\s+(?:de\s+)?docs?\b", re.IGNORECASE),
    re.compile(r"\bals\s+(?:in|per)\s+de\s+documentatie\b", re.IGNORECASE),
]

# Relative path patterns that should be absolute
_RELATIVE_PATH_PATTERNS = [
    # ./file.py or ../file.py with common code extensions
    re.compile(r"(?<!\w)\.{1,2}/[\w./\-]+\.(?:py|js|ts|md|json|yaml|yml|toml|sh|txt)(?!\w)"),
    # Bare filename-like references: "edit config.py", "modify utils.py"
    re.compile(r"(?:edit|modify|update|change|fix|open|in)\s+([a-zA-Z_][\w\-]*/[a-zA-Z_][\w\-]*\.(?:py|js|ts|md))"),
]

# Patterns that indicate an absolute path IS present (suppress false positives)
_ABSOLUTE_PATH_PATTERN = re.compile(r"(?<!\w)/(?:[a-zA-Z0-9_.\-]+/){1,}[a-zA-Z0-9_.\-]+")


def _extract_referenced_files(prompt: str) -> list[str]:
    """Extract file paths that are explicitly referenced in the prompt."""
    paths: list[str] = []
    for pattern in _FILE_REF_PATTERNS:
        for match in pattern.finditer(prompt):
            path = match.group(1).strip().rstrip(".,;)")
            paths.append(path)
    return paths


def _check_file_loaded(prompt: str, filepath: str) -> bool:
    """Check if a file's content appears to be loaded into the prompt.

    Heuristic: if the file path appears multiple times OR the prompt contains
    content that looks like it was read from the file (large block after the reference).
    """
    # Count occurrences — if referenced once it may just be an instruction to read
    count = prompt.count(filepath)
    if count > 1:
        return True

    # If file doesn't start with / it might be a relative instruction, not a loaded file
    if not filepath.startswith("/"):
        return False

    # Check if file actually exists on disk — if not, it cannot be loaded
    if not Path(filepath).exists():
        return False  # File doesn't exist — definite gap

    return False  # Referenced but likely not loaded yet


def detect_gaps(prompt: str) -> list[str]:
    """Detect context gaps in an agent prompt.

    Returns a list of warning strings describing each detected gap.
    Empty list means no gaps found.
    """
    gaps: list[str] = []

    # 1. Detect referenced files that may not be loaded
    referenced = _extract_referenced_files(prompt)
    for filepath in referenced:
        if filepath.startswith("/") and not _check_file_loaded(prompt, filepath):
            if Path(filepath).exists():
                gaps.append(
                    f"Context gap: file referenced but not loaded — {filepath}"
                )
            else:
                gaps.append(
                    f"Context gap: file referenced but does not exist — {filepath}"
                )

    # 2. Detect vague "see docs" references
    for pattern in _VAGUE_DOC_PATTERNS:
        match = pattern.search(prompt)
        if match:
            snippet = match.group(0)
            gaps.append(
                f"Context gap: vague documentation reference '{snippet}' — provide concrete file path or inline content"
            )
            break  # One warning per category is enough

    # 3. Detect relative paths where absolute paths are expected
    has_absolute = bool(_ABSOLUTE_PATH_PATTERN.search(prompt))
    relative_found: list[str] = []
    for pattern in _RELATIVE_PATH_PATTERNS:
        for match in pattern.finditer(prompt):
            candidate = match.group(0)
            # Skip if this looks like it's already part of an absolute path context
            start = max(0, match.start() - 10)
            surrounding = prompt[start : match.start()]
            if "/" in surrounding and surrounding.rstrip()[-1:] == "/":
                continue
            relative_found.append(candidate)

    if relative_found and not has_absolute:
        # Only warn if no absolute paths at all — mixed is usually fine
        unique = list(dict.fromkeys(relative_found))[:3]  # show at most 3
        gaps.append(
            f"Context gap: relative path(s) found without absolute path context — {', '.join(unique)}"
        )

    return gaps


def write_audit(workspace: Path, gaps: list[str]) -> None:
    """Write gap findings to context-audit.md in the agent workspace."""
    audit_path = workspace / "context-audit.md"
    lines = ["# Context Audit\n", "\n", "The following context gaps were detected in the agent prompt:\n", "\n"]
    for gap in gaps:
        lines.append(f"- {gap}\n")
    lines.append("\n> Auto-generated by context_gap_detector. Review and fix before re-running.\n")
    audit_path.write_text("".join(lines), encoding="utf-8")
