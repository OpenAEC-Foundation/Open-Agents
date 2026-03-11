"""Documentation Generator (#46) — extracts docs from agent templates and updates CHANGELOG."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

REPORT_PATH = Path.home() / ".oa" / "doc-report.md"
CHANGELOG_PATH = Path("/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/CHANGELOG.md")

log = logging.getLogger(__name__)


class DocGenerator:
    def __init__(self, library_dir: Optional[Path] = None) -> None:
        self.library_dir = Path(library_dir) if library_dir else Path(
            "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library"
        )
        self._templates: list[dict] = []

    def _load_templates(self) -> list[dict]:
        if self._templates:
            return self._templates
        templates: list[dict] = []
        if not self.library_dir.exists():
            log.warning("Library dir not found: %s", self.library_dir)
            return templates
        for json_file in sorted(self.library_dir.rglob("*.json")):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    data["_source"] = str(json_file)
                    templates.append(data)
            except (json.JSONDecodeError, OSError) as exc:
                log.warning("Skipping %s: %s", json_file, exc)
        self._templates = templates
        return templates

    def generate_template_docs(self, library_dir: Optional[str] = None) -> str:
        """Extract docs from agent JSON templates and return a markdown report string."""
        if library_dir:
            self.library_dir = Path(library_dir)
            self._templates = []

        templates = self._load_templates()
        total = len(templates)
        now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        lines = [
            "# Agent Template Documentation",
            f"\n_Generated: {now} | Templates found: {total}_\n",
        ]

        by_category: dict[str, list[dict]] = {}
        for t in templates:
            cat = t.get("category", "uncategorized")
            by_category.setdefault(cat, []).append(t)

        for category in sorted(by_category):
            lines.append(f"\n## {category.title()}")
            for t in by_category[category]:
                name = t.get("name", t.get("id", "Unknown"))
                desc = t.get("description", "_No description_")
                model = t.get("modelHint", "_unset_")
                has_prompt = "yes" if t.get("systemPrompt") else "no"
                lines.append(f"\n### {name}")
                lines.append(f"- **Description:** {desc}")
                lines.append(f"- **Model:** `{model}`")
                lines.append(f"- **System prompt:** {has_prompt}")

        report = "\n".join(lines) + "\n"
        try:
            REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
            REPORT_PATH.write_text(report, encoding="utf-8")
        except OSError as exc:
            log.error("Could not save report to %s: %s", REPORT_PATH, exc)
        return report

    def update_changelog(self, entry: str) -> bool:
        """Prepend an entry to CHANGELOG.md under [Unreleased]. Returns True on success."""
        try:
            if CHANGELOG_PATH.exists():
                content = CHANGELOG_PATH.read_text(encoding="utf-8")
            else:
                content = "# Changelog\n\n## [Unreleased]\n"

            timestamp = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
            block = f"- {timestamp}: {entry}"

            if "## [Unreleased]" in content:
                content = content.replace(
                    "## [Unreleased]\n",
                    f"## [Unreleased]\n{block}\n",
                    1,
                )
            else:
                content += f"\n## [Unreleased]\n{block}\n"

            CHANGELOG_PATH.write_text(content, encoding="utf-8")
            return True
        except OSError as exc:
            log.error("Could not update changelog: %s", exc)
            return False

    def get_quality_score(self) -> float:
        """Return quality score 0.0–1.0 based on template completeness."""
        templates = self._load_templates()
        if not templates:
            return 0.0
        total = len(templates)
        has_desc = sum(1 for t in templates if t.get("description"))
        has_prompt = sum(1 for t in templates if t.get("systemPrompt"))
        has_model = sum(1 for t in templates if t.get("modelHint"))
        score = (has_desc + has_prompt + has_model) / (3 * total)
        return round(score, 3)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    gen = DocGenerator()
    report = gen.generate_template_docs()
    score = gen.get_quality_score()
    print(report)
    print(f"\n**Quality Score:** {score:.1%}")
    print(f"\nReport saved to: {REPORT_PATH}")
