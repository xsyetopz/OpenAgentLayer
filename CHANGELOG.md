# Changelog

All notable changes to openagentsbtw are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [1.2.9] - 2026-04-11

### Added

- Claude: added route-contract metadata generation plus `SubagentStart` route-context injection for openagentsbtw agents.
- Claude: added route-aware stop-gate tests covering `edit-required`, `execution-required`, and strict `BLOCKED:` behavior.
- OpenCode: added native route classification, task-tool subagent tracking, compaction context injection, and final-response completion gating through documented plugin hooks.

### Changed

- Claude: default continuity now stays native via persisted hook context, transcript resume, and memory; `/cca:handoff` is explicit export-only.
- Claude: `Stop` and `SubagentStop` now reject explanation-only completions, docs-only churn on implementation routes, and prototype/demo scaffolding.
- OpenCode: native `plan`, `explore`, and `general` agents now remain enabled by default; openagentsbtw roles are additive and continuity is native-first via `--continue`, `/sessions`, `/compact`, and `task_id`.
- OpenCode: runtime dependency alignment moved `@opencode-ai/plugin` onto the upstream `1.4.3` line while keeping the openagentsbtw OpenCode package on the shared `1.2.9` framework release.
- Shared guardrails: tightened affect-discipline rules so user frustration cannot downgrade effort or push agents into tutorial/prototype fallbacks.
- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `1.2.9`.

## [1.2.8] - 2026-04-09

### Added

- Installer/config: added shared subscription preset policy for ChatGPT/Codex (`go`, `plus`, `pro-5`, `pro-20`), Claude (`plus`, `pro-5`, `pro-20`), and Copilot (`pro`, `pro-plus`).
- Config: added in-place plan switching via `./config.sh --claude-plan`, `--codex-plan`, and `--copilot-plan`.

### Changed

- Codex: main, implementation, utility, accept-edits, and longrun routing is now plan-aware, with `gpt-5.3-codex-spark` reserved for Pro plans only.
- Claude: replaced the public `5x` / `20x` wording with `plus` / `pro-5` / `pro-20`, while keeping legacy aliases for install compatibility.
- Copilot/OpenCode: added heavier `pro-plus` defaults and routed OpenCode’s Copilot-backed installs through the shared preset layer.
- Docs: refreshed install, config, and model-strategy docs around the new preset matrix and swarm policy.

## [1.2.7] - 2026-04-09

### Added

- Docs: shared cross-platform surfaces are now documented explicitly: `ctx7` CLI, RTK enforcement, Playwright CLI, and explicit DeepWiki routing.
- Docs: RTK enforcement activation contract (`rtk` installed + `RTK.md` present) is documented across install, Codex hook notes, OpenCode notes, and Codex porting docs.
- Docs: post-install `./config.sh` operations are documented for `ctx7`, DeepWiki, and RTK toggles.

### Changed

- Installer: `install.sh` and `config.sh` now act as thin compatibility wrappers over Node CLIs under `scripts/install/`.
- Installer: managed config merges and Codex config/hook updates now live in reusable Node modules instead of inline shell/Python blocks.
- OpenCode: removed the remaining deprecated repo-managed MCP path; only the supported shared surfaces remain.
- Release: aligned Claude, Codex, and OpenCode version surfaces to the same release number.
- Docs: replaced stale `rtk init` references with the shared `rtk rewrite`-driven enforcement model and the canonical global policy file at `~/.config/openagentsbtw/RTK.md`.
- Docs: install docs now describe the thin-wrapper installer/config CLIs plus the generator/build split to avoid monolithic "god script" drift.

## [1.2.5] - 2026-04-09

### Fixed

- Codex: wrappers no longer prepend `$openagentsbtw`, avoiding prompt/context concatenation artifacts when hooks inject git/memory context.

### Added

- Codex: `plan-fast`, `implement-fast`, and `review-fast` wrapper modes (Fast mode enabled per-run).
- Codex: `swarm` wrapper mode (explicit subagent spawning by default).
- Codex guidance: prompt contracts, reasoning-activation scaffolding, and explicit anti–god-object rules.
- Codex guidance: swarm-by-default instruction in `AGENTS.md` (Codex only spawns subagents when explicitly asked).

### Changed

- Ignore `docs/reddit-*` by default (local research corpuses stay untracked).

## [1.2.3] - 2026-04-09

### Fixed

- Codex: stop emitting `$openagentsbtw` from the `UserPromptSubmit` hook (hooks inject context; they do not reliably run skills). Always-on routing now comes from the managed `AGENTS.md` guidance.

