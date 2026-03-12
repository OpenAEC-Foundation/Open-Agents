"""Output contract verification for task-typed agents."""

from __future__ import annotations
import re
from pathlib import Path
from dataclasses import dataclass


@dataclass
class ContractResult:
    task_type: str
    checks: list[tuple[str, bool, str]]  # (check_name, passed, detail)

    @property
    def passed(self) -> bool:
        return all(c[1] for c in self.checks)

    def summary(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        details = "\n".join(
            f"  {'✓' if ok else '✗'} {name}: {detail}"
            for name, ok, detail in self.checks
        )
        return f"Contract [{self.task_type}]: {status}\n{details}"


def verify_contract(workspace: Path, task_type: str) -> ContractResult:
    """Verify the output contract for a completed agent.

    Three checks:
    1. PRESENT  — result.md exists and is non-empty
    2. SECTIONS — all required sections are present
    3. FORMAT   — verdict fields (if applicable) have correct values
    """
    from .workspace import TASK_TYPES

    tt = TASK_TYPES.get(task_type)
    if not tt:
        return ContractResult(task_type, [("type_known", False, f"Unknown type: {task_type}")])

    checks: list[tuple[str, bool, str]] = []
    output_file = Path(workspace) / "output" / tt["output_schema"]["output_file"]

    # Check 1: PRESENT — file exists and has content
    if not output_file.exists():
        checks.append(("present", False, f"{output_file.name} does not exist"))
        return ContractResult(task_type, checks)

    content = output_file.read_text().strip()
    if len(content) < 20:
        checks.append(("present", False, f"{output_file.name} is near-empty ({len(content)} chars)"))
        return ContractResult(task_type, checks)

    checks.append(("present", True, f"{output_file.name} exists ({len(content)} chars)"))

    # Check 2: SECTIONS — all required headings present
    required = tt["output_schema"]["required_sections"]
    missing = [s for s in required if s not in content]
    if missing:
        checks.append(("sections", False, f"Missing: {', '.join(missing)}"))
    else:
        checks.append(("sections", True, f"All {len(required)} sections present"))

    # Check 3: FORMAT — verdict fields have valid values
    if task_type in ("reviewer", "validator"):
        verdict_match = re.search(r"## Verdict\s*\n\s*(APPROVE|REJECT|WARN|PASS|FAIL)", content)
        if verdict_match:
            checks.append(("format", True, f"Verdict: {verdict_match.group(1)}"))
        else:
            checks.append(("format", False, "## Verdict must start with APPROVE/REJECT/WARN/PASS/FAIL"))
    else:
        checks.append(("format", True, "No verdict field required"))

    return ContractResult(task_type, checks)
