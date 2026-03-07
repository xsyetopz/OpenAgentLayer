---
name: refactor
description: Guided refactoring workflow for decomposing tangled modules
triggers:
  - "refactor module"
  - "refactor this"
  - "decompose module"
  - "split module"
  - "untangle code"
  - "clean up module"
---

# Refactoring Workflow

This skill guides the refactoring of tangled or oversized modules into clean, feature-oriented components.

## When to Use

- Module has grown too large (>500 LOC)
- Multiple concerns mixed in one file
- High coupling between unrelated features
- Difficult to test or maintain
- User asks to "refactor", "clean up", or "split" a module

## Instructions

### Phase 1: Analysis

First, invoke the indexer to deeply analyze the target module:

```ignore
@indexer Deep index the {module} module.

Extract ALL symbols (not just public).
Map internal dependencies.
Identify logical clusters of functionality.
Output to .claude/memory/arch/refactor-{module}-analysis.md
```

Review the analysis to understand:

- Current structure
- Symbol dependencies
- Natural boundaries

### Phase 2: Design

Invoke the architect to design the decomposition:

```ignore
@architect Design decomposition for {module}.

Read the analysis at .claude/memory/arch/refactor-{module}-analysis.md
Design new module structure following SRP.
Map old symbols to new locations.
Create migration plan with incremental steps.
Output to .claude/memory/arch/refactor-{module}-plan.md
```

The plan should include:

- New module structure
- Symbol migration map
- Order of operations
- Backward compatibility strategy (if needed)

### Phase 3: Baseline Tests

Before making changes, record the test baseline:

```ignore
@verifier Record test baseline for {module} refactoring.

Run existing tests for the module.
Record: "N tests pass, M tests fail"
Save to .claude/memory/refactor-{module}-baseline.md
```

### Phase 4: Incremental Migration

For each sub-module in the plan:

```ignore
@implementer Extract {sub_module} from {module}.

Follow the plan at .claude/memory/arch/refactor-{module}-plan.md
Extract only {sub_module} in this step.
Update imports in dependent files.
Lock files during editing.
```

After each extraction:

```ignore
@verifier Verify {sub_module} extraction.

Run tests for affected modules.
Compare to baseline.
Report any regressions.
```

Repeat until all extractions complete.

### Phase 5: Cleanup

Once all sub-modules are extracted:

```ignore
@implementer Complete {module} refactoring.

Remove empty/dead code from original module.
Verify all imports are updated.
Clean up any temporary compatibility shims.
```

### Phase 6: Documentation

Document the changes:

```ignore
@scribe Document {module} refactoring.

Update knowledge.md with new structure.
Create ADR explaining the decomposition decision.
Update any affected API documentation.
```

## Refactoring Patterns

### Extract Module

Move related functions/types to a new module.

### Extract Trait

Create a trait for polymorphic behavior.

### Split by Concern

Separate data access, business logic, and presentation.

### Consolidate Duplicates

Merge similar code into shared utilities.

## Safety Checklist

Before refactoring:

- [ ] All tests pass
- [ ] No uncommitted changes
- [ ] Branch created for refactoring
- [ ] Baseline recorded

During refactoring:

- [ ] Incremental steps
- [ ] Tests after each step
- [ ] No feature changes mixed in

After refactoring:

- [ ] All tests pass
- [ ] No regressions
- [ ] Documentation updated
- [ ] PR ready for review

## Token Budget

| Phase | Agent | Budget |
|-------|-------|--------|
| Analysis | indexer | 25K |
| Design | architect | 32K |
| Baseline | verifier | 10K |
| Migration (per sub) | implementer | 15K |
| Verification (per sub) | verifier | 10K |
| Cleanup | implementer | 15K |
| Documentation | scribe | 15K |

## Rollback Strategy

If refactoring goes wrong:

1. Check git status for uncommitted changes
2. Use `git stash` or `git checkout` to revert
3. Review what went wrong
4. Adjust the plan
5. Try again with smaller steps

## Common Pitfalls

### Changing behavior during refactoring

- Keep refactoring and feature changes separate
- If you find bugs, note them for later
- Maintain exact behavior during migration

### Too many changes at once

- Extract one sub-module at a time
- Test after each extraction
- Commit after each successful step

### Breaking dependent code

- Update imports incrementally
- Use temporary re-exports if needed
- Search for all usages before moving symbols
