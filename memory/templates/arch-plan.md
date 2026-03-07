# Architecture: {Feature Name}

**Status:** draft | approved | superseded
**Author:** architect
**Created:** {DATE}
**Updated:** {DATE}

## Overview

{2-3 sentence summary of what this feature does and why it's needed}

## Requirements

### Functional
- [ ] {Requirement 1}
- [ ] {Requirement 2}

### Non-Functional
- [ ] Performance: {constraint}
- [ ] Security: {constraint}

## Module Design

### Location
`src/{feature}/`

### File Structure
```
{feature}/
├── mod.rs          # Public exports only
├── types.rs        # Domain types, no logic
├── service.rs      # Business logic
├── repository.rs   # Data access (if needed)
└── tests/
    └── mod.rs      # Feature-local tests
```

### Public Interface

```rust
// Types
pub struct {MainType} {
    // fields
}

// Traits (if needed)
pub trait {MainTrait} {
    fn method(&self) -> Result<Output, Error>;
}

// Functions
pub fn {main_function}(args: Args) -> Result<Output, Error>;
```

### Internal Components

| Component | Responsibility |
|-----------|----------------|
| `types.rs` | {what it contains} |
| `service.rs` | {what it does} |

## Dependencies

### This Module Depends On
| Module | What We Use |
|--------|-------------|
| `common::errors` | Error types |
| `auth::Session` | User context |

### Modules That Will Use This
| Module | How They'll Use It |
|--------|-------------------|
| `api::routes` | HTTP handlers |

## Implementation Tasks

Ordered list for implementer to follow:

1. [ ] Create `types.rs` with domain types
2. [ ] Implement core logic in `service.rs`
3. [ ] Add trait implementations
4. [ ] Wire exports in `mod.rs`
5. [ ] Write unit tests
6. [ ] Integration with dependent modules

## Data Flow

```
Input -> Validation -> Processing -> Storage -> Response
         |                |
         v                v
      Error            Events
```

## Error Handling

| Error Case | Error Type | Recovery |
|------------|------------|----------|
| {case} | `{ErrorType}` | {how to handle} |

## DRY/SRP Analysis

| Potential Issue | Resolution |
|-----------------|------------|
| Duplicates X from module Y | Extract to common or reuse |
| Multiple responsibilities | Split into sub-modules |

## Security Considerations

- [ ] Input validation
- [ ] Authorization checks
- [ ] Sensitive data handling

## Testing Strategy

| Test Type | Coverage Target | Priority |
|-----------|-----------------|----------|
| Unit | Core logic | High |
| Integration | API endpoints | Medium |
| E2E | Critical flows | Low |

## Open Questions

- [ ] {Question that needs clarification}

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| {Option B} | {list} | {list} | {reason} |

## Migration Plan (if applicable)

1. {Step 1}
2. {Step 2}
3. {Step 3}

---

## Approval

- [ ] Reviewed by: {reviewer}
- [ ] Approved on: {date}
