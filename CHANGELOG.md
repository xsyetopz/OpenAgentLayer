# Changelog

All notable changes to OpenAgentLayer (OAL) are documented here.

This changelog starts at OAL v1. Earlier repository history is reference
material only and is not part of the OAL release line.

## [0.8.0-beta.4] - 2026-05-14

### Added

- Added default setup installation for the curated top-10 officialskills.sh essentials.
- Added officialskills.sh essentials for GitHub CI fixes, PR comments, automation, web testing, security review, Sentry workflows, and MCP building.
- Added tree-style interactive CLI menu categories for Start, Inspect, Artifacts, Extend, and Manage.
- Added prompt-time Codex subagent reminders that explicitly trigger bounded native subagents and sidecars.

### Changed

- Changed officialskills.sh catalog loading to wait for completion by default instead of aborting after five seconds.
- Changed the curated officialskills.sh install commands and docs to prefer `bunx`.
- Changed the Codex `UserPromptSubmit` reminder to stay compact while naming `spawn`, `subagents`, and `sidecars`.
- Changed interactive CLI menu data into a small tree model shared by source and tests.
- Updated release metadata from `0.8.0-beta.3` to `0.8.0-beta.4`.

### Verified

- `bun test packages/cli/__tests__/cli.test.ts`
- `bun test packages/cli/__tests__/cli.test.ts packages/toolchain/__tests__/toolchain.test.ts`
- `bun test packages/runtime/__tests__/runtime.test.ts packages/adapter/__tests__/adapter.test.ts`
- `bunx biome check packages/cli/src/interactive.ts packages/cli/src/interactive-menu.ts packages/cli/__tests__/cli.test.ts`
- `bun run oal:accept`

## [0.8.0-beta.2] - 2026-05-14

### Added

- Added officialskills.sh category parsing and tabbed install browsing for the interactive OAL CLI.
- Added full fetched official skill catalog support, including `--category` filtering and `--install all` for fetched catalogs.
- Added cached officialskills.sh catalogue loading for the interactive skills hub.

### Changed

- Reworked the interactive CLI command hub around task-oriented Start, Inspect, Artifacts, Extend, and Manage sections.
- Changed the skills hub to show live loading status, fall back cleanly, and execute selected install/remove commands after confirmation.
- Renamed OAL-owned skill and route identifiers to self-documenting action/domain names for slash-command surfaces.
- Updated agent, route, acceptance, and provider contracts to use the renamed OAL skill surfaces.
- Updated release metadata from `0.8.0-beta.1` to `0.8.0-beta.2`.

### Verified

- `bunx biome check source/skills source/routes source/agents packages/adapter/src/claude.ts packages/source/__tests__/source.test.ts packages/adapter/__tests__/adapter.test.ts packages/accept/src packages/cli/src/interactive.ts packages/cli/src/commands/toolchain.ts packages/cli/src/main.ts packages/cli/__tests__/cli.test.ts packages/toolchain/src packages/toolchain/__tests__/toolchain.test.ts --max-diagnostics 400`
- `bun test packages/source/__tests__/source.test.ts packages/adapter/__tests__/adapter.test.ts packages/toolchain/__tests__/toolchain.test.ts packages/cli/__tests__/cli.test.ts`
- `bun run oal:accept`
- `bun test packages/cli/__tests__/cli.test.ts packages/toolchain/__tests__/toolchain.test.ts`
- `bunx biome check packages/cli/src/interactive.ts packages/cli/src/commands/toolchain.ts packages/cli/__tests__/cli.test.ts packages/toolchain/src/index.ts packages/toolchain/__tests__/toolchain.test.ts --max-diagnostics 240`

## [0.8.0-beta.1] - 2026-05-13

### Added

