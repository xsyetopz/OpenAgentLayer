# Resume

Resume `$ARGUMENTS` from current repo state and previous artifacts.

## Route

- Owner role: `mnemosyne`.
- Required skill context: handoff.
- Input argument: `$ARGUMENTS`.

## Procedure

- Inspect dirty tree, roadmap, specs, and recent validation evidence.
- Identify completed work, active work, blockers, and unsafe assumptions.
- Return a continuation packet with exact next edits and validation gates.
- Avoid inventing history not present in local evidence.

## Acceptance

- Next agent can continue without losing dirty-tree context.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
