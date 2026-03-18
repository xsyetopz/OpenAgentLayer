---
description: >
  Error handling patterns, Result types, exception strategies, and error recovery.
  Triggers: error handling, Result type, exception, error recovery, error propagation,
  unwrap, panic, try-catch, error boundary, error types, anyhow, thiserror.
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

## Language-Specific Patterns

### Rust

```rust
// Library errors: thiserror for typed, matchable errors
#[derive(Debug, thiserror::Error)]
pub enum ParseError {
    #[error("invalid token at position {position}: {token}")]
    InvalidToken { position: usize, token: String },

    #[error("unexpected end of input")]
    UnexpectedEof,

    #[error(transparent)]
    Io(#[from] std::io::Error),
}

// Application errors: anyhow for context-rich propagation
fn load_config(path: &Path) -> anyhow::Result<Config> {
    let content = std::fs::read_to_string(path)
        .context("failed to read config file")?;
    let config: Config = toml::from_str(&content)
        .context("failed to parse config")?;
    Ok(config)
}
```

- No `unwrap()` or `expect()` outside tests
- Use `?` for propagation, `match` for recovery
- `#[must_use]` on functions returning `Result`

### TypeScript

```typescript
// Typed error classes
class NotFoundError extends Error {
  constructor(public readonly entity: string, public readonly id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

// Result pattern for expected failures
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parseConfig(raw: string): Result<Config, ParseError> {
  try {
    const parsed = JSON.parse(raw);
    return { ok: true, value: validated(parsed) };
  } catch (e) {
    return { ok: false, error: new ParseError(e.message) };
  }
}
```

- No swallowed catches: `catch (e) { }` - always handle or rethrow
- `try/catch` for unexpected failures only
- Result pattern for expected failures (validation, parsing, lookups)

### Python

```python
class AppError(Exception):
    """Base for application errors."""

class ValidationError(AppError):
    def __init__(self, field: str, message: str):
        self.field = field
        super().__init__(f"{field}: {message}")
```

- Specific exceptions over generic `Exception`
- `except Exception` only at top-level boundaries
- Never `except:` (bare except) - it catches SystemExit and KeyboardInterrupt

### Go

```go
var ErrNotFound = errors.New("not found")
var ErrConflict = errors.New("conflict")

func LoadUser(id string) (*User, error) {
    row := db.QueryRow("SELECT ...", id)
    var user User
    if err := row.Scan(&user.Name); err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, fmt.Errorf("user %s: %w", id, ErrNotFound)
        }
        return nil, fmt.Errorf("loading user %s: %w", id, err)
    }
    return &user, nil
}
```

- Always check returned errors - never `_ = fn()`
- Wrap with `fmt.Errorf("context: %w", err)` for stack context
- Use `errors.Is` and `errors.As` for matching

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
