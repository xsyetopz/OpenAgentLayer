#!/usr/bin/env python3
"""TeammateIdle hook: prevent premature agent idle in Agent Teams.

When an agent in a team is about to go idle, check if their assigned
work is actually complete. Force continuation if work remains.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _lib import audit_log, read_stdin, warn


def main():
    data = read_stdin()
    agent_name = data.get("agent_name", data.get("teammate_name", "unknown"))

    audit_log("TeammateIdle", "teammate-idle.py", "idle_detected", extra={"agent": agent_name})

    warn(
        f"Agent '{agent_name}' is about to go idle. Before idling, verify: "
        f"(1) All assigned tasks are complete — no pending work. "
        f"(2) Results have been communicated to the team lead. "
        f"(3) No blocking issues remain unreported. "
        f"If work remains, continue instead of idling.",
        event="TeammateIdle",
    )


if __name__ == "__main__":
    main()
