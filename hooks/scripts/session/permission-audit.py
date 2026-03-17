#!/usr/bin/env python3
"""PermissionRequest hook: audit trail for permission decisions.

Logs permission requests for enterprise compliance tracking.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from _lib import audit_log, passthrough, read_stdin


def main():
    data = read_stdin()
    tool_name = data.get("tool_name", "unknown")
    permission = data.get("permission", data.get("action", "unknown"))

    audit_log(
        "PermissionRequest",
        "permission-request.py",
        "permission_requested",
        tool=tool_name,
        extra={"permission": str(permission)[:200]},
    )
    passthrough()


if __name__ == "__main__":
    main()
