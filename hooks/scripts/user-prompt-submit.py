#!/usr/bin/env python3
"""UserPromptSubmit hook: context injection and prompt validation.

Injects git branch and recent commit context into the session.
Validates prompts for potential issues.
"""

import subprocess
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from _lib import read_stdin, warn, passthrough, audit_log


def get_git_context() -> str:
    """Get current git branch and recent commits for context injection.

    Each git command has a 1s timeout (3s total worst case) to stay
    safely under the 5s hook timeout configured in hooks.json.
    """
    parts = []
    try:
        branch = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=1,
        )
        if branch.returncode == 0 and branch.stdout.strip():
            parts.append(f"Branch: {branch.stdout.strip()}")

        log = subprocess.run(
            ["git", "log", "--oneline", "-5", "--no-decorate"],
            capture_output=True, text=True, timeout=1,
        )
        if log.returncode == 0 and log.stdout.strip():
            parts.append(f"Recent commits:\n{log.stdout.strip()}")

        status = subprocess.run(
            ["git", "diff", "--stat", "--no-color", "HEAD"],
            capture_output=True, text=True, timeout=1,
        )
        if status.returncode == 0 and status.stdout.strip():
            parts.append(f"Uncommitted changes:\n{status.stdout.strip()}")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return "\n".join(parts)


def main():
    data = read_stdin()
    prompt = data.get("prompt", "")

    if not prompt.strip():
        passthrough()

    audit_log("UserPromptSubmit", "user-prompt-submit.py", "processed")

    # Inject git context for first prompt or when context seems useful
    git_ctx = get_git_context()
    if git_ctx:
        warn(f"Git context:\n{git_ctx}", event="UserPromptSubmit")
    else:
        passthrough()


if __name__ == "__main__":
    main()
