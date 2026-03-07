# Hybrid Agent Strategy

This document explains when to use Agent Teams vs Subagents for different types of tasks.

## Overview

The Claude Code system supports two agent approaches:

| Approach | Best For | Coordination | Token Cost |
|----------|----------|--------------|------------|
| **Agent Teams** | Complex, multi-phase work | High | Higher |
| **Subagents** | Focused, independent tasks | None | Lower |

## When to Use Agent Teams

### Ideal Scenarios

1. **Cross-cutting Features**
   - Work spans multiple modules
   - Requires coordinated changes
   - Benefits from shared context

2. **Architecture-First Development**
   - New features needing design
   - Significant structural changes
   - Multiple stakeholders

3. **Parallel Investigation**
   - Debugging with multiple hypotheses
   - Research across different areas
   - Code review from multiple perspectives

4. **Multi-Phase Workflows**
   - Index → Design → Implement → Test → Document
   - Refactoring with incremental verification
   - Migration with rollback points

### Agent Team Examples

```
✓ "Add a new caching layer"
  → Needs design, implementation, testing, docs
  → Multiple modules affected
  → Benefits from coordinated approach

✓ "Refactor the auth module into smaller pieces"
  → Needs analysis, planning, incremental changes
  → High risk of breaking changes
  → Requires verification after each step

✓ "Debug this intermittent failure"
  → Multiple hypotheses to test
  → Cross-file investigation
  → Benefits from parallel exploration
```

## When to Use Subagents

### Ideal Scenarios

1. **Sequential Tasks**
   - Each step depends on previous
   - Single thread of work
   - No parallelism benefit

2. **Same-File Edits**
   - Changes concentrated in one area
   - Risk of conflicts with teams
   - Simpler coordination

3. **Routine Tasks**
   - Well-defined scope
   - Predictable pattern
   - Low coordination needs

4. **Quick Operations**
   - Simple queries
   - Small changes
   - Fast turnaround

### Subagent Examples

```
✓ "Find all usages of this function"
  → Single focused task
  → No coordination needed
  → Fast completion

✓ "Add a test for this edge case"
  → Single file change
  → Clear scope
  → No design needed

✓ "Update this config value"
  → Simple change
  → Isolated impact
  → No verification needed
```

## Decision Matrix

| Factor | Favor Teams | Favor Subagents |
|--------|-------------|-----------------|
| **Scope** | Multi-module | Single module |
| **Design** | Needed | Not needed |
| **Risk** | High | Low |
| **Duration** | Hours | Minutes |
| **Verification** | Required | Optional |
| **Parallelism** | Beneficial | Not beneficial |
| **Coordination** | Required | Not required |

## Hybrid Patterns

### Pattern 1: Team for Design, Subagent for Execution

```
TEAM PHASE:
  Indexer → Architect → Design approved

SUBAGENT PHASE:
  Implementer (subagent) → Quick implementation
  Verifier (subagent) → Targeted tests
```

**When to use**: Design is complex but implementation is straightforward.

### Pattern 2: Subagent for Analysis, Team for Action

```
SUBAGENT PHASE:
  Quick exploration → Understand the problem

TEAM PHASE:
  Full team → Coordinated solution
```

**When to use**: Need to understand before committing to full workflow.

### Pattern 3: Team with Subagent Helpers

```
TEAM PHASE:
  Architect designs feature

  PARALLEL SUBAGENTS:
    - Research dependency options
    - Check existing patterns
    - Verify compatibility

  Back to Architect with results
```

**When to use**: Team needs parallel research to inform decisions.

## Anti-Patterns

### Don't Use Teams For:

1. **Simple Queries**
   ```
   BAD: Team to find a function definition
   GOOD: Single Grep/Glob call
   ```

2. **Same-File Heavy Edits**
   ```
   BAD: Multiple agents editing same file
   GOOD: Single implementer with locks
   ```

3. **Highly Sequential Work**
   ```
   BAD: Team where each agent waits for previous
   GOOD: Single agent doing sequential steps
   ```

### Don't Use Subagents For:

1. **Cross-Module Refactoring**
   ```
   BAD: Subagent trying to coordinate changes
   GOOD: Team with architect coordination
   ```

2. **Design Decisions**
   ```
   BAD: Subagent making architectural choices
   GOOD: Architect agent with proper context
   ```

3. **Risky Changes**
   ```
   BAD: Subagent making breaking changes
   GOOD: Team with verification steps
   ```

## Cost-Benefit Analysis

### Agent Team Costs
- Higher token usage per task
- More setup overhead
- Memory file management
- Coordination complexity

### Agent Team Benefits
- Better for complex work
- Parallel execution possible
- Persistent context sharing
- Structured handoffs

### Subagent Costs
- No shared context
- Must provide full context each time
- No coordination mechanism
- Risk of duplicated work

### Subagent Benefits
- Lower token usage
- Faster for simple tasks
- No coordination overhead
- Simpler mental model

## Migration Between Approaches

### Escalating to Team

If a subagent task grows complex:

1. Document what's been learned
2. Create memory files for context
3. Invoke full team workflow
4. Reference previous work

### De-escalating to Subagent

If team is overkill:

1. Complete current phase cleanly
2. Switch to subagent for remaining simple tasks
3. Skip unnecessary verification steps

## Recommendations

### Start Simple

1. Begin with subagent for exploration
2. Escalate to team if complexity grows
3. Don't over-engineer simple tasks

### Match Tool to Task

| Task Type | Recommended Approach |
|-----------|---------------------|
| Bug fix (isolated) | Subagent |
| Bug fix (cross-file) | Team |
| New feature (small) | Subagent |
| New feature (large) | Team |
| Refactoring | Team |
| Documentation | Subagent or Scribe agent |
| Testing | Subagent or Verifier agent |
| Research | Subagent |

### Monitor and Adjust

- If subagent is struggling, escalate
- If team feels slow, consider subagent
- Measure token usage and adjust

## Summary

**Use Agent Teams when**:
- Work is complex and multi-phase
- Design decisions are needed
- Multiple areas affected
- Verification is important

**Use Subagents when**:
- Work is simple and focused
- Single area affected
- No design needed
- Speed is priority

**Use Hybrid when**:
- Combine strengths of both
- Design phase needs team
- Execution can be subagents
- Research can parallelize
