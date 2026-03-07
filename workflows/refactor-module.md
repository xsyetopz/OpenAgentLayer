# Workflow: Refactoring a Module

This document describes the step-by-step process for refactoring a tangled or oversized module into clean, well-structured components.

## Overview

| Phase | Agent | Time | Tokens |
|-------|-------|------|--------|
| 1. Deep Analysis | indexer | ~20 min | 25K |
| 2. Decomposition Design | architect | ~15 min | 35K |
| 3. Baseline Tests | verifier | ~5 min | 10K |
| 4. Incremental Migration | implementer + verifier | ~30 min | 40K |
| 5. Cleanup | implementer | ~10 min | 15K |
| 6. Documentation | scribe | ~10 min | 15K |
| **Total** | | **~90 min** | **~140K** |

## When to Refactor

- Module exceeds 500 LOC
- Multiple unrelated concerns in one file
- High coupling between components
- Difficult to test individual behaviors
- Circular dependencies
- "Shotgun surgery" - changes require touching many files

## Prerequisites

- All tests currently pass
- No uncommitted changes
- Clean git branch for refactoring
- Full project index available

## Phase 1: Deep Analysis

### Goal
Understand the current structure and identify natural boundaries.

### Steps

1. **Invoke indexer for deep analysis**
   ```
   @indexer Deep index the {module} module.

   Extract ALL symbols (including private).
   Map internal dependencies.
   Identify logical clusters.
   Output analysis to .claude/memory/arch/refactor-{module}-analysis.md
   ```

2. **Review the analysis**
   - What are the main clusters of functionality?
   - What are the internal dependencies?
   - What is the public interface?
   - Where are the natural seams?

3. **Output**
   - `.claude/memory/arch/refactor-{module}-analysis.md`

## Phase 2: Decomposition Design

### Goal
Design the new module structure following SRP.

### Steps

1. **Invoke architect**
   ```
   @architect Design decomposition for {module}.

   Read analysis at .claude/memory/arch/refactor-{module}-analysis.md
   Design new module structure with clear boundaries.
   Create symbol migration map.
   Plan incremental migration steps.
   ```

2. **Review the design**
   - Does each new module have single responsibility?
   - Is the migration order sensible?
   - Are dependencies properly handled?
   - Is backward compatibility addressed (if needed)?

3. **Output**
   - `.claude/memory/arch/refactor-{module}-plan.md`

### Design Checklist
- [ ] Each new module has clear purpose
- [ ] No circular dependencies in new structure
- [ ] Public API is maintained (or migration path provided)
- [ ] Test strategy defined

## Phase 3: Baseline Tests

### Goal
Record current test state to detect regressions.

### Steps

1. **Invoke verifier**
   ```
   @verifier Record test baseline for {module} refactoring.

   Run all tests that touch {module}.
   Record pass/fail counts.
   Save to .claude/memory/refactor-{module}-baseline.md
   ```

2. **Verify baseline**
   - All relevant tests pass
   - Coverage is recorded
   - No flaky tests

3. **Output**
   - `.claude/memory/refactor-{module}-baseline.md`

## Phase 4: Incremental Migration

### Goal
Extract sub-modules one at a time, testing after each.

### Process
Repeat for each sub-module in the plan:

1. **Extract sub-module**
   ```
   @implementer Extract {sub_module} from {module}.

   Follow .claude/memory/arch/refactor-{module}-plan.md
   Extract only {sub_module} in this step.
   Update all imports.
   ```

2. **Verify extraction**
   ```
   @verifier Verify {sub_module} extraction.

   Compare to baseline at .claude/memory/refactor-{module}-baseline.md
   Report any regressions.
   ```

3. **Commit if successful**
   ```bash
   git add .
   git commit -m "refactor({module}): extract {sub_module}"
   ```

4. **Handle failures**
   - If tests fail, fix before proceeding
   - May need to adjust the migration plan
   - Consult architect if design issues found

### Migration Order (Typical)

1. Extract leaf dependencies first (no internal imports)
2. Then extract modules that only depend on extracted modules
3. Finally handle the core/remaining module

## Phase 5: Cleanup

### Goal
Remove dead code and finalize the refactoring.

### Steps

1. **Invoke implementer**
   ```
   @implementer Complete {module} refactoring.

   Remove empty/dead code from original module.
   Verify all imports are updated.
   Remove any temporary compatibility shims.
   ```

2. **Final verification**
   ```
   @verifier Final verification of {module} refactoring.

   Run all tests.
   Compare to baseline.
   Check coverage hasn't decreased.
   ```

3. **Commit**
   ```bash
   git add .
   git commit -m "refactor({module}): cleanup and finalize"
   ```

## Phase 6: Documentation

### Goal
Document the new structure for future developers.

### Steps

1. **Invoke scribe**
   ```
   @scribe Document {module} refactoring.

   Update knowledge.md with new structure.
   Create ADR explaining the decomposition.
   Update any affected API docs.
   ```

2. **Review documentation**
   - New structure is clear
   - Migration reasons are documented
   - Any breaking changes noted

## Completion Checklist

- [ ] All tests pass
- [ ] Coverage maintained or improved
- [ ] No dead code remaining
- [ ] All imports updated
- [ ] Documentation complete
- [ ] ADR created
- [ ] Git commits are clean and atomic

## Example: Refactoring a Monolithic Auth Module

### Before
```
auth/
└── mod.rs (800 LOC - handles login, session, token, password)
```

### After
```
auth/
├── mod.rs          # Public exports
├── login.rs        # Login flow
├── session.rs      # Session management
├── token.rs        # JWT token handling
├── password.rs     # Password hashing/validation
└── tests/
    └── mod.rs
```

### Execution
```
# Phase 1
@indexer Deep index the auth module

# Phase 2
@architect Design decomposition for auth module

# Phase 3
@verifier Record baseline for auth refactoring

# Phase 4 (repeat for each)
@implementer Extract token handling from auth
@verifier Verify token extraction

@implementer Extract password handling from auth
@verifier Verify password extraction

@implementer Extract session handling from auth
@verifier Verify session extraction

@implementer Extract login handling from auth
@verifier Verify login extraction

# Phase 5
@implementer Complete auth refactoring

# Phase 6
@scribe Document auth refactoring
```

## Rollback Strategy

If something goes wrong:

1. **Minor issue**: Fix and continue
2. **Major issue in recent step**: `git checkout -- .` to undo uncommitted changes
3. **Major issue after commits**: `git revert` the problematic commits
4. **Complete failure**: `git reset --hard` to starting point (use with caution)

## Anti-Patterns to Avoid

- **Big bang refactoring**: Don't try to change everything at once
- **Changing behavior**: Keep behavior identical during refactoring
- **Skipping tests**: Always verify after each step
- **Ignoring dependencies**: Update all imports immediately
- **Mixing refactoring with features**: Keep them separate
