# TDD Workflow

Agent-assisted test-driven development cycle. Tests define behavior -- code satisfies tests.

## Philosophy

- Red -> Green -> Refactor. Never skip phases.
- Orchestrator reads minimally: spec + state only. Implementation lives in subagents.
- One cycle = one unit of behavior. Keep scope small -- finish a cycle before expanding.
- Context is the bottleneck. Subagents carry the load; orchestrator tracks state.

## Cycle

### Phase 1 -- Red (failing tests)

Route to @hephaestus:
> "Write tests for [behavior from spec]. Do NOT implement the feature. Tests must fail. Cover: happy path, edge cases, error conditions."

Route to @atalanta:
> "Confirm tests fail. Verify failures are for the right reason (not syntax errors, not missing imports)."

Update `state.yaml`: `phase: red`, `tests_written: N`

### Phase 2 -- Green (minimal implementation)

Route to @hephaestus:
> "Implement [feature] until these tests pass. Write the minimal code that makes them green. No gold-plating."

Route to @atalanta:
> "Run full suite. Report: passed/failed/skipped counts, any regressions."

If regressions: route back to @hephaestus with failure output.
Update `state.yaml`: `phase: green`, `tests_passing: N`

### Phase 3 -- Refactor (clean while green)

Route to @hephaestus:
> "Refactor [file/module] for clarity and maintainability. Tests must stay green. No behavior changes."

Route to @atalanta:
> "Confirm suite still fully green after refactor."

Update `state.yaml`: `phase: done`, `cycle: N+1`

## Orchestrator Rules

- Read ONLY: `spec.md` + `state.yaml`. Nothing else.
- Do NOT read source files, test files, or architecture docs. Subagents read what they need.
- Pass relevant spec excerpts in delegation prompts -- do not tell subagents to find the spec themselves.
- One delegation per phase. If a phase needs iteration, send the agent back with specific feedback.

## State File Format

```yaml
# state.yaml
cycle: 1
phase: red          # red | green | refactor | done
feature: "user login validation"
tests_written: 5
tests_passing: 0
last_updated: 2026-03-23
```

## Sprint Integration

When running multiple cycles:

1. List all behaviors from `spec.md` as a numbered queue.
2. Work one behavior at a time: full red/green/refactor before moving to next.
3. After each cycle: update `state.yaml`, check context usage.
4. If context > 60%: finish current cycle, `/clear`, resume from `state.yaml`.

## Context Discipline

- `/clear` between unrelated features -- never between phases of the same cycle.
- Subagent context windows are independent. Long suites belong in @atalanta.
- If @hephaestus context bloats: scope is too large. Split the feature, restart the cycle.
- Session logs in `~/.claude/` -- analyze with @hermes if cycles consistently fail to complete.

## Done Signal

- All tests green
- No regressions in existing suite
- Refactor complete
- `state.yaml` shows `phase: done`
