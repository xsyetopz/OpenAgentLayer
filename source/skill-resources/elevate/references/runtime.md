# Privileged runtime

Use privileged execution for bounded host commands that need host access beyond the normal sandbox.

Checklist:

1. Identify the required host capability.
2. Convert the command to argv.
3. Check allowlist and cwd boundary.
4. Run dry-run when supported.
5. Request escalation with a scoped prefix rule.
6. Report command, exit code, and bounded output.

Blocker signals:

- executable needs a runtime allowlist entry
- delete, history-change, publish, and signing requests need explicit user intent
- cwd outside approved roots
- command shape needs a shell string, pipeline, glob, or unbounded user-provided segment
