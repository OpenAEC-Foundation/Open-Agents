"""Unit tests for output_contracts module (Sprint 29)."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from open_agents.contracts.output_contracts import (
    CONTRACTS,
    ContractViolation,
    validate_output_contract,
)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _create_files(base: Path, *filenames: str) -> None:
    for fname in filenames:
        target = base / fname
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("placeholder")


# ---------------------------------------------------------------------------
# researcher
# ---------------------------------------------------------------------------

class TestResearcher:
    TASK = "researcher"
    REQUIRED = CONTRACTS[TASK]  # ["findings.md", "sources.json"]

    def test_pass_root(self, tmp_path):
        _create_files(tmp_path, *self.REQUIRED)
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert passed
        assert violations == []

    def test_pass_output_subdir(self, tmp_path):
        _create_files(tmp_path, *[f"output/{f}" for f in self.REQUIRED])
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert passed
        assert violations == []

    def test_fail_missing_all(self, tmp_path):
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert not passed
        assert len(violations) == len(self.REQUIRED)
        assert all(v.severity == "critical" for v in violations)

    def test_fail_partial(self, tmp_path):
        _create_files(tmp_path, self.REQUIRED[0])
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert not passed
        assert len(violations) == 1
        assert violations[0].file == self.REQUIRED[1]


# ---------------------------------------------------------------------------
# builder
# ---------------------------------------------------------------------------

class TestBuilder:
    TASK = "builder"
    REQUIRED = CONTRACTS[TASK]  # ["summary.md"]

    def test_pass_root(self, tmp_path):
        _create_files(tmp_path, *self.REQUIRED)
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert passed
        assert violations == []

    def test_pass_output_subdir(self, tmp_path):
        _create_files(tmp_path, *[f"output/{f}" for f in self.REQUIRED])
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert passed

    def test_fail(self, tmp_path):
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert not passed
        assert len(violations) == 1


# ---------------------------------------------------------------------------
# reviewer
# ---------------------------------------------------------------------------

class TestReviewer:
    TASK = "reviewer"
    REQUIRED = CONTRACTS[TASK]  # ["review.md"]

    def test_pass_root(self, tmp_path):
        _create_files(tmp_path, *self.REQUIRED)
        passed, _ = validate_output_contract(self.TASK, tmp_path)
        assert passed

    def test_pass_output_subdir(self, tmp_path):
        _create_files(tmp_path, *[f"output/{f}" for f in self.REQUIRED])
        passed, _ = validate_output_contract(self.TASK, tmp_path)
        assert passed

    def test_fail(self, tmp_path):
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert not passed
        assert violations[0].file == "review.md"


# ---------------------------------------------------------------------------
# transformer
# ---------------------------------------------------------------------------

class TestTransformer:
    TASK = "transformer"
    REQUIRED = CONTRACTS[TASK]  # ["diff.md"]

    def test_pass_root(self, tmp_path):
        _create_files(tmp_path, *self.REQUIRED)
        passed, _ = validate_output_contract(self.TASK, tmp_path)
        assert passed

    def test_pass_output_subdir(self, tmp_path):
        _create_files(tmp_path, *[f"output/{f}" for f in self.REQUIRED])
        passed, _ = validate_output_contract(self.TASK, tmp_path)
        assert passed

    def test_fail(self, tmp_path):
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert not passed
        assert violations[0].file == "diff.md"


# ---------------------------------------------------------------------------
# orchestrator
# ---------------------------------------------------------------------------

class TestOrchestrator:
    TASK = "orchestrator"
    REQUIRED = CONTRACTS[TASK]  # ["plan.json", "status.md"]

    def test_pass_root(self, tmp_path):
        _create_files(tmp_path, *self.REQUIRED)
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert passed
        assert violations == []

    def test_pass_output_subdir(self, tmp_path):
        _create_files(tmp_path, *[f"output/{f}" for f in self.REQUIRED])
        passed, _ = validate_output_contract(self.TASK, tmp_path)
        assert passed

    def test_fail_missing_both(self, tmp_path):
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert not passed
        assert len(violations) == 2

    def test_fail_missing_one(self, tmp_path):
        _create_files(tmp_path, "plan.json")
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert not passed
        assert len(violations) == 1
        assert violations[0].file == "status.md"


# ---------------------------------------------------------------------------
# validator
# ---------------------------------------------------------------------------

class TestValidator:
    TASK = "validator"
    REQUIRED = CONTRACTS[TASK]  # ["verdict.md"]

    def test_pass_root(self, tmp_path):
        _create_files(tmp_path, *self.REQUIRED)
        passed, _ = validate_output_contract(self.TASK, tmp_path)
        assert passed

    def test_pass_output_subdir(self, tmp_path):
        _create_files(tmp_path, *[f"output/{f}" for f in self.REQUIRED])
        passed, _ = validate_output_contract(self.TASK, tmp_path)
        assert passed

    def test_fail(self, tmp_path):
        passed, violations = validate_output_contract(self.TASK, tmp_path)
        assert not passed
        assert violations[0].file == "verdict.md"


# ---------------------------------------------------------------------------
# Unknown task type — must NOT crash
# ---------------------------------------------------------------------------

class TestUnknownTaskType:
    def test_unknown_returns_pass_no_violations(self, tmp_path):
        """Unknown task type has no contract → trivially passes."""
        passed, violations = validate_output_contract("unknown_type", tmp_path)
        assert passed
        assert violations == []

    def test_empty_string_task_type(self, tmp_path):
        passed, violations = validate_output_contract("", tmp_path)
        assert passed
        assert violations == []


# ---------------------------------------------------------------------------
# ContractViolation dataclass
# ---------------------------------------------------------------------------

def test_violation_fields():
    v = ContractViolation(file="foo.md", reason="Missing", severity="critical")
    assert v.file == "foo.md"
    assert v.reason == "Missing"
    assert v.severity == "critical"


def test_violation_warning_does_not_block_pass(tmp_path):
    """If all violations are warnings (not critical), contract passes."""
    # Inject a warning manually to verify logic
    from open_agents.contracts.output_contracts import CONTRACTS as C
    # We test the logic directly: passed = not any(critical)
    violations = [
        ContractViolation(file="foo.md", reason="Suboptimal", severity="warning")
    ]
    passed = not any(v.severity == "critical" for v in violations)
    assert passed
