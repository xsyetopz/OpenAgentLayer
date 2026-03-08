---
description: TypeScript-specific coding rules
globs: "**/*.{ts,tsx}"
---

# TypeScript Rules

## Type Safety
- No `any` without documented justification
- No non-null assertions (`!`) without documented justification
- Prefer `unknown` over `any` when type is genuinely unknown
- Use discriminated unions over type assertions
- Strict null checks: handle `null`/`undefined` explicitly

## Naming
- camelCase: functions, variables, parameters
- PascalCase: types, interfaces, classes, enums, React components
- SCREAMING_SNAKE: constants
- No `I` prefix on interfaces: `Serializable` not `ISerializable`
- File names match primary export: `UserService.ts` for `class UserService`

## Patterns
- `async`/`await` over raw Promise chains
- Destructuring for accessing object properties
- `const` by default, `let` only when reassignment is needed, never `var`
- Template literals over string concatenation
- Optional chaining (`?.`) over nested null checks

## Error Handling
- Typed error classes extending `Error`
- No swallowed catches: `catch (e) { }` — always handle or rethrow
- Result pattern (`{ ok: true, data } | { ok: false, error }`) for expected failures
- `try/catch` for unexpected failures only

## Imports
- No circular imports
- No unused imports
- Named exports over default exports (better refactoring support)
- Group: external deps, then internal, then relative
