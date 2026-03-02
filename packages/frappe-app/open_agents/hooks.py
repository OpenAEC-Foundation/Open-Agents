"""Open-Agents Frappe hooks."""

app_name = "open_agents"
app_title = "Open Agents"
app_publisher = "Impertio Studio B.V."
app_description = "Visual agent orchestration platform"
app_email = "freek@impertio.nl"
app_license = "MIT"

app_include_css = "/assets/open_agents/css/open_agents.css"
app_include_js = "/assets/open_agents/js/open_agents.js"

# Website routes
website_route_rules = [
    {"from_route": "/open-agents/<path:app_path>", "to_route": "open-agents"},
]

# DocType definitions
doc_events = {}

# Scheduled tasks
scheduler_events = {}

# Fixtures (exported on bench export-fixtures)
fixtures = []

# Jinja template filters
jenv = {}

# Installation hooks
after_install = "open_agents.setup.after_install"
