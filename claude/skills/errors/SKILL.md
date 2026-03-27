---
description: >
  Error handling patterns, Result types, exception strategies, and error recovery. Triggers: error handling, Result type, exception, error recovery, error propagation, unwrap, panic, try-catch, error boundary, error types, anyhow, thiserror.
user-invocable: true
---
# Error Handling

## Core Principle

**Handle errors at the boundary where you have enough context to do something useful. Propagate everywhere else.**

## Error Handling Decision Tree

```text
Is this error expected (invalid input, not found, timeout)?
├─ Yes -> Return a typed error (Result, Error type)
│   ├─ Can the caller recover? -> Return error, let caller decide
│   └─ Is this a boundary (API, CLI, UI)? -> Format user-facing message
└─ No (bug, invariant violation) -> Panic/throw/crash
    └─ Log everything, crash cleanly
```

## Language Reference

| Pattern | Languages | Reference |
|---------|-----------|-----------|
| Exception hierarchies | Python, TypeScript | `reference/exceptions.md` |
| Result / error-as-value | Rust, Go, TypeScript (optional) | `reference/result-errors.md` |
| Propagation with context | Rust, Go, Python, TypeScript | `reference/propagation.md` |

## Anti-Patterns

| Anti-Pattern                 | Problem                     | Fix                       |
| ---------------------------- | --------------------------- | ------------------------- |
| Swallowed exceptions         | Bugs hidden silently        | Log or propagate          |
| String-only errors           | Can't match on error type   | Use typed errors          |
| Catch-all at every level     | Over-handling, lost context | Handle at boundaries      |
| Error codes as magic numbers | Unreadable, unmaintainable  | Use named constants/enums |

## Error Messages

Good error messages include:

1. **What** went wrong (the immediate failure)
2. **Where** it happened (file, function, input)
3. **Why** it matters (what operation was interrupted)
4. **How** to fix it (when possible)

```text
Bad:  "Error: invalid input"
Good: "Failed to parse config at line 42: expected integer for 'port', got 'abc'"
```

See `/cca:review` for language-specific anti-patterns (no unwrap in prod, no any, etc.).
