"""Post-install setup for Open-Agents Frappe app."""

import frappe


def after_install():
    """Seed default data after installation."""
    _create_default_safety_rules()


def _create_default_safety_rules():
    """Create default safety rules for the platform."""
    if not frappe.db.exists("Safety Rule", {"rule_type": "Tool Block", "scope": "Global"}):
        frappe.get_doc({
            "doctype": "Safety Rule",
            "rule_type": "Tool Block",
            "pattern": "rm -rf /",
            "scope": "Global",
            "enabled": 1,
            "description": "Block destructive recursive delete at root",
        }).insert(ignore_permissions=True)

    frappe.db.commit()
