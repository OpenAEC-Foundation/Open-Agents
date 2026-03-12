"""Output contract validation for Sprint 29 task types."""
from __future__ import annotations
from pathlib import Path
from dataclasses import dataclass, field
from typing import List


@dataclass
class ContractViolation:
    file: str
    reason: str
    severity: str  # "critical" | "warning"


# Contract: required files per task type
CONTRACTS = {
    "researcher":    ["findings.md", "sources.json"],
    "builder":       ["summary.md"],
    "reviewer":      ["review.md"],
    "transformer":   ["diff.md"],
    "orchestrator":  ["plan.json", "status.md"],
    "validator":     ["verdict.md"],
}


def validate_output_contract(task_type: str, workspace_path: str | Path) -> tuple[bool, List[ContractViolation]]:
    """Check if workspace contains required output files for given task_type.
    Returns (passed: bool, violations: list)."""
    ws = Path(workspace_path)
    violations = []
    required = CONTRACTS.get(task_type, [])
    for fname in required:
        # Check both workspace root and output/ subdir
        found = (ws / fname).exists() or (ws / "output" / fname).exists()
        if not found:
            violations.append(ContractViolation(
                file=fname,
                reason="Missing required output file",
                severity="critical",
            ))
    passed = not any(v.severity == "critical" for v in violations)
    return passed, violations
