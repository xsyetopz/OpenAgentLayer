# Exception Hierarchies

Typed, matchable exceptions for Python and TypeScript. Use when: expected failures need named types, callers catch by type.

---

## Python

```python
class AppError(Exception):
    """Base -- catch this to catch all application errors."""

class ValidationError(AppError):
    def __init__(self, field: str, message: str) -> None:
        self.field = field
        super().__init__(f"{field}: {message}")

class NotFoundError(AppError):
    def __init__(self, entity: str, id: str) -> None:
        self.entity = entity
        super().__init__(f"{entity} not found: {id}")

class ConflictError(AppError):
    def __init__(self, entity: str, key: str) -> None:
        super().__init__(f"{entity} already exists: {key}")
```

```python
try:
    user = service.get_user(user_id)
except NotFoundError as e:
    return {"error": str(e)}, 404
except ValidationError as e:
    return {"field": e.field, "error": str(e)}, 400
```

Rules:

- Never bare `except:` -- catches `SystemExit`/`KeyboardInterrupt`
- `except Exception` only at top-level boundaries (API handlers, CLI main)
- Chain: `raise NewError("context") from original` to preserve cause

---

## TypeScript

```typescript
class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;  // required for instanceof across bundles
  }
}

class NotFoundError extends AppError {
  constructor(public readonly entity: string, public readonly id: string) {
    super(`${entity} not found: ${id}`);
  }
}

class ValidationError extends AppError {
  constructor(public readonly field: string, message: string) {
    super(`${field}: ${message}`);
  }
}
```

```typescript
try {
  await userService.getById(id);
} catch (e) {
  if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
  if (e instanceof ValidationError) return res.status(400).json({ field: e.field });
  throw e;
}
```

Rules:

- Never `catch (e) {}` -- always log or rethrow
- Set `this.name` in constructor -- `instanceof` breaks across module boundaries without it
- Narrow with `instanceof` before accessing typed fields
