# Audit

Audit `$ARGUMENTS` for concrete correctness, regression, security, provider-validity, and validation risks.

## Route

- Owner role: `nemesis`.
- Required skill context: review.
- Input argument: `$ARGUMENTS`.

## Procedure

- Identify the exact artifact, route, or change set under audit.
- Inspect source records, specs, runtime behavior, and generated outputs that can make the claim true or false.
- Separate warranted findings from taste, speculation, or future-work preference.
- Report blocker/high/medium/low findings with path evidence and exact fix direction.

## Acceptance

- Every finding has a reproducible trigger, impact, and validation consequence.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
