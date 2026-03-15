#!/usr/bin/env python3
import json
import sys
import re

REDACT = "★★★REDACTED★★★"
_PATTERNS = [
    re.compile(r'(?i)(?:api|secret|token|key|bearer)\s*[:=]\s*["\']?([^\s"\']+)'),
    re.compile(r'AKIA[0-9A-Z]{16}'),
    re.compile(r'gh[pous]_[A-Za-z0-9_]{36,}'),
    re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}')
]
_FIELDS = ("stdout", "stderr", "body", "content")

def redact_value(val: str) -> str:
    for pat in _PATTERNS:
        val = pat.sub(REDACT, val)
    if len(val) > 30000:
        val = val[:15000] + "\n... " + REDACT + " ..." + val[-15000:]
    return val

def sanitize_response_fields(resp: dict) -> None:
    for k in _FIELDS:
        v = resp.get(k)
        if isinstance(v, str):
            resp[k] = redact_value(v)

def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception as e:
        print(f"Invalid JSON: {e}", file=sys.stderr)
        return 1
    resp = data.get("tool_response", {})
    sanitize_response_fields(resp)
    out = {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": "Outputs sanitized by redaction policy"
        }
    }
    print(json.dumps(out))
    return 0

if __name__ == "__main__":
    sys.exit(main())
