"""Safety Rule DocType — maps to Open-Agents safety rules."""

import re
import frappe
from frappe.model.document import Document


VALID_TOOLS = [
    "Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebSearch", "WebFetch",
]


class SafetyRule(Document):
    def validate(self):
        self._validate_pattern()
        self._validate_agent_link()

    def _validate_pattern(self):
        """Validate pattern based on rule type."""
        if self.rule_type == "Tool Block" and self.pattern not in VALID_TOOLS:
            frappe.throw(
                f"For Tool Block rules, pattern must be a valid tool name. "
                f"Valid tools: {', '.join(VALID_TOOLS)}"
            )

        if self.rule_type == "Bash Blacklist":
            try:
                re.compile(self.pattern)
            except re.error as e:
                frappe.throw(f"Invalid regex pattern for Bash Blacklist: {e}")

        if self.rule_type == "Permission Mode" and not self.permission_mode:
            frappe.throw("Permission Mode rules require a permission_mode value")

    def _validate_agent_link(self):
        """Ensure agent_config is set when scope is Agent."""
        if self.scope == "Agent" and not self.agent_config:
            frappe.throw("Agent scope requires an Agent Config link")
