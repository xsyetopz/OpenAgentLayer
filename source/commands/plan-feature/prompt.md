# Plan Feature

Plan feature `$ARGUMENTS` as a decision-complete OAL implementation route.

## Route

- Owner role: `athena`.
- Required skill context: decide.
- Input argument: `$ARGUMENTS`.

## Procedure

- Ground in source, specs, tests, provider constraints, and current dirty tree.
- Define behavior, data flow, package ownership, source records, and generated output changes.
- Specify validation commands and acceptance gates.
- Record assumptions that implementer must not re-decide.

## Acceptance

- Implementer can execute without architectural decisions.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
