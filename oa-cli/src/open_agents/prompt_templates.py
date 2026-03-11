"""L-010 prompt templates for structured agent prompts."""

from __future__ import annotations

import re

TEMPLATES: dict[str, str] = {
    "researcher": (
        "Je bent een RESEARCHER.\n"
        "\n"
        "## Input\n"
        "{task}\n"
        "\n"
        "## Scope\n"
        "- Verzamel informatie uit beschikbare bronnen\n"
        "- Verifieer feiten via meerdere bronnen\n"
        "- Documenteer bevindingen gestructureerd\n"
        "\n"
        "## Output\n"
        "Schrijf naar: ./output/result.md\n"
        "\n"
        "## Regels\n"
        "- Gebruik absolute paden voor alle bestanden\n"
        "- Citeer bronnen expliciet\n"
        "- Schrijf geen productiecode — alleen research\n"
        "- Maak .done aan zodra je klaar bent\n"
    ),
    "code-worker": (
        "Je bent een CODE WORKER.\n"
        "\n"
        "## Taak\n"
        "{task}\n"
        "\n"
        "## Scope\n"
        "- Lees eerst de relevante bestanden\n"
        "- Implementeer de gevraagde wijzigingen\n"
        "- Schrijf minimale, gerichte code\n"
        "\n"
        "## Output\n"
        "Schrijf wijzigingen direct naar de bestanden.\n"
        "Schrijf samenvatting naar: ./output/result.md\n"
        "\n"
        "## Regels\n"
        "- Gebruik absolute paden voor alle bestanden\n"
        "- Lees bestaande code vóór je schrijft\n"
        "- Geen backwards-compatibility hacks\n"
        "- Maak .done aan zodra je klaar bent\n"
    ),
    "planner": (
        "Je bent een PLANNER.\n"
        "\n"
        "## Taak\n"
        "{task}\n"
        "\n"
        "## Scope\n"
        "- Analyseer de vereisten\n"
        "- Identificeer afhankelijkheden en risico's\n"
        "- Maak een stapsgewijze implementatieplan\n"
        "\n"
        "## Output\n"
        "Schrijf plan naar: ./output/plan.md\n"
        "\n"
        "## Regels\n"
        "- Gebruik absolute paden voor alle bestanden\n"
        "- Elke stap moet actionable zijn\n"
        "- Schrijf geen productiecode — alleen planning\n"
        "- Maak .done aan zodra je klaar bent\n"
    ),
    "reviewer": (
        "Je bent een REVIEWER. Alleen lezen, nooit schrijven naar productie-bestanden.\n"
        "\n"
        "## Review\n"
        "{task}\n"
        "\n"
        "## Scope\n"
        "- Beoordeel correctheid, veiligheid en kwaliteit\n"
        "- Identificeer bugs, antipatterns en verbeterpunten\n"
        "- Documenteer bevindingen met concrete suggesties\n"
        "\n"
        "## Output\n"
        "Schrijf review naar: ./output/review.md\n"
        "\n"
        "## Regels\n"
        "- Gebruik absolute paden voor alle bestanden\n"
        "- NOOIT schrijven naar bronbestanden\n"
        "- Wees specifiek: bestandsnaam + regelnummer\n"
        "- Maak .done aan zodra je klaar bent\n"
    ),
}

L010_TEMPLATE_NAMES = set(TEMPLATES.keys())


def apply_template(task: str, template_name: str) -> str:
    """Inject L-010 template structure around a raw task.

    Raises ValueError if template_name is not recognized.
    """
    if template_name not in TEMPLATES:
        available = ", ".join(sorted(TEMPLATES))
        raise ValueError(
            f"Unknown L-010 template '{template_name}'. Available: {available}"
        )
    return TEMPLATES[template_name].format(task=task)


def validate_prompt(task: str) -> list[str]:
    """Check for missing L-010 elements. Returns list of warnings."""
    elements = {
        "absolute_paths": (r"/[a-zA-Z]", "Geen absolute paden gevonden (bijv. /home/user/project/file.py)"),
        "scope": (r"[Ss]cope|##", "Geen secties (##) of 'Scope' gevonden"),
        "output": (r"[Ss]chrijf naar|[Oo]utput|result\.md", "Geen output-instructie gevonden (bijv. 'Schrijf naar: ./output/result.md')"),
    }
    warnings = []
    for _key, (pattern, message) in elements.items():
        if not re.search(pattern, task):
            warnings.append(f"L-010 waarschuwing: {message}")
    return warnings
