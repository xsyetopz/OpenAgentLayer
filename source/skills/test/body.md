# Test Patterns

## Test Naming

`test_{feature}_{scenario}_{expected_result}`

```text
test_validate_email_missing_at_sign_returns_error
test_create_user_duplicate_email_raises_conflict
test_parse_config_empty_file_uses_defaults
```

## Structure: Arrange-Act-Assert

Every test follows this structure:

```python
def test_transfer_insufficient_funds_returns_error():
    # Arrange
    account = Account(balance=100)

    # Act
    result = account.transfer(amount=150)

    # Assert
    assert result.is_err()
    assert result.error == InsufficientFunds
    assert account.balance == 100  # unchanged
```

One action per test. One logical assertion per test (multiple asserts on the same result are fine).

## Coverage Requirements

| Category    | What to test                               | Priority                 |
| ----------- | ------------------------------------------ | ------------------------ |
| Happy path  | Normal inputs produce expected output      | Required                 |
| Error cases | Invalid inputs produce appropriate errors  | Required                 |
| Edge cases  | Empty inputs, boundaries, zero, max values | Required                 |
| Integration | Component interactions, API contracts      | When components interact |

Do NOT test:

- Private internals - only test public behavior
- External dependencies - mock them
- Other modules - test at the boundary
- Implementation details - tests should survive refactors

## Test Isolation

- Tests must not depend on execution order
- Tests must not share mutable state
- Tests must not call external services - mock them
- Tests must not sleep or wait for time - use test clocks
- Each test sets up its own state and tears it down

## Mocking Strategy

| When to mock                                      | When NOT to mock         |
| ------------------------------------------------- | ------------------------ |
| External services (APIs, databases, file systems) | Pure functions           |
| Non-deterministic behavior (time, randomness)     | Internal modules you own |
| Slow dependencies (network, disk)                 | Simple value objects     |
| Dependencies with side effects (email, payments)  | Data transformations     |

Mock at the boundary, not deep inside the call chain.

## Test Helpers

Extract repeated setup into factory functions:

```python
def make_test_user(name="Test User", role="member"):
    return User(name=name, email=f"{name.lower().replace(' ', '.')}@test.com", role=role)
```

Use builder patterns for complex fixtures:

```python
order = OrderBuilder().with_items(3).with_discount(0.1).shipped().build()
```

Keep helpers close to the tests that use them.

## TDD Workflow

For test-driven development with the agent system, see `reference/tdd-workflow.md` -- red/green/refactor cycle, orchestrator rules, state tracking.

## Language-Specific Patterns

See `reference/patterns-by-language.md` for Go, TypeScript/Vitest, Python/pytest, and Rust -- naming conventions, table-driven tests, factory functions, mocks, async patterns.

## Anti-Patterns

| Anti-Pattern           | Problem                   | Fix                          |
| ---------------------- | ------------------------- | ---------------------------- |
| Testing implementation | Breaks on refactor        | Test behavior, not internals |
| Giant test methods     | Hard to diagnose failures | One assertion per test       |
| No assertions          | Test always passes        | Assert the expected outcome  |
| Duplicate test logic   | Maintenance burden        | Extract to fixtures/helpers  |
