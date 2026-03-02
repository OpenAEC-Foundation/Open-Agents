"""Open-Agents whitelisted API endpoints.

These endpoints proxy requests from Frappe Desk to the Open-Agents
backend REST API, providing authenticated access through Frappe's
permission system.

Backend API base URL is configured in site_config.json:
  "open_agents_backend_url": "http://localhost:3001"
"""

import json
import frappe
from frappe import _
import requests


def _get_backend_url():
    """Get the Open-Agents backend URL from site config."""
    return frappe.conf.get("open_agents_backend_url", "http://localhost:3001")


def _proxy_get(path, params=None):
    """Proxy a GET request to the backend."""
    url = f"{_get_backend_url()}{path}"
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.ConnectionError:
        frappe.throw(
            _("Cannot connect to Open-Agents backend at {0}").format(url),
            title=_("Backend Unreachable"),
        )
    except requests.HTTPError as e:
        frappe.throw(
            _("Backend error: {0}").format(str(e)),
            title=_("Backend Error"),
        )


def _proxy_post(path, data=None):
    """Proxy a POST request to the backend."""
    url = f"{_get_backend_url()}{path}"
    try:
        resp = requests.post(url, json=data, timeout=60)
        resp.raise_for_status()
        return resp.json()
    except requests.ConnectionError:
        frappe.throw(
            _("Cannot connect to Open-Agents backend at {0}").format(url),
            title=_("Backend Unreachable"),
        )
    except requests.HTTPError as e:
        frappe.throw(
            _("Backend error: {0}").format(str(e)),
            title=_("Backend Error"),
        )


def _proxy_put(path, data=None):
    """Proxy a PUT request to the backend."""
    url = f"{_get_backend_url()}{path}"
    try:
        resp = requests.put(url, json=data, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.ConnectionError:
        frappe.throw(
            _("Cannot connect to Open-Agents backend at {0}").format(url),
            title=_("Backend Unreachable"),
        )
    except requests.HTTPError as e:
        frappe.throw(
            _("Backend error: {0}").format(str(e)),
            title=_("Backend Error"),
        )


def _proxy_delete(path):
    """Proxy a DELETE request to the backend."""
    url = f"{_get_backend_url()}{path}"
    try:
        resp = requests.delete(url, timeout=30)
        resp.raise_for_status()
        return {"ok": True}
    except requests.ConnectionError:
        frappe.throw(
            _("Cannot connect to Open-Agents backend at {0}").format(url),
            title=_("Backend Unreachable"),
        )
    except requests.HTTPError as e:
        frappe.throw(
            _("Backend error: {0}").format(str(e)),
            title=_("Backend Error"),
        )


# ── Canvas Config endpoints ──────────────────────────────────────────


@frappe.whitelist()
def get_configs():
    """List all canvas configurations."""
    return _proxy_get("/configs")


@frappe.whitelist()
def get_config(config_id):
    """Get a specific canvas configuration."""
    return _proxy_get(f"/configs/{config_id}")


@frappe.whitelist()
def save_config(config):
    """Create or update a canvas configuration."""
    if isinstance(config, str):
        config = json.loads(config)

    if config.get("id"):
        return _proxy_put(f"/configs/{config['id']}", config)
    return _proxy_post("/configs", config)


@frappe.whitelist()
def delete_config(config_id):
    """Delete a canvas configuration."""
    return _proxy_delete(f"/configs/{config_id}")


# ── Execution endpoints ─────────────────────────────────────────────


@frappe.whitelist()
def execute_config(config):
    """Start execution of a canvas configuration."""
    if isinstance(config, str):
        config = json.loads(config)
    return _proxy_post("/execute", config)


@frappe.whitelist()
def get_execution_status(run_id):
    """Get execution run status."""
    return _proxy_get(f"/execute/{run_id}")


@frappe.whitelist()
def pause_execution(run_id):
    """Pause a running execution."""
    return _proxy_post(f"/execute/{run_id}/pause")


@frappe.whitelist()
def resume_execution(run_id):
    """Resume a paused execution."""
    return _proxy_post(f"/execute/{run_id}/resume")


@frappe.whitelist()
def cancel_execution(run_id):
    """Cancel a running or paused execution."""
    return _proxy_post(f"/execute/{run_id}/cancel")


# ── Agent & Preset endpoints ────────────────────────────────────────


@frappe.whitelist()
def get_agents():
    """List all agents from the backend."""
    return _proxy_get("/agents")


@frappe.whitelist()
def get_presets():
    """List all agent presets."""
    return _proxy_get("/presets")


# ── Safety endpoints ────────────────────────────────────────────────


@frappe.whitelist()
def get_safety_config():
    """Get the full safety configuration."""
    return _proxy_get("/safety")


@frappe.whitelist()
def update_global_safety(rules):
    """Update global safety rules."""
    if isinstance(rules, str):
        rules = json.loads(rules)
    return _proxy_put("/safety/global", rules)


# ── Run History endpoints ────────────────────────────────────────────


@frappe.whitelist()
def get_runs():
    """List all execution run summaries."""
    return _proxy_get("/runs")


@frappe.whitelist()
def get_run(run_id):
    """Get a specific run summary."""
    return _proxy_get(f"/runs/{run_id}")


# ── ERPNext Template endpoints ──────────────────────────────────────


@frappe.whitelist()
def get_erpnext_templates():
    """List available ERPNext agent templates.

    Reads from the templates/erpnext/ directory within the Frappe app.
    """
    import os

    template_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "templates", "erpnext"
    )

    templates = []
    if os.path.isdir(template_dir):
        for filename in sorted(os.listdir(template_dir)):
            if filename.endswith(".json"):
                filepath = os.path.join(template_dir, filename)
                with open(filepath) as f:
                    template = json.load(f)
                    template["_filename"] = filename
                    templates.append(template)

    return templates


@frappe.whitelist()
def load_erpnext_template(template_name):
    """Load a specific ERPNext template by filename."""
    import os

    template_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "templates", "erpnext"
    )
    filepath = os.path.join(template_dir, template_name)

    if not os.path.isfile(filepath):
        frappe.throw(_("Template not found: {0}").format(template_name))

    with open(filepath) as f:
        return json.load(f)
