#!/usr/bin/env python3
"""SessionEnd hook: cleanup and final audit summary.

Generates a session summary if significant work was done.
Cleans up temporary files created during the session.
"""

import glob
import hashlib
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
from _lib import read_stdin, warn, passthrough, audit_log


def cleanup():
    """Remove per-user/per-project failure logs from this session."""
    uid = str(os.getuid())
    pattern = os.path.join(tempfile.gettempdir(), f"cca-failures-{uid}-*.jsonl")
    for f in glob.glob(pattern):
        try:
            os.remove(f)
        except OSError:
            pass


def count_audit_entries() -> int:
    """Count audit log entries if audit logging was enabled."""
    log_dir = os.environ.get("CCA_HOOK_LOG_DIR")
    if not log_dir:
        return 0
    log_file = os.path.join(log_dir, "cca-hooks.jsonl")
    if not os.path.exists(log_file):
        return 0
    try:
        with open(log_file) as f:
            return sum(1 for _ in f)
    except OSError:
        return 0


def main():
    read_stdin()

    audit_log("SessionEnd", "session-end.py", "session_ended")
    cleanup()

    entries = count_audit_entries()
    if entries > 0:
        warn(
            f"Session ended. {entries} hook events logged to $CCA_HOOK_LOG_DIR/cca-hooks.jsonl.",
            event="SessionEnd",
        )
    else:
        passthrough()


if __name__ == "__main__":
    main()
