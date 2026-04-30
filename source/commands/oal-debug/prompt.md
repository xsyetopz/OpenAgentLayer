# OAL Debug

Debug `$ARGUMENTS` by reproducing, bounding, and localizing the failure before proposing fixes.

## Route

- Owner role: `hermes`.
- Required skill context: debug.
- Input argument: `$ARGUMENTS`.

## Procedure

- Capture exact symptom, input, failing command, or wrong generated artifact.
- Compare expected source/spec behavior against observed behavior.
- Narrow the smallest responsible package, source record, adapter, runtime policy, or installer path.
- Report verified root cause, uncertainty, and next validating command.

## Acceptance

- Root cause is evidence-backed or blocker names exact missing evidence.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