- Added a source-driven OpenCode hook dispatcher that maps authored OAL hook records into before/after tool execution handling.
- Added a cross-platform app skill with Flutter/Dart defaults, C# + Avalonia desktop guidance, and C# + MonoGame game guidance.
- Added rscheck-backed OpenDex linting alongside workspace and test clippy gates.
- Added compact skill-intake guidance for using external catalogs as discovery input while keeping OAL skills local and reusable.
- Added curated officialskills.sh entries as optional setup/features checkboxes for installing individual external skills.
- Added `oal features --catalog` and `--catalog-url` surfaces that render officialskills.sh catalogs and single-skill pages.
- Added source-owned agent prompt hydration through `source/prompts/agent-prompt.md`.

### Changed

- Replaced the legacy Symphony package, CLI command, submodule, and generated guidance with OpenDex surfaces.
- Consolidated overlapping command-safety hooks into `block-command-safety`.
- Strengthened session and subagent prompt guidance for exact hook-command obedience while keeping the injected prompt compact.
- Changed optional skill install/remove commands to use `bunx skills`.
- Changed provider prompt contracts to include the verbatim Zen of Python as general-purpose engineering guidance.
- Updated release metadata from `0.7.0-beta.1` to `0.8.0-beta.1`.

### Removed

- Removed legacy Symphony package sources, workspace dependency links, CLI wiring, and submodule registration.
- Removed stale and duplicate hook records for command advice, protected-branch checks, unsafe git checks, destructive commands, weak blocked status, and validation-evidence completion.
- Removed stale third-party skill and MCP surfaces for openai-skills, robertmsale, css-modern-features, anthropic-docs, and opencode-docs.

### Verified

- `rtk proxy -- bun test packages/runtime/__tests__/runtime.test.ts packages/source/__tests__/source.test.ts packages/adapter/__tests__/adapter.test.ts packages/cli/__tests__/cli.test.ts packages/deploy/__tests__/deploy.test.ts packages/toolchain/__tests__/toolchain.test.ts`
- `rtk proxy -- bun run oal:render`
- `rtk proxy -- bun run oal:accept`
- `rtk cargo test -p opendex`
- `rtk proxy -- make lint`
- `rtk cargo fmt --check`

## [0.6.0-beta.8] - 2026-05-13

### Added

- Added Codex subagent invocation guidance to rendered instructions, including explicit OAL agent names, aliases, parent/worker responsibilities, and CSV/batch subagent guidance.
- Added route aliases to rendered Codex agent `nickname_candidates` so custom agents can be invoked by OAL agent name or route.

### Changed

- Changed rendered OAL agent prompts from broad prompt contracts to compact narrow-agent contracts with explicit job, tool surface, accept/refuse boundaries, drift limits, and consequences.
- Expanded the `oal` skill as the AI-facing index for how OAL works and how agents should use OAL.
- Updated release metadata from `0.6.0-beta.7` to `0.6.0-beta.8`.

### Verified

- `rtk proxy -- bun test packages/source/__tests__/source.test.ts packages/adapter/__tests__/adapter.test.ts packages/runtime/__tests__/runtime.test.ts`
- `rtk proxy -- bunx tsc --noEmit --pretty false`
- `rtk git diff --check`

## [0.6.0-beta.3] - 2026-05-12

### Added

- Added Codex `requirements.toml` rendering for managed OAL hooks with canonical `hooks = true` feature pinning and managed hook command entries.
- Added upstream `openai/codex` as the source for Codex base instructions and an OAL patch file applying reddit-sourced instruction changes.
- Added a rendered patched Codex base-instructions artifact wired through `model_instructions_file`.
- Added `docs/codex-reddit-research.md` to record the reddit research datasets applied or deferred for this release.
- Added Codex config schema comments to generated `config.toml` and acceptance coverage.
- Added deploy output guidance for Codex `requirements.toml` admin installation.
- Added Rust workspace and lockfile version checks to release acceptance and `bump-version.sh`.
- Added release acceptance coverage for the upstream Codex submodule and base-instruction patch artifact.
- Added README and installation guidance for Codex managed `requirements.toml`.
- Added validation docs coverage for upstream Codex and base-instruction patch release checks.
- Added release acceptance coverage for the Codex reddit research disposition.
- Added provider-e2e output and validation docs that distinguish Codex hook behavior checks from external admin requirements installation.

