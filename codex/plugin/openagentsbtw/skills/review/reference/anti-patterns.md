# Anti-Pattern Catalog

Language-specific anti-patterns with before/after examples. Check in priority order during reviews.

---

## 1. Scope Creep

Changes beyond what was requested. Finishing what WAS requested is not scope creep.

```diff
- // Requested: fix null check in getUserById
- // Added: refactored the entire UserService, renamed methods, added caching
+ // Requested: fix null check in getUserById
+ // Changed: one null check, nothing else
```

---

## 2. Behavior Changes in Refactors

Logic differences in restructured code.

```python
# Before (correct)
def discount(price, rate):
    return price * (1 - rate)

# After refactor (broken — order changed)
def discount(rate, price):     # param order swapped — silent bug
    return price * (1 - rate)
```

Detection: diff the logic path, not just the structure.

---

## 3. Placeholders

Stub implementations that reach production.

| Language   | Patterns to grep                                                             |
| ---------- | ---------------------------------------------------------------------------- |
| Rust       | `todo!(..)`, `unimplemented!(..)`, panic with stub message                   | <!-- cca-allow --> |
| TypeScript | `throw new Error("not implemented")`, `return null as any`                   |
| Python     | bare `...` as function body, `pass` with stub comment, `NotImplementedError` |
| Go         | `panic("not implemented")`, sentinel stub errors                             |

---

## 4. DRY Violations

Duplicated knowledge (not just similar-looking code).

```typescript
// Violation: same validation rule in 3 places
// UserService.ts
if (email.length > 255 || !email.includes('@')) throw new Error('invalid');
// AuthService.ts
if (email.length > 255 || !email.includes('@')) return false;
// ProfileService.ts
if (email.length > 255 || !email.includes('@')) reject(email);

// Fix: one source of truth
// validators.ts
export const isValidEmail = (email: string) =>
  email.length <= 255 && email.includes('@');
```

---

## 5. Over-Commenting

Comments that narrate what the code already says.

```python
# BAD
# Loop through users
for user in users:
    # Check if user is active
    if user.is_active:
        # Add to result list
        result.append(user)

# GOOD — no comments needed; code is self-explanatory
for user in users:
    if user.is_active:
        result.append(user)
```

Internal comments are for non-obvious "why", never "what".

---

## 6. SRP Violations

Multiple reasons to change in one module.

```go
// Violation: user creation + email sending in one service
type UserService struct { db DB; smtp SMTP }

func (s *UserService) Register(email string) error {
    user := s.db.Create(email)          // reason 1: persistence
    s.smtp.SendWelcome(user.Email)       // reason 2: notifications
    return nil
}

// Fix: separate services, compose at the use-case layer
type UserService struct { db DB }
type NotificationService struct { smtp SMTP }
```

---

## 7. Over-Engineering

Abstractions used once, premature generalization.

```typescript
// Over-engineered for one use case
interface DataProcessor<T, R> {
  process(input: T, options: ProcessorOptions<T>): Promise<Result<R>>;
}
class UserDataProcessor implements DataProcessor<RawUser, User> { ... }

// When you have exactly one processor and no planned variants:
async function processUser(raw: RawUser): Promise<User> { ... }
```

Rule: generalize when the second real use case appears, not before.

---

## 8. Bad Naming

Generic names that communicate nothing about domain.

| Banned          | Domain alternative                                |
| --------------- | ------------------------------------------------- |
| `data`          | `userData`, `orderPayload`, `configEntry`         |
| `result`        | `parsedConfig`, `createdUser`, `matchedItems`     |
| `temp`          | `partialOrder`, `bufferedChunks`                  |
| `handle`        | `processPayment`, `routeRequest`, `dispatchEvent` |
| `manager`       | `SessionStore`, `ConnectionPool`, `TaskQueue`     |
| `helper`        | specific function describing what it does         |
| `item`          | `lineItem`, `cartEntry`, `menuOption`             |
| `val` / `value` | `tokenCount`, `retryDelay`, `userId`              |

Rust/Go: also avoid `s` for string, `n`/`i` outside loop counters.

---

## 9. Large Functions

Functions over ~30 lines doing multiple things.

```rust
// 60-line god function
fn handle_request(req: Request) -> Response {
    // validate
    // parse
    // query db
    // transform
    // serialize
    // return
}

// Extract each responsibility
fn handle_request(req: Request) -> Response {
    let params = parse_request(&req)?;
    let record = load_from_db(&params)?;
    let view = transform_to_view(record);
    serialize_response(view)
}
```

---

## 10. Missing Error Handling

Errors silently dropped or panicked.

```rust
// Bad
let config = std::fs::read_to_string("config.toml").unwrap();

// Bad
let _ = db.execute(query);

// Good
let config = std::fs::read_to_string("config.toml")
    .context("failed to read config.toml")?;
```

```typescript
// Bad: swallowed catch
try { await risky(); } catch {}

// Good
try { await risky(); } catch (e) { log.error('risky failed', e); throw e; }
```

```go
// Bad
rows, _ := db.Query(query)

// Good
rows, err := db.Query(query)
if err != nil {
    return fmt.Errorf("querying users: %w", err)
}
```

---

## 11. Ultimatum Decisions

Presenting one approach as the only option for non-trivial decisions.

Flag when: the problem has obvious trade-offs, the approach is costly to reverse, or another developer would reasonably choose differently. Route to `/cca:decide` for the options protocol.

---

## 12. Lint Suppression

Silencing warnings instead of fixing root causes.

```rust
// Bad: suppressing without explanation
#[allow(unused_variables)]
let result = expensive_computation();

// OK: verified false positive with explanation
#[allow(clippy::too_many_arguments)]  // config struct is deliberately explicit
fn create_component(a: &str, b: &str, c: u32, d: bool, e: u32, f: &str) {}
```

Acceptable only for verified false positives with an explanatory comment.

---

## Language-Specific Additions

### TypeScript

- `as any` to silence type errors — fix the type instead
- `// @ts-ignore` without explanation
- Non-null assertion `!` without guard (`user!.email` when user can be null)
- Returning `undefined` from async function implicitly

### Python

- Bare `except:` — catches SystemExit and KeyboardInterrupt
- Mutable default arguments: `def fn(items=[])` — shared across calls
- `import *` from non-stdlib modules — pollutes namespace

### Go

- Ignoring errors with blank identifier: `val, _ := fn()`
- Not checking `rows.Err()` after iterating sql.Rows
- Goroutines without context cancellation or done channel

### Rust

- `.clone()` everywhere to avoid borrow checker — signals design issue
- `String` parameters when `&str` would do
- Returning `Box<dyn Error>` from library code — use typed errors
