# Changelog

All notable changes to OpenAgentLayer (OAL) are documented here.

This changelog starts at OAL v1. Earlier repository history is reference
material only and is not part of the OAL release line.

## [0.1.2-beta.12] - 2026-05-03

### Added

- Added provider-specific model plan flags for Codex, Claude Code, and OpenCode
  so high-level setup can choose each subscription independently.
- Added interactive setup prompts for ChatGPT/Codex, Claude, and OpenCode model
  modes.
- Added Codex profile reasoning coverage for Pro 5x and Pro 20x plans.

### Changed

- Codex generated profiles now set `model_reasoning_effort` from the selected
  Codex subscription plan: Pro 5x uses medium lead/high code, and Pro 20x uses
  high lead/high code with medium utility.
- Kept low-level `--plan` as a compatibility option while making high-level
  setup use provider-specific plan flags.

### Verified

- `rtk proxy -- bun run test`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run accept`

## [0.1.2-beta.11] - 2026-05-03

### Added

- Added `oal setup` as the guided setup/update workflow that plans optional
  tools, deploys provider artifacts, syncs plugins, installs the `oal` shim,
  and runs checks.
- Added `check --installed` validation for installed provider state, including
  Codex agent TOML schema guards.
- Added setup dry-run and Codex agent schema coverage to CLI and acceptance
  tests.

### Changed

- Removed unsupported Codex `color` fields from generated Codex agent config and
  agent role TOML while preserving Claude Code and OpenCode agent colors.
- Made Codex plugin sync prune stale OAL/openagentsbtw marketplace entries and
  best-effort register the local marketplace with the native Codex CLI.
- Reworked interactive entrypoints to put setup/update ahead of lower-level
  deploy/plugin primitives and include optional RTK, Context7, Playwright, and
  DeepWiki phases.

### Verified

- `rtk proxy -- bun run test`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run accept`

## [0.1.2-beta.10] - 2026-05-03

### Added

- Added installed-flow smoke acceptance that deploys into disposable global and
  project roots, installs the `oal` shim, runs the installed CLI, previews
  Codex config, deploys all providers, and uninstalls owned Codex artifacts.
- Added configurable Caveman output mode through source config, CLI flags, and
  interactive deploy/plugin prompts.
- Added CI installed CLI smoke coverage after dry-run rendering.

### Changed

- Rendered provider instructions now describe the active Caveman mode instead of
  relying on hardcoded runtime prose.
- Plugin sync now uses human output by default with `--verbose`, `--quiet`, and
  `--json` modes.
- Codex generated config keeps `agents.interrupt_message` as a boolean so Codex
  can load `config.toml`.

### Verified

- `rtk proxy -- bun run test`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run accept`

## [0.1.2-beta.9] - 2026-05-03

### Added

- Added concise human output for `check` plus `check --verbose` internals for
  source root, rendered providers, artifact count, and unsupported capability
  count.
- Added CLI coverage for clean `help`, `--help`, missing required option, and
  unknown command exits without Commander/Bun stack traces.

### Changed

- Made Commander exits terminate cleanly instead of rethrowing expected CLI
  help/error paths.
- Made interactive mode session-oriented by looping back to the workflow picker
  after each completed action.

### Verified

- `rtk proxy -- bun run test`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run accept`

## [0.1.2-beta.6] - 2026-05-03

### Added

- Added global provider-home deploy and uninstall for Claude Code, Codex, and
  OpenCode.
- Added Commander-backed CLI command parsing plus Clack interactive prompts for
  preview, deploy, plugin sync, uninstall, and source checks.

### Changed

- Kept provider plugin sync separate from global deploy so plugin caches and
  active provider config remain distinct operations.
- Added global manifests under `.openagentlayer/manifest/global/` so uninstall
  removes only OAL-owned global files.

### Verified

- `rtk bun run test`
- `rtk bun run accept`
- `rtk proxy -- bun run accept`
- `rtk bun run rtk-gain -- --allow-empty-history`
- `rtk bun run biome:check`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.2-beta.5] - 2026-05-03

### Added

- Added subscription-aware model plans for Codex, Claude Code, and OpenCode
  generated agents.
- Added Greek-agent model classes so OAL routes architects, orchestrators,
  reviewers, implementers, explorers, validators, maintainers, specialists, and
  taste agents independently.
- Added OpenCode model detection through `opencode models`, with authenticated
  model selection when allowed models are available and free-model fallback
  routing otherwise.

### Changed

- Kept Codex model plans inside OAL's allowed `gpt-5.5`, `gpt-5.4-mini`, and
  `gpt-5.3-codex` policy.
- Kept Claude model plans on `claude-opus-4-6`, `claude-opus-4-6[1m]`,
  `claude-sonnet-4-6`, and `claude-haiku-4-5`, with the 1M Opus route limited
  to the explicit long-context plan.
- Blocked forbidden OpenCode detections such as `opencode/gpt-5.4`,
  `opencode/gpt-5.2`, `opencode/gpt-5.3-codex-spark`, and
  `opencode/claude-opus-4-7` from rendered artifacts.

### Verified

- `rtk bun run test`
- `rtk bun run accept`
- `rtk proxy -- bun run accept`
- `rtk bun run rtk-gain -- --allow-empty-history`
- `rtk bun run biome:check`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.2-beta.4] - 2026-05-03

### Added

- Added Bun rewrite enforcement for replaceable `npm`, `npx`, `pnpm`, and
  `yarn` package-manager commands.
- Added Codex package-manager shims that route replaceable Node.js package
  commands through `bun` or `bunx` under RTK.

### Changed

- Added Bun to OAL toolchain bootstrap plans so Bun-backed generated shims have
  the required runtime.
- Replaced OAL-owned toolchain package-exec guidance with `bunx` where Bun has
  a direct equivalent.
- Kept Deno commands separate from Bun rewrites.

### Verified

- `rtk bun run test`
- `rtk bun run accept`
- `rtk proxy -- bun run accept`
- `rtk bun run rtk-gain -- --allow-empty-history`
- `rtk bun run biome:check`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.2-beta.3] - 2026-05-03

### Changed

- Made the CI RTK gain policy step fixture-backed so runner-local RTK history
  cannot produce false release failures.
- Kept the `rtk-gain` command strict for explicit live checks outside CI.

### Verified

- `rtk bun run test`
- `rtk bun run accept`
- `rtk proxy -- bun run accept`
- `rtk bun run rtk-gain -- --allow-empty-history`
- `rtk bun run biome:check`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`

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
