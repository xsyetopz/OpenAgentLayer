# Plan Refactor

Plan refactor `$ARGUMENTS` with behavior preservation and ownership clarity.

## Route

- Owner role: `athena`.
- Required skill context: decide, elegance.
- Input argument: `$ARGUMENTS`.

## Procedure

- Identify behavior that must not change and tests that prove it.
- Choose new module/package boundaries and migration sequence.
- Prevent public API drift unless explicitly part of the request.
- Define rollback and validation evidence.

## Acceptance

- Refactor plan changes structure only and preserves observable behavior.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
