from __future__ import annotations

import re

BACKCHANNEL = {
    "yeah", "okay", "ok", "mm-hmm", "mhm", "right", "sure", "exactly",
    "got it", "cool", "yep", "uh-huh", "alright", "fine", "great", "thanks",
}

SIGNAL_PATTERN = re.compile(
    r"\b("
    r"i'?ll|i will|we'?ll|we will|going to|gonna|need to|needs to|should|must|"
    r"can you|could you|let'?s|will send|will do|will finish|will complete|"
    r"today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
    r"next week|by eod|end of day|deadline|due|"
    r"blocked|delayed|rejected|overdue|issue|problem|risk|concern|"
    r"decide|decided|agreed|approve|approved|"
    r"email|send.*report|cc\b"
    r")\b",
    re.IGNORECASE,
)


def is_backchannel_only(text: str) -> bool:
    words = [w.strip(".,!?").lower() for w in text.split()]
    if not words:
        return True
    non_backchannel = [w for w in words if w not in BACKCHANNEL]
    return len(non_backchannel) == 0


def has_salience_signal(text: str) -> bool:
    if "?" in text:
        return True
    return bool(SIGNAL_PATTERN.search(text))


def should_extract(window_text: str, min_words: int) -> bool:
    """Cheap, regex-only gate deciding whether a window is worth an LLM call.

    Deliberately recall-oriented: it only decides whether to *ask* the model,
    never whether something *is* an action item.
    """
    words = window_text.split()
    if len(words) < min_words:
        return False
    if is_backchannel_only(window_text):
        return False
    return has_salience_signal(window_text)
