# Workflow: Debugging Cross-File Issues

This document describes how to use the agent team to debug issues that span multiple files.

## Overview

| Phase | Agent | Time | Tokens |
|-------|-------|------|--------|
| 1. Context Gathering | indexer | ~10 min | 15K |
| 2. Hypothesis Formation | architect | ~10 min | 20K |
| 3. Hypothesis Testing | verifier | ~15 min | 25K |
| 4. Fix Implementation | implementer | ~10 min | 15K |
| 5. Regression Test | verifier | ~5 min | 10K |
| **Total** | | **~50 min** | **~85K** |

## When to Use This Workflow

- Bug involves multiple files/modules
- Root cause is unclear
- Simple debugging hasn't worked
- Issue spans architectural boundaries
- Need systematic investigation

## Phase 1: Context Gathering

### Phase 1 Goal

Build a complete picture of the affected code paths.

### Phase 1 Steps

1. **Document the symptoms**
   - What is the expected behavior?
   - What is the actual behavior?
   - When does it occur? (Always, sometimes, specific conditions)
   - Any error messages or stack traces?

2. **Invoke indexer**

   ```ignore
   @indexer Gather context for debugging.

   Symptoms: {description}
   Error: {error_message if any}

   Search for:
   - Related symbols
   - Call chains
   - Configuration
   - Recent changes to related files

   Output to .claude/memory/debug/{issue}-context.md
   ```

3. **Review context**
   - Which modules are involved?
   - What is the call flow?
   - What external dependencies?
   - Any recent changes?

## Phase 2: Hypothesis Formation

### Phase 2 Goal

Generate testable hypotheses about the root cause.

### Phase 2 Steps

1. **Invoke architect**

   ```ignore
   @architect Form hypotheses for {issue}.

   Context at .claude/memory/debug/{issue}-context.md
   Symptoms: {description}

   Generate 3-5 ranked hypotheses.
   For each hypothesis:
   - What would cause this?
   - How can we test it?
   - What evidence would confirm/refute?

   Output to .claude/memory/debug/{issue}-hypotheses.md
   ```

2. **Review hypotheses**
   - Are they testable?
   - Are they ranked by likelihood?
   - Do they cover different root causes?

3. **Example hypotheses**

   ```markdown
   ### Sample Hypotheses

   #### H1: Race condition in cache invalidation (80% likely)
   - Cause: Cache updated before transaction commits
   - Test: Add logging around cache ops, check ordering
   - Confirm: Cache shows stale data when concurrent writes

   #### H2: Missing null check (60% likely)
   - Cause: API returns null when entity deleted
   - Test: Check API response for deleted entities
   - Confirm: Stack trace shows NPE

   #### H3: Configuration mismatch (40% likely)
   - Cause: Dev/prod config differs
   - Test: Compare configuration values
   - Confirm: Issue only in one environment
   ```

## Phase 3: Hypothesis Testing

### Phase 3 Goal

Systematically test each hypothesis to find root cause.

### Phase 3 Steps

1. **Invoke verifier for each hypothesis**

   ```ignore
   @verifier Test hypothesis H1 for {issue}.

   Hypothesis: {description}
   Test approach: {how to test}

   Report:
   - Test performed
   - Results observed
   - Conclusion: Confirmed/Refuted/Inconclusive
   ```

2. **Track results**

   ```markdown
   ### Hypothesis Testing Results

   | # | Hypothesis | Result | Notes |
   |---|------------|--------|-------|
   | H1 | Race condition | Confirmed | Logs show cache update before commit |
   | H2 | Missing null check | Refuted | Null handling present |
   | H3 | Config mismatch | N/A | Skipped (H1 confirmed) |
   ```

3. **Iterate if needed**
   - If all hypotheses refuted, gather more context
   - Generate new hypotheses based on findings
   - Repeat until root cause found

## Phase 4: Fix Implementation

### Phase 4 Goal

Implement a fix for the confirmed root cause.

### Phase 4 Steps

1. **Invoke architect if fix is non-trivial**

   ```ignore
   @architect Design fix for {issue}.

   Root cause: {confirmed hypothesis}
   Context at .claude/memory/debug/{issue}-context.md

   Design:
   - What needs to change?
   - Any architectural implications?
   - Risk assessment
   ```

2. **Invoke implementer**

   ```ignore
   @implementer Fix {issue}.

   Root cause: {description}
   Fix approach: {approach}

   Implement the fix.
   Add regression test.
   ```

3. **Review the fix**
   - Does it address the root cause?
   - Any side effects?
   - Is there a regression test?

## Phase 5: Regression Testing

### Phase 5 Goal

Verify the fix works and doesn't break anything else.

### Phase 5 Steps

1. **Invoke verifier**

   ```ignore
   @verifier Verify fix for {issue}.

   Run regression test for the fix.
   Run related test suites.
   Confirm issue is resolved.
   ```

2. **Confirm resolution**
   - Original issue no longer reproduces
   - No new test failures
   - Regression test passes

3. **Document**

   ```ignore
   @scribe Document {issue} resolution.

   Add to knowledge.md:
   - What was the bug?
   - What was the root cause?
   - How was it fixed?
   - How to prevent similar issues
   ```

## Completion Checklist

- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Regression test added
- [ ] All tests pass
- [ ] Issue documented
- [ ] Knowledge.md updated

## Example: Debugging Intermittent Auth Failure

### Example Symptoms

- Users randomly get "Session expired" error
- Happens ~5% of the time
- No pattern in timing or user type

### Example Execution

```ignore
# Phase 1
@indexer Gather context for auth failure.
Symptoms: Intermittent "Session expired" error, ~5% of requests
Grep for: session, expire, auth, token

# Phase 2
@architect Form hypotheses for session expiry bug.
Context at .claude/memory/debug/session-expiry-context.md

# Phase 3
@verifier Test hypothesis H1: Clock skew between servers
@verifier Test hypothesis H2: Race in session refresh
@verifier Test hypothesis H3: Redis key expiry edge case

# Confirmed H2: Race condition

# Phase 4
@implementer Fix session refresh race condition.
Root cause: Concurrent refresh requests can invalidate each other
Fix: Add mutex lock around session refresh

# Phase 5
@verifier Verify session refresh fix.
@scribe Document session expiry bug resolution.
```

## Tips for Effective Debugging

1. **Start with symptoms, not assumptions**
   - Don't jump to conclusions
   - Let the evidence guide you

2. **Form multiple hypotheses**
   - Don't fixate on one theory
   - Test the most likely first

3. **Be systematic**
   - Test one thing at a time
   - Record all findings

4. **Consider the environment**
   - What's different between working/failing cases?
   - Check configs, data, timing

5. **Look for recent changes**
   - `git log` for recent commits
   - Check deploy history

6. **Reproduce before fixing**
   - Can you reliably reproduce?
   - Write a failing test first

## Common Root Causes

| Category | Examples |
|----------|----------|
| **Concurrency** | Race conditions, deadlocks, thread safety |
| **Data** | Null values, invalid state, encoding issues |
| **Timing** | Timeouts, clock skew, order of operations |
| **Configuration** | Environment differences, missing settings |
| **Dependencies** | API changes, version mismatches |
| **Resources** | Memory leaks, connection pools, file handles |
