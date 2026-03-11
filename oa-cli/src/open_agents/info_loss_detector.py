"""Information Loss Detector (#36) — detect topic loss between worker and combiner outputs."""

from __future__ import annotations

import logging
import re
from collections import Counter

logger = logging.getLogger(__name__)

_DEFAULT_THRESHOLD = 0.2  # 20% topic loss triggers a warning
_MIN_WORD_LENGTH = 4
_STOP_WORDS = frozenset({
    "this", "that", "with", "from", "have", "been", "will", "they",
    "their", "there", "what", "when", "where", "which", "also", "into",
    "about", "after", "before", "should", "would", "could", "then",
    "than", "more", "some", "such", "each", "were", "your", "just",
    "very", "only", "over", "said", "like", "used", "both", "well",
})


def _extract_topics(text: str, top_n: int = 30) -> set[str]:
    """Extract key topics (frequent meaningful words) from text."""
    words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9_\-]*\b", text.lower())
    filtered = [
        w for w in words
        if len(w) >= _MIN_WORD_LENGTH and w not in _STOP_WORDS
    ]
    counts = Counter(filtered)
    return {word for word, _ in counts.most_common(top_n)}


def detect_loss(
    worker_outputs: list[str],
    combiner_output: str,
    threshold: float = _DEFAULT_THRESHOLD,
) -> dict:
    """Detect information loss between worker outputs and a combiner output.

    Compares key topics extracted from the combined worker outputs against
    those found in the combiner output.  A topic is considered "lost" if it
    appears in the worker union but not in the combiner.

    Args:
        worker_outputs: List of output strings from individual worker agents.
        combiner_output: The final combined/summarised output string.
        threshold: Loss ratio above which ``threshold_exceeded`` is set to
            True.  Default is 0.2 (20%).

    Returns:
        dict with keys:
            loss_ratio (float): Fraction of worker topics absent from combiner.
            missing_topics (list[str]): Topics present in workers but not combiner.
            threshold_exceeded (bool): True when loss_ratio >= threshold.
    """
    if not worker_outputs:
        return {"loss_ratio": 0.0, "missing_topics": [], "threshold_exceeded": False}

    worker_union: set[str] = set()
    for output in worker_outputs:
        worker_union |= _extract_topics(output)

    combiner_topics = _extract_topics(combiner_output)

    if not worker_union:
        return {"loss_ratio": 0.0, "missing_topics": [], "threshold_exceeded": False}

    missing = worker_union - combiner_topics
    loss_ratio = len(missing) / len(worker_union)
    exceeded = loss_ratio >= threshold

    if exceeded:
        logger.warning(
            "info_loss_detector: loss_ratio=%.2f exceeds threshold=%.2f; missing=%s",
            loss_ratio,
            threshold,
            sorted(missing)[:10],
        )

    return {
        "loss_ratio": round(loss_ratio, 4),
        "missing_topics": sorted(missing),
        "threshold_exceeded": exceeded,
    }
