# OAL Test

Validate `$ARGUMENTS` with targeted test, build, render, install, or runtime evidence.

## Route

- Owner role: `atalanta`.
- Required skill context: test.
- Input argument: `$ARGUMENTS`.

## Procedure

- Select the smallest validation set that proves the changed behavior.
- Run or specify commands that exercise source loading, rendering, runtime scripts, or installer paths.
- Triage failures to root cause instead of hiding output.
- Report command, exit status, and high-signal evidence.

## Acceptance

- Validation proves behavior or reports exact failing gate.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
