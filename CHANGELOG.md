# Changelog

All notable changes to OpenAgentLayer (OAL) are documented here.

This changelog starts at OAL v1. Earlier repository history is reference
material only and is not part of the OAL release line.

## [0.1.2-beta.2] - 2026-05-03

### Added

- Added OAL `elevate`, `delete`, and `parse` skills for privileged execution,
  safe deletion, and command/output parsing.

### Changed

- Made acceptance's internal RTK gain CLI check fixture-backed so fresh CI
  runner history cannot fail `bun run accept`.
- Kept live `rtk-gain --allow-empty-history` strict for non-empty histories
  below the 80% threshold.

### Verified

- `rtk bun run test`
- `rtk bun run accept`
- `rtk proxy -- bun run accept`
- `rtk bun run rtk-gain -- --allow-empty-history`
- `rtk bun run biome:check`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.2-beta.1] - 2026-05-03

### Added

- Added `rtk-gain --from-file` so CI/e2e can validate RTK gain behavior from
  deterministic fixture output instead of live runner history.
- Added Codex `shell_zsh_fork` rendering with OAL-managed zsh and RTK command
  shims under `.codex/openagentlayer/shim`.
- Added lightweight zero-dependency privileged exec runtime helpers for Codex,
  Claude Code, and OpenCode.
- Added quoted hex colors to generated Codex, Claude Code, and OpenCode agent
  artifacts.
- Added `@opencode-ai/plugin` 1.14.33 and native OpenCode plugin/tool imports
  for generated OpenCode artifacts.

### Changed

- Kept live RTK gain available for release checks while removing live RTK
  history from the e2e test path.
- Rendered privileged execution as opt-in executable `.mjs` artifacts with argv
  allowlists, cwd bounds, timeout limits, dry-run fixtures, and audit logging.

### Verified

- `rtk bun run test`
- `rtk bun run accept`
- `rtk proxy -- bun run accept`
- `rtk bun run rtk-gain -- --allow-empty-history`
- `rtk bun run biome:check`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.1-beta.5] - 2026-05-03

### Added

- Added a dedicated `rtk-gain` CLI check for enforcing RTK token savings outside
  full product acceptance.
- Added empty-history handling so fresh CI runners do not fail product acceptance
  before RTK has usable command history.

### Changed

- Kept RTK gain policy fixture-backed in acceptance while moving live machine
  history checks to the dedicated RTK gain command.
- Updated CI to run `rtk-gain --allow-empty-history` after acceptance.

### Verified

- `rtk bun run test`
- `rtk bun run accept`
- `rtk bunx biome check . --error-on-warnings --max-diagnostics 16384`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`
- `rtk bun run rtk-gain -- --allow-empty-history`

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
