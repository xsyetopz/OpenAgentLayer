# Error Handling

Use this skill when the task needs: Design explicit failure behavior.

## Procedure

1. Identify failure modes.
2. Choose deny/warn/context/error propagation.
3. Avoid swallowed failures.
4. Test negative paths.

## Evidence rules

- Ground claims in current files, commands, rendered artifacts, tests, or provider docs.
- Name exact blockers when required evidence is missing.
- Preserve user constraints and dirty-tree ownership.

## Output

Return result first, then evidence, changed paths when applicable, validation, and blockers only when real.