### Changed

- Codex docs now describe the hook behavior as git/memory context injection (not skill invocation).

## [1.2.2] - 2026-04-08

### Fixed

- `install.sh` no longer crashes under `set -u` when the OpenCode overrides array is empty (Bash treats `${arr[@]}` as “unbound” under nounset when the array has no elements).

## [1.2.1] - 2026-04-08

### Fixed

- `install.sh` no longer crashes under `set -u` when OpenCode model overrides are unset / declared-but-unassigned.
- `install.sh` now re-execs itself under Bash when invoked from another shell (e.g. `zsh install.sh`), avoiding subtle array + nounset incompatibilities.

### Changed

- GitHub Actions workflows now install a compatible Node.js version before running `bun run check:generated` / `bun run test`, and remove references to deleted legacy template hook files.

## [1.2.0] - 2026-04-08

### Added

- Optional Playwright CLI support:
  - `./install.sh --playwright-cli` installs `@playwright/cli` (or uses a package-runner fallback) and can run `playwright-cli install --skills` for project-scoped installs.

### Changed

- Version `1.2.0` is now aligned across the Claude plugin, Codex plugin, and OpenCode package.
- JS tooling preference order is now: `bun`/`bunx` → `pnpm`/`yarn` → `npm`/`npx`, with an automatic bun install attempt when none are present.
- Codex sample config and managed guidance are aligned to the `gpt-5.2` / `gpt-5.3-codex` / `gpt-5.3-codex-spark` split (no managed `gpt-5.4` routing).

### Removed

- Chrome DevTools MCP and Browser MCP installer support (flags, config edits, and docs). Reinstalling now also removes the legacy openagentsbtw-managed MCP blocks where applicable.

## [1.1.10] - 2026-04-04

### Changed

- Version `1.1.10` is now aligned across the Claude plugin, Codex plugin, and OpenCode package.
- Codex model presets and routing:
  - `openagentsbtw-pro` now defaults to `gpt-5.2` for the main high-reasoning route.
  - `openagentsbtw-plus` stays on `gpt-5.3-codex` for implementation-heavy code work.
  - `openagentsbtw-codex-mini` now uses `gpt-5.3-codex-spark` for the lightweight route.
  - the stable `openagentsbtw` profile is pinned to `gpt-5.2` instead of mirroring the selected tier.
- Codex install defaults now prefer the `pro` preset when no `--codex-tier` is supplied.
- Managed Codex guidance and research docs now describe the `gpt-5.2` / `gpt-5.3-codex` / `gpt-5.3-codex-spark` split and remove full `gpt-5.4` from managed routing.

## [1.1.9] - 2026-04-02

### Added

- Codex completion check now supports `cca-allow` suppression when scanning for placeholders/hedges.
- Codex hook library tests for placeholder/hedge behavior.

### Changed

- Version `1.1.9` is now aligned across the Claude plugin, Codex plugin, and OpenCode package.
- Codex model presets and routing:
  - `openagentsbtw-plus` defaults to `gpt-5.3-codex` as the daily driver.
  - `openagentsbtw-pro` defaults to `gpt-5.4` for the flagship route.
  - `openagentsbtw-codex-mini` is a lightweight profile (low reasoning/verbosity) without requiring a "mini" model.
- Codex completion check is now focused on unfinished-work signals:
  - hard placeholders block only for non-prose files
  - hedges (e.g. "for now", "for simplicity") are warnings

### Fixed

- Codex completion check no longer blocks on broad "AI prose" / "sycophancy" keyword lists in normal technical writing.

## [1.1.8] - 2026-04-02

### Fixed

- Codex hooks and wrappers are silent on routine success paths; only warnings/errors surface output.

## [1.1.7] - 2026-04-01

### Fixed

- Codex wrappers auto-attach the openagentsbtw plugin (no manual `$openagentsbtw` invocation needed when using `oabtw-codex` / `openagentsbtw-codex`).
- Codex install enables the plugin in `~/.codex/config.toml` unless the user already defines the plugin table.

## [1.1.5] - 2026-03-31

### Fixed

- Codex config `commit_attribution` now follows the documented top-level schema (and the installer avoids duplicating it when users already define it).
- Chrome DevTools MCP / Browser MCP configs now use `bunx` instead of `npx` in installer-managed entries.
- RTK install output no longer claims init succeeded when `rtk init` fails.

## [1.1.4] - 2026-03-31

### Added

- Optional installer-managed MCP servers for Claude, Codex, and OpenCode:
  - Chrome DevTools MCP (`chrome-devtools-mcp@latest`)
  - Browser MCP (`@browsermcp/mcp@latest`, requires installing the extension and connecting a tab)

