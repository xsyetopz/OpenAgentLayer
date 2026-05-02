# Delete checklist

Use this checklist before any file removal, generated artifact pruning, fixture cleanup, or uninstall path.

## Required sequence

1. List exact paths targeted for removal.
2. Inspect ownership:
   - git status for tracked or dirty state
   - OAL manifest ownership for generated artifacts
   - OAL block markers for managed file sections
   - fixture or cache root for temporary files
3. Classify each path as generated, fixture/cache, user-authored, or unknown.
4. Delete only generated or fixture/cache paths that match the user request.
5. Stop when a path is dirty, user-authored, outside scope, or unknown.
6. Verify removal and report the exact command.

## Deny conditions

- Broad patterns such as repository root globs, home directory globs, or unbounded `rm -rf`.
- Replacing deletion with truncation, hidden moves, or permission changes.
- Removing dirty user work without explicit request.
- Removing untracked files when they may be user-authored.
- Deleting generated artifacts by path guessing instead of manifest or marker evidence.

## Output contract

- `Paths`: exact removals attempted.
- `Ownership`: generated, fixture/cache, user-authored, or unknown.
- `Command`: the removal command or API call.
- `Verification`: status or filesystem evidence after removal.
