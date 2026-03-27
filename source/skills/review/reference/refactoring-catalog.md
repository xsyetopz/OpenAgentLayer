# Refactoring Catalog

Complete catalog of refactoring moves. Cardinal rule: **refactoring changes structure, never behavior.**

---

## Pre-Refactor Checklist

1. Tests pass — run the full relevant suite before starting
2. Scope defined — know exactly what changes and what doesn't
3. Commit before starting — clean rollback point
4. No behavior changes — if behavior must change, that's a separate task

---

## Moves

### Extract Function

**Smell**: A code block does one identifiable thing inside a larger function. Long functions (30+ lines). Comments labeling sections.

**When to apply**: When you need "and" to describe what a function does.

```python
# Before
def process_order(order):
    if not order.items:
        raise ValueError("Empty order")
    if order.total < 0:
        raise ValueError("Negative total")
    tax = order.total * 0.08
    order.total_with_tax = order.total + tax
    db.save(order)

# After
def validate_order(order):
    if not order.items:
        raise ValueError("Empty order")
    if order.total < 0:
        raise ValueError("Negative total")

def apply_tax(order):
    order.total_with_tax = order.total * 1.08

def process_order(order):
    validate_order(order)
    apply_tax(order)
    db.save(order)
```

---

### Extract Type / Class

**Smell**: A group of fields and functions always travel together. Data clumps. Functions in Module A that operate more on Module B's data than A's.

```typescript
// Before: loose fields scattered
function createInvoice(
  customerName: string,
  customerEmail: string,
  customerAddress: string,
  amount: number
) { ... }

// After: cohesive type
interface Customer { name: string; email: string; address: string; }

function createInvoice(customer: Customer, amount: number) { ... }
```

---

### Inline Function

**Smell**: A function's body is as clear as its name. A function is called exactly once and the indirection adds no value.

```go
// Before: indirection adds nothing
func isPositive(n int) bool { return n > 0 }

for _, v := range values {
    if isPositive(v) { ... }
}

// After: inline it
for _, v := range values {
    if v > 0 { ... }
}
```

**Do not inline** when: the function is tested independently, is called from multiple places, or the name genuinely communicates intent better than the code.

---

### Rename

**Smell**: Name doesn't communicate what it does. Generic names (data, result, temp, handle, manager). Name reflects implementation, not intent.

```rust
// Before
fn proc(d: &[u8]) -> Vec<Token> { ... }

// After
fn tokenize(source: &[u8]) -> Vec<Token> { ... }
```

Rename type, function, and variable together when they refer to the same concept.

---

### Move Function / Type

**Smell**: A function uses data from another module more than its own. A type is defined where it's created, not where it's used.

```go
// Before: UserFormatter in utils package, operates only on User
package utils
func FormatUser(u domain.User) string { ... }

// After: move to domain package — it belongs with User
package domain
func (u User) String() string { ... }
```

---

### Introduce Parameter Object

**Smell**: Long parameter list (4+). Same group of parameters always appears together across multiple functions.

```typescript
// Before
function createReport(
  title: string,
  startDate: Date,
  endDate: Date,
  includeCharts: boolean,
  format: 'pdf' | 'csv'
) { ... }

// After
interface ReportOptions {
  title: string;
  dateRange: { start: Date; end: Date };
  includeCharts: boolean;
  format: 'pdf' | 'csv';
}

function createReport(options: ReportOptions) { ... }
```

---

### Replace Conditional with Polymorphism

**Smell**: Switch/match on a type tag drives different behavior in 3+ branches. Adding a new type requires editing the switch everywhere.

```python
# Before: switch on type string
def serialize(shape):
    if shape.type == 'circle':
        return {'r': shape.radius}
    elif shape.type == 'rect':
        return {'w': shape.width, 'h': shape.height}
    elif shape.type == 'triangle':
        ...

# After: polymorphism
class Circle:
    def serialize(self): return {'r': self.radius}

class Rect:
    def serialize(self): return {'w': self.width, 'h': self.height}

def serialize(shape): return shape.serialize()
```

**When NOT to apply**: two branches that won't grow. Simple data-switching (e.g., mapping status codes to messages) — a table is simpler.

---

### Replace Nested Conditional with Guard Clauses

**Smell**: Deep nesting (3+ levels). Arrow-shaped code where the happy path is buried.

```go
// Before
func processUser(u *User) error {
    if u != nil {
        if u.IsActive {
            if u.HasPermission("write") {
                return saveUser(u)
            }
        }
    }
    return nil
}

// After: fail fast, happy path last
func processUser(u *User) error {
    if u == nil { return nil }
    if !u.IsActive { return nil }
    if !u.HasPermission("write") { return ErrForbidden }
    return saveUser(u)
}
```

---

### Split Module

**Smell**: Module has multiple reasons to change (SRP violation). Imports create unexpected coupling between unrelated areas.

```
Before:
  services/user.ts  ← 600 lines: auth + profile + notifications

After:
  services/auth.ts        ← session management, login/logout
  services/profile.ts     ← user data CRUD
  services/notifications.ts ← email/push dispatch
```

---

## Code Smells → Refactoring Map

| Smell                                                      | Refactoring                           |
| ---------------------------------------------------------- | ------------------------------------- |
| Long function (30+ lines)                                  | Extract Function                      |
| Long parameter list (4+)                                   | Introduce Parameter Object            |
| Duplicate code                                             | Extract Function or Extract Type      |
| Feature envy (uses another object's data more than own)    | Move Function                         |
| Data clump (same fields always together)                   | Extract Type                          |
| Switch on type (3+ branches)                               | Replace Conditional with Polymorphism |
| Deep nesting                                               | Guard Clauses + Extract Function      |
| Dead code                                                  | Delete                                |
| Comments explaining "what"                                 | Rename + Extract Function             |
| Divergent change (one class changes for many reasons)      | Split Module                          |
| Shotgun surgery (one change requires edits in many places) | Move + consolidate                    |
| Speculative generality (unused abstractions)               | Inline + simplify                     |
