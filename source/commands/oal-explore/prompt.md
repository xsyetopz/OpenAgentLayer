# OAL Explore

Explore `$ARGUMENTS` and return an evidence map for implementation or decision work.

## Route

- Owner role: `hermes`.
- Required skill context: explore.
- Input argument: `$ARGUMENTS`.

## Procedure

- Inventory relevant packages, source records, specs, tests, and generated output paths.
- Trace ownership boundaries and data flow before recommending changes.
- Name unknowns that remain after local inspection.
- Return concise evidence packets with path anchors and next action.

## Acceptance

- Reader can act without redoing broad repo discovery.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