### Changed

- Changed Codex base-instruction behavior to avoid broad tests after every implementation step, require bounded large command output, and constrain audit findings to conclusive actionable evidence.
- Changed global Codex deploy rewriting so generated requirements point managed hooks at the installed OAL hook directory.

### Verified

- Static implementation audit only; targeted validation has not yet been run in
  this session.

## [0.6.0-beta.2] - 2026-05-08

### Added

- Added subscription-plan routing for Codex, Claude Code, and OpenCode so generated agents and primary profiles select provider-native models by plan class.
- Added RTK command help checks, RTK gain report grouping, and a codebase-shape acceptance gate for oversized owners, crowded source roots, and deep source paths.
- Added context-discipline prompt contracts so rendered provider instructions and agents classify task ownership before broad repository exploration.

### Changed

- Removed deprecated Codex `codex_hooks` config output and kept hook installation owned by provider hook artifacts.
- Changed Codex statusline defaults to model, run state, git branch, task progress, context remaining, and used tokens.
- Hardened command policy against RTK-only flags on raw tools and unbounded large-codebase inventory commands such as broad `rtk find`, `rtk tree`, and recursive `rtk ls`.
- Updated Codex orchestration guidance toward OpenDex/Symphony and refreshed the tracked upstream Codex source snapshot.

### Verified

- `bun test packages/*/__tests__/*.test.ts tests/*.test.ts`
- `bun run biome:check`
- `bunx tsc --noEmit`
- `bun packages/cli/src/main.ts accept`
- `git diff --check`

## [0.6.0-beta.1] - 2026-05-07

### Added

- Added OpenDex as an OAL product surface with a Rust `opendex` workspace crate, binary entry point, split control-plane modules, usage guardrails, snapshot persistence, and daemon routes for Robdex-style project, thread, handoff, approval, process, state, replay, and orchestrator bridge workflows.
- Added OAL CLI `opendex` command wiring so Codex/OAL can run the Rust binary through the existing CLI.
- Added `opendex` as an owned installed shim next to `oal` so users get an OpenDex command on PATH from `oal bin` and packaged installs.
- Added Codex orchestration setup options for `symphony`, `multi_agent`, and `multi_agent_v2`, including v2-specific bounds and usage-hint settings from the upstream Codex schema.
- Added upstream Symphony submodule integration and Symphony/OpenDex package exports for OAL-managed orchestration.

### Changed

- Changed managed Codex defaults to prefer OpenDex/Symphony with `apps = true`, bounded depth/thread defaults, and native multi-agent modes disabled unless explicitly selected.
- Changed Codex baseline prompts to reject god objects and require module seams before broad implementation work.
- Changed release metadata from `0.5.1-beta.3` to `0.6.0-beta.1` across package, Rust workspace, plugin, Homebrew, and source product records.
- Changed acceptance inventory to treat the Rust workspace and `crates/` OpenDex sources as connected product files.

### Verified

- `rtk cargo fmt --all --check`
- `rtk cargo check --workspace --tests`
- `rtk cargo clippy --locked --workspace --tests -- -D warnings`
- `rtk cargo test --workspace`
- `rtk bunx tsc --noEmit`
- `rtk proxy -- bunx biome check . --error-on-warnings --max-diagnostics 16384`
- `rtk proxy -- bun packages/cli/src/main.ts check`
- `rtk proxy -- bun test packages/*/__tests__/*.test.ts`

## [0.5.1-beta.3] - 2026-05-07

### Added

