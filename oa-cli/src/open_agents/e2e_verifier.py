"""End-to-End Verifier (#29) — detect and run tests in agent workspace output."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

_TEST_PATTERNS = [
    "test_*.py",
    "*_test.py",
    "tests/*.py",
    "test/*.py",
]


class E2EVerifier:
    """Discover and run test files found in an agent workspace.

    Usage::

        verifier = E2EVerifier()
        result = verifier.verify("/tmp/oa-agent-xyz")
        if result["failed"] > 0:
            print("Tests failed — agent output may be incomplete.")
    """

    def verify(self, workspace_path: str) -> dict:
        """Run all test files found in workspace_path.

        Args:
            workspace_path: Absolute path to the agent workspace directory.

        Returns:
            dict with keys: passed (int), failed (int), skipped (int),
            exit_code (int), test_files (list[str]).
        """
        ws = Path(workspace_path)
        if not ws.exists():
            logger.warning("E2EVerifier: workspace does not exist: %s", workspace_path)
            return {"passed": 0, "failed": 0, "skipped": 0, "exit_code": -1, "test_files": []}

        test_files = self._discover_tests(ws)
        if not test_files:
            logger.info("E2EVerifier: no test files found in %s", workspace_path)
            return {"passed": 0, "failed": 0, "skipped": 0, "exit_code": 0, "test_files": []}

        return self._run_tests(test_files, ws)

    def _discover_tests(self, ws: Path) -> list[Path]:
        found: list[Path] = []
        for pattern in _TEST_PATTERNS:
            found.extend(ws.glob(pattern))
        return sorted(set(found))

    def _run_tests(self, test_files: list[Path], cwd: Path) -> dict:
        file_args = [str(f) for f in test_files]
        try:
            result = subprocess.run(
                ["python", "-m", "pytest", "--tb=short", "-q", *file_args],
                cwd=str(cwd),
                capture_output=True,
                text=True,
                timeout=120,
            )
            passed, failed, skipped = self._parse_pytest_output(result.stdout)
            return {
                "passed": passed,
                "failed": failed,
                "skipped": skipped,
                "exit_code": result.returncode,
                "test_files": file_args,
            }
        except FileNotFoundError:
            logger.warning("E2EVerifier: pytest not available, falling back to unittest")
            return self._run_unittest(test_files, cwd)
        except subprocess.TimeoutExpired:
            logger.error("E2EVerifier: test run timed out")
            return {"passed": 0, "failed": 1, "skipped": 0, "exit_code": 1, "test_files": file_args}

    def _run_unittest(self, test_files: list[Path], cwd: Path) -> dict:
        file_args = [str(f) for f in test_files]
        try:
            result = subprocess.run(
                ["python", "-m", "unittest", "discover", "-s", str(cwd)],
                cwd=str(cwd),
                capture_output=True,
                text=True,
                timeout=120,
            )
            failed = 1 if result.returncode != 0 else 0
            return {
                "passed": 0 if failed else 1,
                "failed": failed,
                "skipped": 0,
                "exit_code": result.returncode,
                "test_files": file_args,
            }
        except Exception as exc:
            logger.error("E2EVerifier: unittest failed: %s", exc)
            return {"passed": 0, "failed": 1, "skipped": 0, "exit_code": 1, "test_files": file_args}

    def _parse_pytest_output(self, output: str) -> tuple[int, int, int]:
        """Parse pytest summary line like '3 passed, 1 failed, 2 skipped'."""
        passed = failed = skipped = 0
        for line in output.splitlines():
            if "passed" in line or "failed" in line or "error" in line:
                for token in line.split(","):
                    token = token.strip()
                    if token.endswith("passed"):
                        try:
                            passed = int(token.split()[0])
                        except ValueError:
                            pass
                    elif token.endswith("failed") or token.endswith("error"):
                        try:
                            failed += int(token.split()[0])
                        except ValueError:
                            pass
                    elif token.endswith("skipped"):
                        try:
                            skipped = int(token.split()[0])
                        except ValueError:
                            pass
        return passed, failed, skipped


def verify_workspace(workspace_path: str) -> dict:
    """Convenience function — run E2EVerifier on a workspace path."""
    return E2EVerifier().verify(workspace_path)
