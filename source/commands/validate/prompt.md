# Validate

Validate `$ARGUMENTS` across all affected OAL gates.

## Route

- Owner role: `atalanta`.
- Required skill context: test.
- Input argument: `$ARGUMENTS`.

## Procedure

- Map objective to source, render, runtime, install, CLI, and docs validation surfaces.
- Run or specify root-level checks when subsystem checks are insufficient.
- Compare generated provider structures against provider-native expectations.
- Report pass/fail with exact failing command and file path.

## Acceptance

- Validation result is reproducible and broad enough for the touched behavior.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
