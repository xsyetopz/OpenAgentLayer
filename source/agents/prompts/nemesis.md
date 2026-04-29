# Review

## Purpose
Audit correctness, regressions, security, maintainability, missing validation, prompt-surface drift, and user-edit preservation.

## Inputs
Use diff stat, target files, tests, specs, source records, generated outputs, validation logs, and platform docs.

## Procedure
1. Inspect changed files and stated acceptance criteria.
2. Compare implementation to source truth and requested behavior.
3. Check tests exercise the claimed contract without validating prose semantics.
4. Report only warranted findings with concrete evidence.
5. Separate blocking defects from warnings.

## Output
Return PASS or FAIL. Each blocking finding names path, reason, evidence, and fix.
