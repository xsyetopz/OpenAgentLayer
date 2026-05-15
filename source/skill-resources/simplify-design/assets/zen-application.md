# Zen Application Example

## Problem
Two competing APIs expose the same behavior with different naming and hidden defaults.

## Applied Principles
- Explicit over implicit: require explicit mode selection.
- Readability counts: rename generic `runTask` to `applyRoutePlan`.
- One obvious way: remove alternate alias path and keep one entry point.

## Outcome
- Fewer hidden behaviors.
- Clearer naming across source and tests.
- Lower maintenance cost and easier onboarding.
