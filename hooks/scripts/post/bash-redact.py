#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _lib import (
    SECRET_PATTERNS,
    PII_PATTERNS,
    read_stdin,
    warn,
    passthrough,
)


def detect_sensitive(text: str) -> list[str]:
    hits = []
    for pat in SECRET_PATTERNS:
        if pat.search(text):
            hits.append("secret/credential")
            break
    for pat in PII_PATTERNS:
        m = pat.search(text)
        if m:
            label = categorize_pii(pat.pattern)
            if label and label not in hits:
                hits.append(label)
    return hits


def categorize_pii(pattern: str) -> str:
    if "@" in pattern:
        return "email address"
    if "\\d{3}-\\d{2}-\\d{4}" in pattern:
        return "SSN"
    if "\\d{4}" in pattern and "3" in pattern:
        return "credit card number"
    if "169.254" in pattern:
        return "cloud metadata endpoint"
    if "10\\." in pattern or "172\\." in pattern or "192\\.168" in pattern:
        return "private IP address"
    if "\\d{3}" in pattern:
        return "phone number"
    return ""


def main() -> None:
    data = read_stdin()
    if not data:
        passthrough()

    tool_response = data.get("tool_response", "")
    if not tool_response or not isinstance(tool_response, str):
        passthrough()

    hits = detect_sensitive(tool_response)
    if not hits:
        passthrough()

    summary = ", ".join(hits[:5])
    warn(
        f"[redact] Sensitive data detected in command output: {summary}. "
        "Do not repeat, log, or reference these values. "
        "Replace with [REDACTED] in any output.",
        event="PostToolUse",
    )


if __name__ == "__main__":
    main()
