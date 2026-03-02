"""Desktop icons for Open-Agents module."""

from frappe import _


def get_data():
    return [
        {
            "module_name": "Open Agents",
            "type": "module",
            "label": _("Open Agents"),
            "icon": "octicon octicon-hubot",
            "color": "#6366f1",
            "description": _("Visual agent orchestration platform"),
        }
    ]