### Changed

- Codex install now runs `rtk init -g --codex` before merging `~/.codex/hooks.json` so RTK routing doesn't clobber openagentsbtw hook config.

## [1.1.3] - 2026-03-29

### Added

- Shared research skills across Claude, Codex, and OpenCode:
  - `explore` for repo mapping and architecture reading
  - `trace` for dependency, call-flow, and impact tracing
  - `debug` for evidence-first failure investigation without implementation drift
- New Codex research routes:
  - `openagentsbtw-codex explore`
  - `openagentsbtw-codex trace`
  - `openagentsbtw-codex debug`
- New OpenCode research commands:
  - `openagents-explore`
  - `openagents-trace`
  - `openagents-debug`
- Optional DeepWiki-assisted Codex exploration flow for public GitHub repositories

### Changed

- Codex defaults now follow a 5.2-first routing policy for day-to-day work:
  - `gpt-5.2` for planning and review-oriented paths
  - `gpt-5.2-codex` for implementation paths
  - `gpt-5.4` kept only for the explicit higher-tier planning/orchestration path
- Claude plugin metadata now reflects the expanded 14-skill surface
- Codex-related tests were moved out of `claude/tests` into repo-level and Codex-specific test locations
- The shared Node test runner now executes:
  - repo-level generated artifact tests
  - Claude harness tests
  - Codex harness tests

### Removed

- OpenCode compatibility aliases `openagents-deps` and `openagents-explain`

## [0.4.0] - 2026-03-17

### Added

- **8/8 hook lifecycle events** covered: UserPromptSubmit, PostToolUseFailure, SessionEnd, Notification, PermissionRequest
- **Anti-rationalization Stop hook** prevents Claude from rationalizing incomplete work
- **JSON audit logging** via `CCA_HOOK_LOG_DIR` env var (all hooks write JSONL)
- **CI/CD pipeline**: GitHub Actions for shellcheck, jsonlint, node:test, install validation, plugin build
- **Test suite**: 65 tests covering all hook scripts, shared patterns, and install validation
- **SECURITY.md**: vulnerability reporting, security model, sandboxing recommendations
- **CONTRIBUTING.md**: development workflow, commit conventions, contribution guides
- **GitHub issue/PR templates**: bug reports, feature requests, agent submissions
- **Makefile**: lint, format, test, validate, build, clean targets
- **package.json**: node:test configuration
- **.editorconfig**: consistent formatting across editors
- **Hook runner** (`_run.sh`): universal hook invocation script
- **Retry loop detection** (post-failure.mjs): warns after 3 consecutive failures to same tool

### Changed

- **Agent quality overhaul**: all 7 agents rewritten with sharper prompts
  - Added `color` field to all agents for UI distinction
  - Added `Anti-Patterns (DO NOT)` sections to all agents
  - Added pre/post checklists (@athena pre-planning, @hephaestus self-check, @nemesis review categories)
  - Fixed effort levels: @hephaestus medium->high, @nemesis medium->high, @hermes medium->high, @atalanta low->medium, @calliope low->medium
  - Improved descriptions with trigger conditions ("Use proactively when...")
  - @atalanta: added "When No Tests Exist" guidance
  - @odysseus: added delegation strategy, error recovery, and parallel vs sequential guidance
- **Hermes constraint injection bug fixed**: was using `**SHARED_CONSTRAINTS**` instead of `__SHARED_CONSTRAINTS__`
- **Shared constraints expanded**: added "Before Writing Code" and "Verification" sections
- **plugin.json**: added `agents`, `commands` fields; bumped version to 0.4.0
- **Settings template**: added git force-push, git reset --hard, shell config, and gnupg deny rules
- **.gitignore**: trimmed from 300+ lines of boilerplate to ~30 relevant entries
- **Node.js ESM migration**: all hooks rewritten from Python to Node.js (.mjs)

### Fixed

- Hermes agent constraints not being injected during install (wrong placeholder syntax)
- Hook scripts no longer require Python runtime (Node.js only)

## [0.3.0] - 2026-03-15

### Fixed

- `sed -i` portability across macOS and Linux
- Legacy skill references cleaned up

### Changed

- Rearchitected framework structure, renamed tiers

## [0.2.0] - 2026-03-14

### Added

- Enterprise hooks and expanded gitignore
- Hooks, personas, and safety rails documentation

## [0.1.0] - 2026-03-13

### Added

- Initial release: 7 agents, 10 skills, hook system
