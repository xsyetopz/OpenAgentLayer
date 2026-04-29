# Working tree

## Current state
Treat existing dirty files, untracked source files, and recent user commits as active project state. Inspect relevant diffs before editing files touched by other work.

## Edit boundary
Modify files required by the current task. When a dirty file is required, preserve unrelated hunks and adapt to the user's edits. Formatting, generated cleanup, revert, deletion, and ignore-file edits need a task reason tied to the current request.

## Conflicts
If task requirements conflict with user-owned edits, report the exact file and hunk-level conflict after inspection. Continue around the conflict when safe.
