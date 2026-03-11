"""Invocation Quality Gate (#33) — scores agent prompts before spawn."""

from __future__ import annotations

import re


class InvocationValidator:
    """Score a prompt on 5 L-010 quality dimensions (0–1 each, total 0–5)."""

    # (dimension_key, regex_pattern, warning_message)
    _CHECKS: list[tuple[str, str, str]] = [
        (
            "has_output_path",
            r"[Ss]chrijf naar|[Oo]utput|result\.md|\.done",
            "Missing output path — add 'Schrijf naar: ./output/result.md' or similar",
        ),
        (
            "has_scope",
            r"##\s*[Ss]cope|[Ss]cope\s*[-:]|##\s*Taak|##\s*Task",
            "Missing scope section — add '## Scope' with bullet points",
        ),
        (
            "has_quality_rules",
            r"##\s*[Rr]egel|[Rr]ules?|[Kk]waliteit|[Qq]uality|[Ii]nstructies",
            "Missing quality rules — add '## Regels' or '## Rules' section",
        ),
        (
            "has_role",
            r"[Jj]e bent|[Yy]ou are|WORKER|RESEARCHER|PLANNER|REVIEWER|[Rr]ole:",
            "Missing role definition — add 'Je bent een ...' or 'You are a ...'",
        ),
        (
            "has_constraints",
            r"[Mm]ax\s+\d+|geen nieuwe|no new dep|[Cc]onstraint|[Bb]eperk|[Pp]ython\s+3\.\d+",
            "Missing constraints — add max lines, Python version, or dependency rules",
        ),
    ]

    def score(self, prompt: str) -> dict:
        """Score prompt on 5 dimensions.

        Returns:
            {
                "has_output_path": 0|1,
                "has_scope": 0|1,
                "has_quality_rules": 0|1,
                "has_role": 0|1,
                "has_constraints": 0|1,
                "total_score": int (0-5),
                "warnings": list[str],
            }
        """
        result: dict = {}
        warnings: list[str] = []

        for key, pattern, message in self._CHECKS:
            hit = 1 if re.search(pattern, prompt) else 0
            result[key] = hit
            if not hit:
                warnings.append(message)

        result["total_score"] = sum(result[k] for k, _, _ in self._CHECKS)
        result["warnings"] = warnings
        return result