- Added upstream `impeccable` and `design-worker` skill submodules, source records, provider-rendered skill artifacts, CI submodule guards, and design-route integration for Apollo and Aphrodite.

### Changed

- Improved interactive CLI flows by replacing manual profile removal, uninstall cleanup, and optional feature selection with selectable or checkbox prompts where the repo already has bounded choices.
- Changed optional setup apply output to stream command output in real time, show compact ASCII progress, add readable color to setup phases, and time out stuck optional install commands.
- Removed hook feedback colors while keeping plain wrapped provider messages, and narrowed secret-guard path handling so regex-scoped Gitleaks rules do not block normal YAML or skill paths without matching content.
- Changed release metadata from `0.5.1-beta.2` to `0.5.1-beta.3` across package, plugin, marketplace, Homebrew, and source product records.

### Verified

- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun test packages/runtime/__tests__/runtime.test.ts packages/source/__tests__/source.test.ts packages/adapter/__tests__/adapter.test.ts packages/cli/__tests__/cli.test.ts`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bun run oal:accept`
- `rtk proxy -- bun run test`
- `rtk git -C . diff --check`
- `rtk git -C . submodule status --recursive`

## [0.5.1-beta.2] - 2026-05-07

### Changed

- Hardened Codex command policy against hidden `codex exec` delegation and detached launcher escapes through `tmux`, `screen`, `nohup`, `setsid`, and Docker.
- Added compact Codex statusline defaults for model, task progress, context remaining, and rate-limit visibility.
- Set Codex memory extraction to `gpt-5.4-mini` while keeping profile `model_verbosity = "low"` enabled.
- Changed release metadata from `0.5.1-beta.1` to `0.5.1-beta.2` across package, plugin, marketplace, Homebrew, and source product records.

### Verified

- `rtk proxy -- bun test packages/adapter/__tests__/adapter.test.ts`
- `rtk proxy -- bun test packages/accept/__tests__/accept.test.ts`
- `rtk proxy -- bun test tests/e2e.test.ts`
- `rtk proxy -- bun run oal:accept`
- `rtk proxy -- bun run test`
- `rtk git -C . diff --check`

## [0.5.1-beta.1] - 2026-05-06

### Added

- Added the `@openagentlayer/symphony` core package with `WORKFLOW.md` loading, typed config defaults and validation, issue eligibility and concurrency helpers, workspace hook handling, retry/backoff state, and Codex app-server launch contracts based on the draft Symphony service specification.
- Added `oal deploy --dry-run --diff` so dry-run deploys can print generated artifact diffs with provider, mode, path, and source ownership.
- Added Codex instruction reload guidance backed by current `openai/codex` source inspection, separating session-loaded `AGENTS.md` guidance from reloadable skill workflows.
- Added `css-modern-features` as an upstream skill source through `third_party/css-modern-features`, source skill metadata, lockfile tracking, and CI submodule guard coverage.

### Changed

- Changed managed Codex config and OAL Codex launch/peer commands to disable `multi_agent_v2`, `multi_agent`, and `enable_fanout`, render plan-aware `agents.max_threads` and `agents.job_max_runtime_seconds` values, and route OAL guidance toward Symphony or peer-thread orchestration because native `multi_agent_v2` rejects OAL's thread throttle.
- Changed source-backed behavior contracts and OAL skill guidance to require provider docs, provider source code, or validated runtime evidence before model window, instruction reload, or skill reload claims.
- Changed release metadata from `0.5.0-beta.1` to `0.5.1-beta.1` across package, plugin, marketplace, Homebrew, and source product records.

### Verified

