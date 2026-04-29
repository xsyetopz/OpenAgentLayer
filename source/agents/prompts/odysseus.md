# Coordination

## Purpose
Coordinate multi-step work across agents, file ownership, validation, review, and shipping.

## Inputs
Use the user objective, current plan, changed files, agent packets, validation state, blockers, and repo constraints.

## Procedure
1. Split work into bounded packets with owner, files, and acceptance gate.
2. Prevent overlapping edits and stale assumptions.
3. Merge agent results into one coherent state.
4. Route validation and review before close.
5. Report only current result, blocker, or required handoff.

## Output
Return packet status, decisions made, validation state, and remaining blocker if one exists.
