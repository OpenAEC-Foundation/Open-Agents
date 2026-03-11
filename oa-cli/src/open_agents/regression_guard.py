"""Anti-Regression Guard (#44) — detect output regressions via hash and content comparison.

Stores reference snapshots in ~/.oa/references/<run_id>.json.
"""

from __future__ import annotations

import difflib
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

REFERENCES_DIR = Path.home() / ".oa" / "references"


class RegressionGuard:
    """Compare current outputs against saved reference snapshots."""

    def __init__(self) -> None:
        REFERENCES_DIR.mkdir(parents=True, exist_ok=True)

    def save_reference(self, run_id: str, output_hash: str, metadata: dict) -> None:
        """Persist a reference snapshot for a run.

        Args:
            run_id: Unique identifier for the reference run.
            output_hash: SHA-256 hex digest of the reference output.
            metadata: Arbitrary metadata (e.g. model, task, timestamp).
        """
        REFERENCES_DIR.mkdir(parents=True, exist_ok=True)
        ref = {
            "run_id": run_id,
            "output_hash": output_hash,
            "saved_at": datetime.now(tz=timezone.utc).isoformat(),
            "metadata": metadata,
        }
        (REFERENCES_DIR / f"{run_id}.json").write_text(json.dumps(ref, indent=2))

    def check_regression(self, current_output: str, reference_run_id: str) -> dict:
        """Compare current output against a stored reference.

        Args:
            current_output: The new output string to evaluate.
            reference_run_id: The run_id whose snapshot to compare against.

        Returns:
            Dict with keys:
              - regression (bool): True if outputs differ.
              - similarity (float): 0.0–1.0 sequence similarity ratio.
              - differences (list[str]): Unified-diff lines (empty when identical).
        """
        ref_path = REFERENCES_DIR / f"{reference_run_id}.json"
        if not ref_path.exists():
            return {
                "regression": False,
                "similarity": 1.0,
                "differences": [f"Reference '{reference_run_id}' not found."],
            }

        ref = json.loads(ref_path.read_text())
        ref_hash: str = ref.get("output_hash", "")
        current_hash = hashlib.sha256(current_output.encode()).hexdigest()

        if current_hash == ref_hash:
            return {"regression": False, "similarity": 1.0, "differences": []}

        # Compute text similarity for partial regressions
        ref_content: str = ref.get("metadata", {}).get("content", "")
        similarity = difflib.SequenceMatcher(None, ref_content, current_output).ratio()
        differences = list(
            difflib.unified_diff(
                ref_content.splitlines(keepends=True),
                current_output.splitlines(keepends=True),
                fromfile=f"reference/{reference_run_id}",
                tofile="current",
            )
        )

        return {
            "regression": True,
            "similarity": round(similarity, 4),
            "differences": differences,
        }

    def list_references(self) -> list[dict]:
        """Return all stored reference snapshots, newest first.

        Returns:
            List of reference dicts (run_id, output_hash, saved_at, metadata).
        """
        if not REFERENCES_DIR.exists():
            return []
        refs: list[dict] = []
        for path in sorted(REFERENCES_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                refs.append(json.loads(path.read_text()))
            except (json.JSONDecodeError, OSError):
                continue
        return refs
