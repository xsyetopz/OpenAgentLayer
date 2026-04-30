# Result / Error-as-Value

Errors returned as values, not thrown. Use when: caller must handle both cases; no exceptions.

---

## Rust -- thiserror + Result

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("invalid token at {position}: {token}")]
    InvalidToken { position: usize, token: String },
    #[error("unexpected end of input")]
    UnexpectedEof,
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

fn parse_file(path: &Path) -> Result<Ast, ParseError> { ... }
```

```rust
match parse_file(path) {
    Ok(ast) => process(ast),
    Err(ParseError::InvalidToken { position, token }) => eprintln!("syntax error at {position}"),
    Err(e) => return Err(e),
}
```

Rules:

- `thiserror` for libraries (typed, matchable). `anyhow` for binaries (see `propagation.md`).
- No `unwrap()`/`expect()` outside tests
- `#[must_use]` on `Result`-returning functions

---

## Go -- (T, error) returns

```go
var (
    ErrNotFound  = errors.New("not found")
    ErrForbidden = errors.New("forbidden")
)

func LoadUser(id string) (*User, error) {
    row := db.QueryRow("SELECT id, name FROM users WHERE id = ?", id)
    if err := row.Scan(&user.ID, &user.Name); err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, fmt.Errorf("user %q: %w", id, ErrNotFound)
        }
        return nil, fmt.Errorf("scan: %w", err)
    }
    return &user, nil
}
```

```go
if errors.Is(err, ErrNotFound) { ... }   // sentinel match

// Structured error for field inspection
type ValidationError struct{ Field, Message string }
func (e *ValidationError) Error() string { return e.Field + ": " + e.Message }

var ve *ValidationError
if errors.As(err, &ve) { ... }           // type match
```

Rules:

- Always check returned errors -- never `val, _ = fn()`
- `errors.Is` for sentinels, `errors.As` for structured types
- Check `rows.Err()` after iterating `sql.Rows`
- Error strings: lowercase, no trailing punctuation

---

## TypeScript -- explicit Result type

Use when you want to force callers to handle both cases at the type level (no try/catch).

```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

const ok  = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

function parseConfig(raw: string): Result<Config, ParseError> {
  try {
    return ok(configSchema.parse(JSON.parse(raw)));
  } catch (e) {
    return err(new ParseError(String(e)));
  }
}

const result = parseConfig(input);
if (!result.ok) { process.exit(1); }
use(result.value);  // TypeScript narrows to Config
```

Use `try/catch` when: interop with libraries that throw, unexpected errors.
Use Result when: expected failures where the caller must explicitly handle both branches.
