# OAL Document

Document `$ARGUMENTS` with source-backed implementation truth.

## Route

- Owner role: `calliope`.
- Required skill context: document.
- Input argument: `$ARGUMENTS`.

## Procedure

- Identify the authoritative source files, specs, tests, and provider docs relevant to the document.
- Update docs with exact behavior, paths, commands, and validation gates.
- Remove stale promises, legacy phrasing, and compatibility framing not true for v4.
- Keep docs useful for AI agents executing OAL work.

## Acceptance

- Docs match source behavior and include concrete implementation evidence.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
