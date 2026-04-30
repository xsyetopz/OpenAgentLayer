# OAL Trace

Trace `$ARGUMENTS` through source records, packages, adapters, runtime, installer, and tests.

## Route

- Owner role: `hermes`.
- Required skill context: trace.
- Input argument: `$ARGUMENTS`.

## Procedure

- Start from the named symbol, file, command, skill, policy, or generated artifact.
- Follow upstream source and downstream render/runtime/install consumers.
- Separate direct dependencies from incidental text matches.
- Return call/data/ownership chain and likely change impact.

## Acceptance

- Impact surface is explicit enough for safe implementation.
- Output includes evidence, validation, changed paths when edits happen, and blockers when blocked.
