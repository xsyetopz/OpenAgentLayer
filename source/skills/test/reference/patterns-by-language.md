# Test Patterns by Language

Framework-specific patterns for Go, TypeScript/Vitest, Python/pytest, and Rust.

---

## Go

### Naming and Structure

```go
func TestUserService_Create_ValidEmail(t *testing.T) {
    t.Parallel()
    repo := &mockUserRepo{}
    svc := NewUserService(repo)

    user, err := svc.Create(context.Background(), "test@example.com")

    require.NoError(t, err)
    assert.Equal(t, "test@example.com", user.Email)
}
```

- `t.Parallel()` on all independent tests
- `require` (stops test on failure) vs `assert` (continues) -- use `require` for preconditions
- Testify: `github.com/stretchr/testify/require` + `assert`

### Table-Driven Tests

```go
func TestValidateEmail(t *testing.T) {
    cases := []struct {
        name  string
        input string
        valid bool
    }{
        {"valid address", "user@example.com", true},
        {"missing at sign", "userexample.com", false},
        {"empty string", "", false},
        {"local only", "user@", false},
    }
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()
            assert.Equal(t, tc.valid, validateEmail(tc.input))
        })
    }
}
```

### Mocks and Interfaces

```go
// Define interface for dependency
type UserRepo interface {
    FindByID(ctx context.Context, id string) (*User, error)
    Save(ctx context.Context, user *User) error
}

// Manual mock -- clear, no magic
type mockUserRepo struct {
    users map[string]*User
    err   error
}

func (m *mockUserRepo) FindByID(_ context.Context, id string) (*User, error) {
    return m.users[id], m.err
}
```

For complex mocks with many methods, use `github.com/stretchr/testify/mock`.

### Test Helpers

```go
func makeTestUser(t *testing.T, overrides ...func(*User)) *User {
    t.Helper()
    u := &User{ID: "test-1", Email: "test@example.com", Role: "member"}
    for _, o := range overrides { o(u) }
    return u
}

// Usage
admin := makeTestUser(t, func(u *User) { u.Role = "admin" })
```

---

## TypeScript -- Vitest

### Naming and Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('UserService', () => {
  describe('create', () => {
    it('returns user with valid email', async () => {
      const repo = { save: vi.fn().mockResolvedValue({ id: '1' }) };
      const service = new UserService(repo as any);

      const user = await service.create({ email: 'test@example.com' });

      expect(user.email).toBe('test@example.com');
      expect(repo.save).toHaveBeenCalledOnce();
    });

    it('throws on duplicate email', async () => {
      const repo = { save: vi.fn().mockRejectedValue(new ConflictError()) };
      const service = new UserService(repo as any);

      await expect(service.create({ email: 'dupe@example.com' }))
        .rejects.toThrow(ConflictError);
    });
  });
});
```

### Mocking

```typescript
// Mock module
vi.mock('../db', () => ({ db: { query: vi.fn() } }));

// Spy on method
const spy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

// Reset between tests
beforeEach(() => vi.clearAllMocks());
```

Prefer `vi.fn()` over `jest.fn()` -- same API, native to Vitest.

### Factory Functions

```typescript
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-id',
    email: 'test@example.com',
    role: 'member',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: { authorization: 'Bearer test-token' },
    body: {},
    params: {},
    ...overrides,
  } as Request;
}
```

### Testing Async and Time

```typescript
import { vi } from 'vitest';

// Fake timers
vi.useFakeTimers();
vi.setSystemTime(new Date('2024-06-01'));

// Advance time
vi.advanceTimersByTime(5000);

// Restore
vi.useRealTimers();
```

---

## Python -- pytest

### Naming and Structure

```python
def test_validate_email_missing_at_sign_returns_false():
    assert not validate_email("userexample.com")


def test_create_user_duplicate_email_raises_conflict():
    repo = MockUserRepo(raises=ConflictError())
    service = UserService(repo)

    with pytest.raises(ConflictError):
        service.create("existing@example.com")
```

### Fixtures

```python
import pytest

@pytest.fixture
def user_repo():
    return MockUserRepo()

@pytest.fixture
def user_service(user_repo):
    return UserService(user_repo)

@pytest.fixture
def sample_user():
    return User(id="test-1", email="test@example.com", role="member")

def test_service_creates_user(user_service, sample_user):
    result = user_service.save(sample_user)
    assert result.id == "test-1"
```

### Parametrize

```python
@pytest.mark.parametrize("email,valid", [
    ("user@example.com", True),
    ("userexample.com", False),
    ("", False),
    ("@example.com", False),
])
def test_validate_email(email, valid):
    assert validate_email(email) == valid
```

### Mocking

```python
from unittest.mock import MagicMock, patch, AsyncMock

# Inject mock dependency
def test_sends_welcome_email():
    mailer = MagicMock()
    service = UserService(mailer=mailer)
    service.register("new@example.com")
    mailer.send.assert_called_once_with("new@example.com", subject="Welcome")

# Patch module-level dependency
@patch("myapp.services.user.send_email")
def test_register_sends_email(mock_send):
    register("new@example.com")
    mock_send.assert_called_once()

# Async mocks
repo = AsyncMock()
repo.find_by_id.return_value = sample_user
```

---

## Rust

### Naming and Structure

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_email_missing_at_returns_err() {
        let result = validate_email("userexample.com");
        assert!(result.is_err());
    }

    #[test]
    fn create_user_valid_email_returns_user() {
        let repo = MockUserRepo::new();
        let service = UserService::new(repo);

        let user = service.create("test@example.com").unwrap();

        assert_eq!(user.email, "test@example.com");
    }
}
```

### Integration Tests

```
src/
  lib.rs
tests/
  user_integration_test.rs   ← integration tests in tests/ dir
```

```rust
// tests/user_integration_test.rs
use mylib::UserService;

#[test]
fn create_and_retrieve_user() {
    let db = TestDb::new();
    let service = UserService::new(db.conn());
    let user = service.create("test@example.com").unwrap();
    let found = service.find(user.id).unwrap();
    assert_eq!(found.email, "test@example.com");
}
```

### Async Tests

```rust
#[tokio::test]
async fn fetch_user_returns_data() {
    let client = MockHttpClient::new();
    let service = UserService::new(client);
    let user = service.fetch("user-1").await.unwrap();
    assert_eq!(user.id, "user-1");
}
```

### Test Helpers

```rust
fn make_test_user(email: &str) -> User {
    User {
        id: uuid::Uuid::new_v4().to_string(),
        email: email.to_string(),
        role: Role::Member,
        created_at: chrono::Utc::now(),
    }
}
```

Use `rstest` crate for parametrized tests:

```rust
use rstest::rstest;

#[rstest]
#[case("user@example.com", true)]
#[case("userexample.com", false)]
#[case("", false)]
fn test_validate_email(#[case] email: &str, #[case] expected: bool) {
    assert_eq!(validate_email(email), expected);
}
```
