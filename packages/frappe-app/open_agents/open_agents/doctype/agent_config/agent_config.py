"""Agent Config DocType — maps to Open-Agents AgentNodeData."""

import json
import frappe
from frappe.model.document import Document


VALID_TOOLS = [
    "Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebSearch", "WebFetch",
]

VALID_PROVIDERS = ["anthropic", "openai", "mistral", "ollama"]


class AgentConfig(Document):
    def validate(self):
        self._validate_model_format()
        self._validate_tools()
        self._sync_canvas_config()

    def _validate_model_format(self):
        """Ensure model follows provider/model format."""
        if "/" not in (self.model or ""):
            frappe.throw(
                f"Model must be in provider/model format (e.g. anthropic/claude-sonnet-4-6), got: {self.model}"
            )
        provider = self.model.split("/")[0]
        if provider not in VALID_PROVIDERS:
            frappe.throw(
                f"Unknown provider '{provider}'. Valid providers: {', '.join(VALID_PROVIDERS)}"
            )

    def _validate_tools(self):
        """Ensure tools is a valid JSON array of known tool names."""
        try:
            tools = json.loads(self.tools or "[]")
        except json.JSONDecodeError:
            frappe.throw("Tools must be a valid JSON array")
            return

        if not isinstance(tools, list):
            frappe.throw("Tools must be a JSON array")
            return

        for tool in tools:
            if tool not in VALID_TOOLS:
                frappe.throw(f"Unknown tool '{tool}'. Valid tools: {', '.join(VALID_TOOLS)}")

    def _sync_canvas_config(self):
        """Keep canvas_config_json in sync with individual fields."""
        tools = json.loads(self.tools or "[]")
        self.canvas_config_json = json.dumps({
            "name": self.agent_name,
            "description": self.description or "",
            "model": self.model,
            "maxTokens": self.max_tokens or 4096,
            "systemPrompt": self.system_prompt,
            "tools": tools,
        })

    def to_canvas_node_data(self):
        """Export as AgentNodeData dict for canvas compatibility."""
        return json.loads(self.canvas_config_json or "{}")
