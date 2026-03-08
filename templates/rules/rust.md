---
description: Rust-specific coding rules
globs: "**/*.rs"
---

# Rust Rules

## Error Handling
- No `unwrap()` or `expect()` outside of tests
- Use `?` for propagation, `match` for recovery
- Feature-specific error enums implementing `std::error::Error`
- `#[must_use]` on functions returning `Result` or important values
- `thiserror` for library errors, `anyhow` for application errors

## Ownership
- No unnecessary `clone()` — justify each one
- Prefer borrowing over ownership when the function doesn't need to own
- Use `Cow<'_, str>` when ownership is conditional

## Naming
- snake_case: functions, variables, modules
- PascalCase: types, traits, enums
- SCREAMING_SNAKE: constants, statics
- Modules match file names exactly

## Structure
- Types at top, then `impl` blocks, then trait impls, then private helpers
- Tests in sibling files: `foo.rs` → `foo/tests.rs` via `#[cfg(test)] mod tests;`
- Public exports in `mod.rs` — re-export, don't define
- One primary type per file (with closely related types)

## Idioms
- `impl From<X> for Y` over standalone conversion functions
- Builder pattern for types with 3+ optional fields
- `Default` trait for types with sensible defaults
- Iterator chains over manual loops when clearer
- `#[derive(...)]` for standard traits (Debug, Clone, PartialEq)
