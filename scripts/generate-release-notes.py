#!/usr/bin/env python3
"""
Generate release notes voor Open-Agents.
Gebruik: python scripts/generate-release-notes.py [--tag v0.3.1] [--prev v0.3.0]
Output: release-notes.md + CHANGELOG.md update
"""

from __future__ import annotations

import argparse
import glob
import subprocess
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).parents[1]

COMMIT_GROUPS = {
    "feat": ("🚀 New Features", []),
    "fix": ("🐛 Bug Fixes", []),
    "docs": ("📚 Documentation", []),
    "refactor": ("♻️ Refactoring", []),
    "perf": ("⚡ Performance", []),
    "test": ("🧪 Tests", []),
    "chore": ("🔧 Chores", []),
    "other": ("📝 Other", []),
}


def run(cmd: str) -> str:
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=REPO_ROOT)
    return result.stdout.strip()


def get_previous_tag(current_tag: str) -> str:
    all_tags = run("git tag --sort=-version:refname").splitlines()
    for i, tag in enumerate(all_tags):
        if tag == current_tag and i + 1 < len(all_tags):
            return all_tags[i + 1]
    return ""


def get_commits(prev_tag: str, current_tag: str) -> list[str]:
    ref = f"{prev_tag}..{current_tag}" if prev_tag else f"{current_tag}"
    return run(f"git log {ref} --oneline --no-merges").splitlines()


def categorize_commits(commits: list[str]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {k: [] for k in COMMIT_GROUPS}
    for commit in commits:
        sha, _, message = commit.partition(" ")
        matched = False
        for prefix in ("feat", "fix", "docs", "refactor", "perf", "test", "chore"):
            if message.lower().startswith(f"{prefix}(") or message.lower().startswith(f"{prefix}:"):
                groups[prefix].append(message)
                matched = True
                break
        if not matched:
            groups["other"].append(message)
    return groups


def count_agents() -> int:
    return len(glob.glob(str(REPO_ROOT / "agents" / "library" / "**" / "*.json"), recursive=True))


def get_version_from_pyproject() -> str:
    pyproject = REPO_ROOT / "oa-cli" / "pyproject.toml"
    if not pyproject.exists():
        return "unknown"
    for line in pyproject.read_text().splitlines():
        if line.startswith("version"):
            return line.split("=")[1].strip().strip('"').strip("'")
    return "unknown"


def get_test_count() -> int:
    result = run("python -m pytest --co -q 2>/dev/null | tail -1")
    for part in result.split():
        if part.isdigit():
            return int(part)
    return 0


def build_release_notes(tag: str, prev_tag: str, commits: list[str], groups: dict[str, list[str]]) -> str:
    agent_count = count_agents()
    version = get_version_from_pyproject()
    today = date.today().isoformat()

    lines = [f"## What's New in {tag}\n"]

    for key, (title, _) in COMMIT_GROUPS.items():
        items = groups.get(key, [])
        if items:
            lines.append(f"### {title}")
            for item in items:
                lines.append(f"- {item}")
            lines.append("")

    lines.append("### 📊 Stats")
    lines.append(f"- Agent templates: {agent_count}")
    lines.append(f"- Python: 3.10+")
    if prev_tag:
        lines.append(f"- Full diff: [{prev_tag}...{tag}](https://github.com/freekheijting/Open-Agents/compare/{prev_tag}...{tag})")
    lines.append("")

    return "\n".join(lines)


def update_changelog(tag: str, release_notes: str) -> None:
    changelog = REPO_ROOT / "CHANGELOG.md"
    if not changelog.exists():
        return

    today = date.today().isoformat()
    content = changelog.read_text()

    # Build the new section
    section_header = f"## [{tag.lstrip('v')}] - {today}\n"
    body = release_notes.replace(f"## What's New in {tag}\n", "").strip()
    new_section = f"{section_header}\n{body}\n\n---\n\n"

    # Insert after [Unreleased]
    if "## [Unreleased]" in content:
        content = content.replace(
            "## [Unreleased]\n",
            f"## [Unreleased]\n\n---\n\n{new_section}"
        )
    else:
        content = new_section + content

    changelog.write_text(content)
    print(f"Updated CHANGELOG.md with {tag} section.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Open-Agents release notes.")
    parser.add_argument("--tag", default=None, help="Current release tag (e.g. v0.3.1)")
    parser.add_argument("--prev", default=None, help="Previous tag (auto-detected if omitted)")
    parser.add_argument("--no-changelog", action="store_true", help="Skip CHANGELOG.md update")
    args = parser.parse_args()

    tag = args.tag or run("git describe --tags --abbrev=0")
    if not tag:
        print("ERROR: No tag found. Use --tag v0.x.x or create a git tag.", file=sys.stderr)
        sys.exit(1)

    prev_tag = args.prev or get_previous_tag(tag)
    print(f"Generating release notes: {prev_tag or 'beginning'} → {tag}")

    commits = get_commits(prev_tag, tag)
    print(f"Found {len(commits)} commits.")

    groups = categorize_commits(commits)
    notes = build_release_notes(tag, prev_tag, commits, groups)

    output_path = REPO_ROOT / "release-notes.md"
    output_path.write_text(notes)
    print(f"Written: {output_path}")

    if not args.no_changelog:
        update_changelog(tag, notes)


if __name__ == "__main__":
    main()
