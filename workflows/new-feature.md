# Workflow: Adding a New Feature

This document describes the step-by-step process for adding a new feature using the agent team.

## Overview

| Phase | Agent | Time | Tokens |
|-------|-------|------|--------|
| 1. Index | indexer | ~15 min | 15-25K |
| 2. Design | architect | ~10 min | 25-32K |
| 3. Implement | implementer | ~15 min | 25-32K |
| 4. Test | verifier | ~10 min | 20-30K |
| 5. Document | scribe | ~5 min | 15-20K |
| **Total** | | **~55 min** | **100-145K** |

## Prerequisites

- Project has `.claude/` directory set up
- Agent definitions copied to `.claude/agents/`
- Memory directory initialized

### Phase 1: Project Indexing

#### Phase 1 Goal

Ensure project memory is up-to-date so other agents can work efficiently.

#### Phase 1 Steps

1. **Check existing index**

   ```bash
   ls -la .claude/memory/project-index.md
   ```

2. **Invoke indexer if needed**

   ```ignore
   @indexer Index this project for feature development
   ```

3. **Verify output**
   - `.claude/memory/project-index.md` exists
   - Contains module map, symbol index, patterns

#### Phase 1 Skip Conditions

- Index exists and is <24h old
- No major changes since last index

### Phase 2: Architecture Design

#### Phase 2 Goal

Create a detailed implementation blueprint before writing code.

#### Phase 2 Steps

1. **Gather requirements**
   - What is the feature name?
   - What problem does it solve?
   - Who are the users?
   - Any constraints (performance, security, compatibility)?

2. **Invoke architect**

   ```ignore
   @architect Design the {feature_name} feature.

   Requirements:
   - {requirement_1}
   - {requirement_2}
   - {requirement_3}

   Constraints:
   - {constraint_1}
   ```

3. **Review output**
   - `.claude/memory/arch/{feature_name}.md` created
   - Module structure defined
   - Public interface specified
   - Implementation tasks listed

4. **Get approval**
   - Review design with stakeholders
   - Mark status as "approved" in arch file

### Phase 3: Implementation

#### Phase 3 Goal

Write code following the architecture plan.

#### Phase 3 Steps

1. **Review the plan**

   ```bash
   cat .claude/memory/arch/{feature_name}.md
   ```

2. **Invoke implementer**

   ```ignore
   @implementer Implement the {feature_name} feature.

   Follow the architecture plan at .claude/memory/arch/{feature_name}.md
   ```

3. **Monitor progress**
   - Check `.claude/memory/tasks.md` for status
   - Check `.claude/memory/locks.md` for active edits

4. **Handle blockers**
   - If implementer posts question, answer it
   - If design issue found, route to architect

### Phase 4: Testing

#### Phase 4 Goal

Verify the implementation works correctly.

#### Phase 4 Steps

1. **Invoke verifier**

   ```ignore
   @verifier Test the {feature_name} feature.

   Implementation is complete per tasks.md.
   ```

2. **Review results**
   - Check test output
   - Review `.claude/memory/test-coverage.md`

3. **Handle failures**
   - If test bugs: verifier fixes tests
   - If impl bugs: route to implementer
   - If design issues: route to architect

4. **Confirm success**
   - All tests pass
   - Coverage is acceptable

### Phase 5: Documentation

#### Phase 5 Goal

Document the feature for future developers.

#### Phase 5 Steps

1. **Invoke scribe**

   ```ignore
   @scribe Document the {feature_name} feature.

   Implementation is complete and tested.
   ```

2. **Review output**
   - API documentation added
   - `.claude/memory/knowledge.md` updated
   - ADR created if needed

3. **Final check**
   - Documentation is accurate
   - Examples work

## Completion Checklist

- [ ] Index is up-to-date
- [ ] Architecture plan approved
- [ ] Implementation complete
- [ ] All tests pass
- [ ] Documentation written
- [ ] Locks released
- [ ] Tasks marked complete
- [ ] Ready for PR

## Example: Adding a Cache Feature

### Example Requirements

- LRU cache with configurable size
- TTL per entry
- Thread-safe

### Example Execution

```ignore
# Phase 1
@indexer Index this project

# Phase 2
@architect Design a cache module.
Requirements:
- LRU eviction policy
- Per-entry TTL support
- Thread-safe for concurrent access
- Configurable max size

# Phase 3
@implementer Implement the cache module.
Follow .claude/memory/arch/cache.md

# Phase 4
@verifier Test the cache module.

# Phase 5
@scribe Document the cache module.
```

## Troubleshooting

### Indexer takes too long

- Use targeted index for specific directories
- Check for large generated files to exclude

### Architect needs clarification

- Provide more specific requirements
- Share examples of similar features

### Implementer blocked

- Check tasks.md for the issue
- May need architect decision

### Tests fail

- Check verifier's analysis
- Route to appropriate agent

### Documentation incomplete

- Ensure implementation is actually complete
- Check that public API is defined
