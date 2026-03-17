#!/usr/bin/env python3
"""PostToolUseFailure hook: log failures and detect retry loops.

Tracks consecutive failures to the same tool to prevent infinite retry loops.
Suggests alternative approaches when stuck.
"""

import hashlib
import os
import sys
import json
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
from _lib import read_stdin, warn, passthrough, audit_log

MAX_CONSECUTIVE = 3


def _failure_log_path() -> str:
    """Per-user, per-project failure log to avoid /tmp collisions."""
    uid = str(os.getuid())
    cwd_hash = hashlib.sha256(os.getcwd().encode()).hexdigest()[:12]
    return os.path.join(tempfile.gettempdir(), f"cca-failures-{uid}-{cwd_hash}.jsonl")


def get_recent_failures(tool_name: str) -> int:
    """Count consecutive recent failures for the same tool."""
    log_path = _failure_log_path()
    if not os.path.exists(log_path):
        return 0
    count = 0
    try:
        with open(log_path) as f:
            lines = f.readlines()
        for line in reversed(lines[-10:]):
            entry = json.loads(line.strip())
            if entry.get("tool") == tool_name:
                count += 1
            else:
                break
    except (json.JSONDecodeError, OSError):
        pass
    return count


def log_failure(tool_name: str, error: str):
    """Append failure to log file, keeping only the last 50 entries."""
    log_path = _failure_log_path()
    try:
        lines = []
        if os.path.exists(log_path):
            with open(log_path) as f:
                lines = f.readlines()[-49:]  # Keep last 49 + new = 50
        fd = os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as f:
            f.writelines(lines)
            f.write(json.dumps({"tool": tool_name, "error": error[:200]}) + "\n")
    except OSError:
        pass


def main():
    data = read_stdin()
    tool_name = data.get("tool_name", "unknown")
    error = data.get("tool_error", data.get("error", ""))

    log_failure(tool_name, str(error))
    audit_log("PostToolUseFailure", "post-failure.py", "logged", tool=tool_name, reason=str(error)[:200])

    consecutive = get_recent_failures(tool_name)
    if consecutive >= MAX_CONSECUTIVE:
        warn(
            f"Tool '{tool_name}' has failed {consecutive} times consecutively. "
            f"Stop retrying the same approach. Consider: "
            f"(1) a different tool, (2) a different approach, (3) asking the user for guidance.",
            event="PostToolUseFailure",
        )
    else:
        passthrough()


if __name__ == "__main__":
    main()
