---
description: Test writing rules
globs: "**/*{test,tests,spec,_test}*"
---

# Test Rules

## Naming
- `test_{feature}_{scenario}_{expected_result}`
- Example: `test_validate_email_missing_at_sign_returns_error`
- Group related tests in describe/mod blocks by feature

## Structure (Arrange-Act-Assert)
- **Arrange**: Set up test data and dependencies
- **Act**: Call the function under test (one action per test)
- **Assert**: Verify the result (one logical assertion per test)

## Coverage Requirements
- Happy path: normal inputs produce expected output
- Error cases: invalid inputs produce appropriate errors
- Edge cases: empty inputs, boundaries, zero values, max values
- Do NOT test: private internals, external dependencies, other modules

## Prohibited in Tests
- Tests that depend on execution order
- Tests that share mutable state
- Tests that call external services (mock them)
- Tests that sleep/wait for time-based conditions (use test clocks)
- Duplicate test logic — extract to fixtures/helpers
- Testing implementation details (only test public behavior)

## Test Helpers
- Extract repeated setup into factory functions: `fn make_test_user() -> User`
- Use builder patterns for complex test fixtures
- Keep helpers close to the tests that use them (same file or test utils module)
