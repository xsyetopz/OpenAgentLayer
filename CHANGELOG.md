# Changelog

All notable changes to OpenAgentLayer (OAL) are documented here.

This changelog starts at OAL v1. Earlier repository history is reference
material only and is not part of the OAL release line.

## [0.1.1-beta.4] - 2026-05-03

### Added

- Added an acceptance gate that runs `rtk gain` and requires token savings at
  or above 80% before release.
- Added fixture tests for RTK gain parsing, threshold acceptance, below-threshold
  rejection, malformed output, and command failure.

### Changed

- Updated CI quality and dry-run jobs to install RTK and run supported validation
  commands through `rtk proxy` before acceptance.
- Updated toolchain guidance to state that RTK gain drops below 80% require
  command/output efficiency work.

### Verified

- `rtk bun run test`
- `rtk bun run accept`
- `rtk bunx biome check . --error-on-warnings --max-diagnostics 16384`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.1-beta.3] - 2026-05-02

### Added

- Added generated artifact preview support so users can inspect exact provider
  output without writing files.
- Added Markdown structure, emphasis, directive, and attribution standards for
  authored `.md` files and generated prompt/skill/command artifacts.
- Added source-backed skill support resources for architecture, debugging,
  design, documentation, plain-language writing, implementation, planning,
  prompting, review, security, testing, tracing, and OAL surface checks.
- Added the shared simplicity discipline reference with the Terry A. Davis quote
  for architecture, implementation, and review skills.
- Added executable RTK command enforcement through a universal `.mjs` hook.

### Changed

- Renamed and reshaped skills around short action names such as `debug`,
  `document`, `implement`, `plan`, `prompt`, `secure`, and `test`.
- Reworked generated skill bodies to load reusable source files instead of
  hard-coded large template strings.
- Strengthened source-backed behavior prompts so agents block on missing evidence
  instead of guessing, scaffolding, or approximating behavior.
- Switched Claude model routing to `claude-opus-4-6`,
  `claude-opus-4-6[1m]`, `claude-sonnet-4-6`, and `claude-haiku-4-5`.
- Kept Codex routing limited to `gpt-5.5`, `gpt-5.4-mini`, and
  `gpt-5.3-codex`.
- Updated CI/CD and Homebrew release checks so guarded release paths run only
  after quality gates and dry-run deployment checks.

### Removed

- Removed obsolete skill names such as `implementation`, `documentation`,
  `planning`, `prompting`, `security`, `testing`, and `rtk_safety` from active
  OAL source.
- Removed RTK as a user-facing skill because RTK command policy is enforced by
  runtime hooks.
- Removed stale RTK/non-RTK hook names in favor of `enforce_rtk_commands`.
- Removed blocked model names from active model policy.

### Verified

- `rtk bun run test`
- `rtk bun run accept`
- `rtk bunx biome check . --error-on-warnings --max-diagnostics 16384`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`
