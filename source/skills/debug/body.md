# Debugging Workflow

## First Principle

**Debug by narrowing the search space, not by guessing fixes.**

## Investigation Protocol

1. **Reproduce** - capture the exact failing behavior, input, and expected outcome
2. **Bound** - identify what still works and what recently changed
3. **Localize** - narrow the likely subsystem, file set, or state transition
4. **Verify** - collect code, log, stack trace, or test evidence that supports the hypothesis
5. **Hand off** - report the most likely root cause, uncertainty, and the next validating step

## Evidence Rules

- Quote the concrete symptom first: error text, failing assertion, wrong output, or bad state transition
- Distinguish **verified** from **suspected**
- Prefer one strong hypothesis over a list of vague possibilities
- If execution is needed, route to the test runner or explicit validation path instead of pretending from static reads

## Common Failure Classes

| Class        | What to check first                            |
| ------------ | ---------------------------------------------- |
| Regression   | recent diffs, feature flags, changed contracts |
| State bug    | stale caches, missing resets, lifecycle gaps   |
| Boundary bug | validation, serialization, API mismatch        |
| Async bug    | missing await, race, ordering assumptions      |
| Config bug   | wrong env, fallback path, precedence           |

## Do NOT

- Start by rewriting code
- Present speculative fixes as if they were verified
- Conflate “can reproduce” with “understand root cause”
- Drift into implementation when the task is still investigation
