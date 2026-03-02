"""Execution Run DocType — maps to Open-Agents ExecutionRun."""

import json
import frappe
from frappe.model.document import Document


VALID_STATUSES = ["Idle", "Running", "Paused", "Cancelled", "Completed", "Error"]


class ExecutionRun(Document):
    def validate(self):
        self._validate_steps()
        self._calculate_elapsed()

    def _validate_steps(self):
        """Ensure steps is a valid JSON array."""
        try:
            steps = json.loads(self.steps or "[]")
        except json.JSONDecodeError:
            frappe.throw("Steps must be a valid JSON array")
            return

        if not isinstance(steps, list):
            frappe.throw("Steps must be a JSON array")

    def _calculate_elapsed(self):
        """Calculate total elapsed time from steps."""
        try:
            steps = json.loads(self.steps or "[]")
            total = sum(step.get("elapsedMs", 0) for step in steps if isinstance(step, dict))
            self.total_elapsed_ms = total
        except (json.JSONDecodeError, TypeError):
            pass

    def to_execution_run(self):
        """Export as ExecutionRun dict for API compatibility."""
        return {
            "id": self.run_id,
            "configId": self.config_id,
            "status": (self.status or "Idle").lower(),
            "steps": json.loads(self.steps or "[]"),
            "startedAt": str(self.started_at) if self.started_at else None,
            "completedAt": str(self.completed_at) if self.completed_at else None,
            "pausedAt": str(self.paused_at) if self.paused_at else None,
        }
