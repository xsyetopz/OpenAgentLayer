# Error Propagation

Adding context when passing errors up the call stack. Use when: you can't handle the error here, but the current scope has useful context.

---

## Rust -- anyhow

```rust
use anyhow::{Context, Result, bail};

fn load_config(path: &Path) -> Result<Config> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("reading {}", path.display()))?;
    let config: Config = toml::from_str(&content)
        .context("parsing config TOML")?;
    if config.port == 0 {
        bail!("config.port must be positive");
    }
    Ok(config)
}
```

- `?` propagates and converts to `anyhow::Error`
- `.context("msg")` adds a string layer; `.with_context(|| ...)` for lazy formatting
- `bail!("msg")` = `return Err(anyhow!("msg"))`
- Use `anyhow` for binaries; `thiserror` for libraries (see `result-errors.md`)

---

## Go -- fmt.Errorf wrapping

```go
func processOrder(id string) error {
    order, err := db.LoadOrder(id)
    if err != nil {
        return fmt.Errorf("load order %q: %w", id, err)
    }
    if err := payments.Charge(order); err != nil {
        return fmt.Errorf("charge order %q: %w", id, err)
    }
    return nil
}
```

- `%w` preserves the wrapped error for `errors.Is`/`errors.As` unwrapping
- Add context only where it adds information -- avoid repeating the same message
- At the top-level boundary: log with `%v`, return generic message to caller

---

## Python -- raise from

```python
def load_config(path: str) -> Config:
    try:
        with open(path) as f:
            data = json.load(f)
    except FileNotFoundError as e:
        raise ConfigError(f"config file not found: {path}") from e
    except json.JSONDecodeError as e:
        raise ConfigError(f"invalid JSON in {path}: {e}") from e
    return Config(**data)
```

- `raise X from Y` -- preserves cause in `__cause__`, shown in traceback
- `raise X from None` -- suppresses original when it's implementation detail
- Log at the top-level boundary (API handler / CLI main), not at every call site

---

## TypeScript -- rethrow with context

```typescript
async function loadUserOrders(userId: string): Promise<Order[]> {
  try {
    return await db.orders.findByUser(userId);
  } catch (e) {
    throw new DatabaseError(`loading orders for user ${userId}`, { cause: e });
  }
}
```

```typescript
class DatabaseError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message);
    if (options?.cause) this.cause = options.cause;
  }
}
```

- Re-throw at each meaningful boundary -- don't let raw DB/network errors reach API layer
- `{ cause: e }` preserves original for logging
- Never `catch (e) {}` -- always log, wrap, or rethrow
