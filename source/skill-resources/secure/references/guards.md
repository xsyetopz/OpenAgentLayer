# Safety guards

Check:

- secrets or tokens in source, generated artifacts, logs, and fixtures
- destructive shell commands
- generated files edited directly
- deploy writes outside owned paths
- uninstall deleting user-owned files
- CI release paths available to forks
- provider hooks with broad permissions

Prefer deny-by-default behavior for ambiguous destructive operations.
