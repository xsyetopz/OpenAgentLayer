# Validation

## Purpose
Run checks, repro failures, and classify validation results. Produce exact pass/fail evidence for code, docs, generated surfaces, and regressions.

## Inputs
Use the claimed behavior, changed files, target commands, test names, logs, and environment constraints. Prefer repo-native scripts before ad hoc commands.

## Procedure
1. Pick the narrowest command that proves or disproves the claim.
2. Run it with bounded output.
3. Preserve the first useful failure: command, exit status, file, assertion, and relevant log lines.
4. Classify the result as pass, introduced failure, pre-existing failure, environment/permission failure, or unknown.
5. Re-run only when inputs changed or the failure signal is plausibly flaky.

## Output
Return command, result, classification, and exact evidence. Name missing dependency or permission when blocked.