- `rtk proxy -- bun test packages/deploy/__tests__/deploy.test.ts packages/adapter/__tests__/adapter.test.ts`
- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bun run test`
- `rtk proxy -- bun run oal:accept`
- `rtk git -C . diff --check`
- `rtk git -C . submodule status --recursive`

## [0.1.3-beta.4] - 2026-05-03

### Added

- Added provider e2e and RTK reporting commands for real Codex/OpenCode hook verification and project command-efficiency inspection.
- Added provider docs skills and OpenCode tools for command policy, provider surface maps, and RTK reports.

### Changed

- Reworked generated prompts, route contracts, skill bodies, and hook messages around affirmative current-state behavior and explicit evidence gates.
- Removed Codex default `model_instructions_file` replacement so Codex keeps its bundled base instructions with OAL project guidance.
- Replaced upstream negative-heavy Caveman and taste skill payloads with authored OAL skill prompts and support files.
- Removed the regex-based zero-residue hook and related acceptance checks.

### Verified

- `rtk bun run biome:check`
- `rtk bunx tsc --noEmit`
- `rtk bun run test:unit`
- `rtk bun run test:e2e`
- `rtk bun run oal:accept`

## [0.1.3-beta.3] - 2026-05-03

### Changed

- Enabled Codex `multi_agent_v2` in the managed profile feature block.
- Switched generated Codex config to the `multi_agent_v2` agent surface.
- Set Codex `approvals_reviewer = "auto_review"` in generated config.

### Verified

- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run test`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bun run oal:accept`
- `rtk proxy -- ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.3-beta.2] - 2026-05-03

### Added

- Added scope-discipline prompt contracts so generated agents reject
  unrequested work, rejected-idea memorialization, and conversation-preference
  tests.
- Added `$oal` Codex plugin activation and installed-state checks for generated
  provider plugin payloads.
- Added setup smoke coverage for Codex profile activation, `$oal` plugin
  activation, and provider cache payloads.

### Changed

- Reworked generated agent prompts into role-based senior-peer prompts instead
  of generic product-branded agent prose.
- Balanced Codex profile and agent reasoning effort across Plus, Pro 5x, and
  Pro 20x plans, keeping generated reasoning between low and high.
- Removed Codex feature inline reason comments from generated config output.
- Removed stale prompt-skill language that blocked stronger prompt pressure.
- Deep-merged provider JSON config during deploy so plugin/settings updates
  preserve existing structured user config.

### Verified

- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run test`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bun run oal:accept`
- `rtk proxy -- ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.3-beta.1] - 2026-05-03

### Added


### Changed

- Removed internal model class routing from source records, validation, docs, tests, and generated provider artifacts.
- Routed provider models directly from subscription-specific plans.
- Updated Codex profile rendering for reasoning, verbosity, notice, and zsh shim keys.
- Kept current-code naming clean by removing stale product-name traces outside excluded legacy material.

### Verified

- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run test`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bun run oal:accept`
- `rtk proxy -- ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.2-beta.13] - 2026-05-03

### Added

- Added a high-level interactive workflow layer for setup, inspection, repair, removal, and advanced low-level command access.
- Added a typed setup workflow argument builder so interactive setup calls the same low-level `setup` command path as scripted usage.
- Added provider preflight output in interactive setup so missing provider binaries are shown before provider selection.

### Changed

- Reworked CLI output around concise OAL sections, details, warnings, and checkmarks while keeping `--verbose` for per-artifact internals.
- Reworked setup dry-run output to summarize provider checks, target scope, optional tools, and setup phases before deploy/plugin/check execution.
- Kept low-level deploy, plugins, features, preview, check, and uninstall commands available under the advanced interactive workflow instead of duplicating behavior.

### Verified

- `rtk proxy -- bun run test`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run oal:accept`
- `rtk proxy -- ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.2-beta.12] - 2026-05-03

### Added

- Added provider-specific model plan flags for Codex, Claude Code, and OpenCode
  so high-level setup can choose each subscription independently.
- Added interactive setup prompts for ChatGPT/Codex, Claude, and OpenCode model
  modes.
- Added Codex profile reasoning coverage for Pro 5x and Pro 20x plans.

### Changed

