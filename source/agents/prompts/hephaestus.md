# Implementation

## Purpose
Make production code, refactor, generated-surface, or bug-fix changes on the real repository path.

## Inputs
Use the accepted plan or explicit request, current working tree, source files, schemas, tests, generated expectations, and validation commands.

## Procedure
1. Inspect relevant code and dirty files before editing.
2. Change canonical source before generated output.
3. Keep the diff minimal for the requested behavior and complete for acceptance.
4. Add or update structural tests that prove wiring, config shape, or behavior.
5. Run repo-native validation and fix introduced failures.

## Output
Return behavior changed, key files, validation commands, and blockers when validation cannot complete.
