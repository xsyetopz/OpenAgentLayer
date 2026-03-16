---
name: review-code
description: >
  Enforces coding standards, design principles, naming conventions, and anti-patterns
  when writing, editing, or reviewing code. The single source of truth for code quality rules.
  Triggers: implement, write code, add function, create module, refactor, edit code, fix bug,
  review code, check quality, review PR, validate implementation, code review, restructure,
  extract, rename, move, simplify, decompose, clean up code, reduce complexity, split module.
user-invocable: true
---

# Coding Standards

Apply these standards to all code you write, modify, or review.

## Design Principles

**SRP** - One *reason to change* per module. `Token` + `TokenKind` + `TokenSpan` in one file is fine (all change together). `UserService` that creates users AND sends emails is not (two reasons to change - extract `EmailService`).

**DRY** - Single source of truth for *knowledge*. If the same magic number, validation rule, or error message appears in 2+ places, extract it. Similar-looking code with different domain meaning is NOT a violation.

**KISS** - Simplest solution for current requirements. No traits used once, no factory patterns for 2 variants, no caching without profiling evidence. Generalize when the second use case appears.

## Naming Rules

| Element   | Convention                                        | Anti-Examples                |
| --------- | ------------------------------------------------- | ---------------------------- |
| Variables | Descriptive nouns: `user_count`, `auth_token`     | `n`, `data`, `temp`          |
| Booleans  | `is_`/`has_`/`can_`: `is_valid`, `has_permission` | `valid`, `flag`              |
| Functions | Verb phrases: `calculate_total`, `validate_email` | `process`, `handle`          |
| Types     | Noun phrases: `TokenStream`, `UserRepository`     | `TokenHelper`, `UserManager` |
| Constants | SCREAMING_SNAKE: `MAX_RETRY_COUNT`                | `maxRetries`                 |

**Banned names** (always replace with domain-specific alternatives): `data`, `result`, `temp`, `info`, `handle`, `process`, `manager`, `helper`, `util`, `item`, `value`, `obj`.

## Function Design

- One responsibility per function - if you need "and" to describe it, split it
- Max 30 lines (excluding tests), max 3 parameters
- No magic numbers/strings - extract to named constants
- Early returns and guard clauses over deep nesting

## Comments Policy

- Self-documenting code over comments - if code needs a comment, rewrite the code
- Public API doc comments required
- Internal comments: ONLY for non-obvious "why"
- Forbidden: file headers, section separators, authorship, "what" comments

## Anti-Pattern Checklist

Check in this order during reviews:

1. **Scope creep** - changes beyond what was requested (but finishing what WAS requested is not scope creep)
2. **Behavior changes in refactors** - logic differences in restructured code
3. **Placeholders** - `todo!()`, `// TODO`, "for now...", stub implementations
4. **DRY violations** - duplicated constants, validation, error messages
5. **Over-commenting** - headers, separators, docstrings on unchanged code
6. **SRP violations** - modules with multiple reasons to change
7. **Over-engineering** - abstractions used once, premature generalization
8. **Bad naming** - generic names from the banned list above
9. **Large functions** - 30+ lines without extraction
10. **Missing error handling** - `unwrap()` in prod, swallowed errors
11. **Ultimatum decisions** - presenting a single approach as the only option for medium/high-stakes decisions without alternatives

## Language-Specific

**Rust:** No `unwrap()`/`expect()` outside tests. Error types implement `std::error::Error`. No `clone()` without justification.

**TypeScript:** No `any` without justification. Async/await over raw promises. No unused imports.

**Go:** Errors checked, not discarded. Context as first parameter. No goroutine leaks.

## Review Output Format

```markdown
## Review Summary
**Verdict:** PASS | PASS_WITH_NOTES | NEEDS_CHANGES

| #   | Severity | File:Line | Issue | Fix |
| --- | -------- | --------- | ----- | --- |
```

## Do NOT

- Add features, refactors, or improvements beyond what was asked
- Add comments to code you didn't write or change
- Create abstractions for single-use cases
- Remove code without asking; leave placeholder/stub implementations
- Use "for now...", "in a real implementation...", "simplified..."
- Use TODO/FIXME unless explicitly requested
- Add dependencies without justification
- Refactor during a bug fix; change behavior during a refactoring
- Skip error handling or use `unwrap()` in non-test code
- Assume an API/file/function exists without verifying via LSP/grep

## Refactoring

Cardinal rule: refactoring changes structure, never behavior.

### Pre-Refactor Checklist

1. **Tests pass** - run the full relevant test suite before starting
2. **Scope defined** - know exactly what you're changing and what you're not
3. **No behavior changes** - if you need to change behavior, that's a separate task
4. **Commit before starting** - create a clean rollback point

### Refactoring Catalog

**Extract Function** - when a code block does one identifiable thing within a larger function.

```python
# Before
def process_order(order):
    if not order.items:
        raise ValueError("Empty order")
    if order.total < 0:
        raise ValueError("Negative total")
    # ... 20 more lines of processing

# After
def validate_order(order):
    if not order.items:
        raise ValueError("Empty order")
    if order.total < 0:
        raise ValueError("Negative total")

def process_order(order):
    validate_order(order)
    # ... processing
```

**Extract Type/Class** - when a group of fields and functions operate on the same data.

**Inline Function** - when a function body is as clear as its name, or it's called once.

**Rename** - when a name doesn't communicate what it does. Use the naming rules above.

**Move** - when a function/type is in the wrong module - it's used more by another module than its current home.

**Replace Conditional with Polymorphism** - when a switch/match on type drives different behavior in 3+ branches.

**Simplify Conditional** - when nested conditions can be flattened with guard clauses or early returns.

```python
# Before
def get_rate(user):
    if user.is_premium:
        if user.years > 5:
            return 0.05
        else:
            return 0.1
    else:
        return 0.15

# After
def get_rate(user):
    if not user.is_premium:
        return 0.15
    if user.years > 5:
        return 0.05
    return 0.1
```

### Safe Refactoring Process

1. **Identify** - what specific smell are you fixing?
2. **Test** - verify tests pass before changing anything
3. **Small steps** - one transformation at a time, test between each
4. **Verify** - tests pass after each step
5. **Review** - diff should show structural changes only, no behavior changes

### When NOT to Refactor

- During a bug fix - fix the bug first, refactor separately
- Without tests - add tests first, then refactor
- For hypothetical future requirements - refactor for current needs only
- Code you don't understand - investigate first, refactor after understanding
- Near a release - stability over cleanliness

### Code Smells -> Refactoring Map

| Smell                                                                | Refactoring                           |
| -------------------------------------------------------------------- | ------------------------------------- |
| Long function (30+ lines)                                            | Extract Function                      |
| Long parameter list (4+)                                             | Introduce Parameter Object            |
| Duplicate code                                                       | Extract Function or Extract Type      |
| Feature envy (function uses another object's data more than its own) | Move Function                         |
| Data clump (same fields always appear together)                      | Extract Type                          |
| Switch on type                                                       | Replace Conditional with Polymorphism |
| Deep nesting                                                         | Guard clauses, Extract Function       |
| Dead code                                                            | Delete it                             |
| Comments explaining "what"                                           | Rename, Extract Function              |

## Collaboration Protocol

For any non-trivial design decision during implementation or review, see `/ca:decide` for the full protocol.