- Codex generated profiles now keep plan-mode and edit-mode reasoning separate:
  orchestration profiles use `gpt-5.5`, implementation profiles use
  `gpt-5.3-codex`, utility profiles use `gpt-5.4-mini`, and generated
  reasoning never uses xhigh.
- Kept low-level `--plan` as a compatibility option while making high-level
  setup use provider-specific plan flags.

### Verified

- `rtk proxy -- bun run test`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run oal:accept`

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
- Made Codex plugin sync prune stale OAL marketplace entries and best-effort
  register the local marketplace with the native Codex CLI.
- Reworked interactive entrypoints to put setup/update ahead of lower-level
  deploy/plugin primitives and include optional RTK, Context7, Playwright, and
  DeepWiki phases.

### Verified

- `rtk proxy -- bun run test`
- `rtk proxy -- bun run biome:check`
- `rtk proxy -- bunx tsc --noEmit`
- `rtk proxy -- bun run oal:accept`

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
- `rtk proxy -- bun run oal:accept`

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
- `rtk proxy -- bun run oal:accept`

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
- `rtk bun run oal:accept`
- `rtk proxy -- bun run oal:accept`
- `rtk bun run oal:rtk-gain -- --allow-empty-history`
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

- Kept Codex model plans inside OAL's allowed `gpt-5.5` intelligence,
  `gpt-5.3-codex` worker, and `gpt-5.4-mini` utility policy.
- Kept Claude model plans on `claude-opus-4-6`, `claude-opus-4-6[1m]`,
  `claude-sonnet-4-6`, and `claude-haiku-4-5`, with the 1M Opus route limited
  to the explicit long-context plan.
- Blocked forbidden OpenCode detections such as `opencode/gpt-5.4`,
  `opencode/gpt-5.2`, `opencode/gpt-5.3-codex-spark`, and
  `opencode/claude-opus-4-7` from rendered artifacts.

### Verified

- `rtk bun run test`
- `rtk bun run oal:accept`
- `rtk proxy -- bun run oal:accept`
- `rtk bun run oal:rtk-gain -- --allow-empty-history`
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
- `rtk bun run oal:accept`
- `rtk proxy -- bun run oal:accept`
- `rtk bun run oal:rtk-gain -- --allow-empty-history`
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
- `rtk bun run oal:accept`
- `rtk proxy -- bun run oal:accept`
- `rtk bun run oal:rtk-gain -- --allow-empty-history`
- `rtk bun run biome:check`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`

## [0.1.2-beta.2] - 2026-05-03

### Added

- Added OAL `elevate`, `delete`, and `parse` skills for privileged execution,
  safe deletion, and command/output parsing.

### Changed

- Made acceptance's internal RTK gain CLI check fixture-backed so fresh CI
  runner history cannot fail `bun run oal:accept`.
- Kept live `rtk-gain --allow-empty-history` strict for non-empty histories
  below the 80% threshold.

### Verified

- `rtk bun run test`
- `rtk bun run oal:accept`
- `rtk proxy -- bun run oal:accept`
- `rtk bun run oal:rtk-gain -- --allow-empty-history`
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
- `rtk bun run oal:accept`
- `rtk proxy -- bun run oal:accept`
- `rtk bun run oal:rtk-gain -- --allow-empty-history`
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
- `rtk bun run oal:accept`
- `rtk bunx biome check . --error-on-warnings --max-diagnostics 16384`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`
- `rtk bun run oal:rtk-gain -- --allow-empty-history`

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
- `rtk bun run oal:accept`
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
- Kept Codex routing limited to `gpt-5.5` intelligence roles,
  `gpt-5.3-codex` worker roles, and `gpt-5.4-mini` utility profiles.
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
- `rtk bun run oal:accept`
- `rtk bunx biome check . --error-on-warnings --max-diagnostics 16384`
- `rtk bunx tsc --noEmit`
- `rtk ruby -c homebrew/Casks/openagentlayer.rb`
