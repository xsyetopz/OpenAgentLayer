# Dedupe Report Example

## Findings
- `RTK install command` repeated in toolchain, setup, and runtime hooks.
- `Codex config schema comment` repeated in adapter, accept gates, and tests.

## Canonical Owners
- `packages/source/src/constants.ts`: shared command/schema/path constants.
- `packages/source/src/patterns.ts`: shared regex split/token patterns.

## Refactor Actions
- Imported canonical constants in all consumers.
- Removed duplicated local literals.
- Updated tests to reference shared constants.

## Validation
- `bunx biome check <touched files>`
- `bun test <targeted suites>`
