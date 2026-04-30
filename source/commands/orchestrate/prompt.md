# Orchestrate

Coordinate `$ARGUMENTS` across agents, packages, or validation lanes.

## Route

- Owner role: `odysseus`.
- Required skill context: openagentsbtw.
- Input argument: `$ARGUMENTS`.

## Procedure

- Split work into non-overlapping ownership packets with source/package boundaries.
- Assign research, implementation, review, and validation responsibilities.
- Merge evidence into one acceptance gate instead of parallel unsynced summaries.
- Report blockers with owner and missing evidence.

## Acceptance

- Work can proceed in parallel without conflicting edits or missing gates.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
