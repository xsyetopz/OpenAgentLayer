# Changelog

All notable changes to openagentsbtw are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [3.2.1] - 2026-04-22

### Removed

- Removed active Roo Code installer, generator, generated artifact, and platform documentation support after Roo Code announced shutdown.

### Changed

- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `3.2.1`.

## [3.2.0] - 2026-04-22

### Added

- Vendored upstream `Leonxlnx/taste-skill` as a pinned submodule and mapped every upstream Taste variant to local `taste*` skill names across Claude, Codex, OpenCode, and Copilot.
- Added Codex routes for `taste`, `taste-gpt`, `taste-images`, `taste-redesign`, `taste-soft`, `taste-output`, `taste-minimalist`, `taste-brutalist`, `taste-stitch`, and `taste-imagegen`.
- Added GPT Image 2 guidance for GPT/Codex image-first Taste workflows, including the Images API vs Responses API hosted-tool split.

### Changed

- RTK enforcement now applies high-gain openagentsbtw rewrites before falling back to `rtk proxy`, including Bun test/typecheck and simple file-read commands.
- Managed RTK policy text now prefers specialized `rtk-ai/rtk` filters such as `rtk test`, `rtk tsc`, `rtk read`, `rtk grep`, `rtk find`, and `rtk diff`.
- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `3.2.0`.

## [3.1.0] - 2026-04-21

### Added

- Optional IDE support for Roo Code, Cline, Cursor, JetBrains Junie, and Antigravity.
- `./install.sh --all` now auto-detects optional IDEs and skips missing systems without writing their files.
- New explicit installer flags: `--roo`, `--cline`, `--cursor`, `--junie`, `--antigravity`, `--optional-ides`, and `--no-optional-ides`.
- Generated optional IDE artifacts under `optional-ides/`, with project-native rules/instructions, Roo modes, Cline skills/workflows/hooks, Cursor MDC rules, Junie `AGENTS.md`, and conservative Antigravity `AGENTS.md`/`GEMINI.md` blocks.

### Changed

- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `3.1.0`.

## [3.0.0] - 2026-04-21

### Added

- Hook policy catalog now requires explicit categories and supports Copilot fallback event mappings for compatibility surfaces.
- Added installer runtime smoke coverage that executes real install/uninstall flows in isolated HOME/XDG roots.

### Changed

- Breaking v3 cut: removed remaining agentic-ides installer/docs/generator surfaces from active code paths.
- Caveman upstream integration now pins and validates `third_party/caveman` as the single source of truth.
- Codex tier matrix wording is now explicit in release notes:

| Codex plan | Top-level `openagentsbtw` | `model_reasoning_effort` | `plan_mode_reasoning_effort` | Implementation/auto/runtime |
| ---------- | ------------------------- | ------------------------ | ---------------------------- | --------------------------- |
| `go`       | `gpt-5.4-mini`            | `medium`                 | `high`                       | `gpt-5.3-codex`             |
| `plus`     | `gpt-5.4`                 | `medium`                 | `high`                       | `gpt-5.3-codex`             |
| `pro-5`    | `gpt-5.4`                 | `medium`                 | `high`                       | `gpt-5.3-codex`             |
| `pro-20`   | `gpt-5.4`                 | `medium`                 | `high`                       | `gpt-5.3-codex`             |

- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `3.0.0`.

### Fixed

- Installer and uninstaller runtime regressions caused by stale missing imports/symbols after surface removal.
- Copilot hook generation now emits fallback event entries where policy mappings require compatibility backstops.

## [2.2.2] - 2026-04-20

### Fixed

- Git-workflow co-author policy now explicitly requires canonical AI commit trailers, auto-adds canonical trailers when missing on rewrite-capable surfaces, and blocks malformed canonical domains such as `noreply@openai` in favor of `noreply@openai.com`.
- Codex, Claude, and Copilot pre-tool bash guards now enforce AI co-author trailer presence on `git commit`; Codex blocks with a corrected command hint, while Claude and Copilot auto-rewrite missing trailers to canonical defaults.

### Changed

- Updated generated git-workflow skill guidance for Codex/Claude/Copilot to document canonical trailer enforcement and malformed-domain blocking.
- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `2.2.2`.

## [2.2.1] - 2026-04-20

### Added

- Added the shared `plain-language` skill for website copy, docs wording, UI labels, status copy, localization-ready prose, A2-B1 English, and non-native reader copy across Claude, Codex, OpenCode, and Copilot.

### Fixed

- Shared RTK enforcement now accepts valid `rtk rewrite` stdout even when RTK exits nonzero, preventing missed rewrites on Claude, Codex, Copilot, and OpenCode.
- Shared RTK enforcement now falls back to `rtk proxy -- bash -lc ...` for unsupported shell commands when RTK policy is active, so raw shell commands do not silently bypass RTK.
- Managed Caveman mode now has runtime completion checks that reject obvious verbose drift while preserving code, commands, exact errors, docs, review findings, and commit messages.
- Codex install now writes managed root config before existing TOML tables and sets the `openagentsbtw` profile by default unless explicitly disabled.
- Installer validation now checks installed skills, hooks, wrappers, marketplace/config entries, Codex plugin source/cache payloads, per-tool `RTK.md` policy files, instruction references, and Caveman config across supported surfaces.
- RTK setup now writes platform-local policy files such as `~/.claude/RTK.md`, `~/.codex/RTK.md`, `~/.copilot/RTK.md`, and the OpenCode config `RTK.md`, with managed instruction references including Claude Code `@RTK.md`.

### Changed

- Codex install now stages the plugin into both `~/.codex/plugins/openagentsbtw` and the active Codex cache path before pruning stale versions, so installed skills are available after install without manual plugin reinstall.
- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `2.2.1`.

## [2.2.0] - 2026-04-19

### Added

- Release notes retained for historical continuity.

## [2.1.0] - 2026-04-18

### Added

- Codex/Claude: added an experimental deferred prompt queue with `/queue`, `queue:`, `/queue --auto`, and queue management commands so follow-up prompts can be stored outside the repo without interrupting active work.
- Codex: added `oabtw-codex queue list|add|next|clear|retry` for shell-level deferred queue management.

### Changed

- Codex/Claude: Stop hooks now surface pending queue entries after completion gates pass and dispatch one `--auto` entry only after existing stop-scan validation succeeds.
- Prompt policy: kept `BLOCKED:` as the canonical blocker contract and documented always-on `TOOLING BLOCK`-style sentinels as non-default local diagnostics.
- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `2.1.0`.

## [2.0.0] - 2026-04-13

### Added

- Canonical per-agent source directories under `source/agents/<agent>/` with colocated `agent.json` and `prompt.md`.
- Canonical per-skill source directories under `source/skills/<skill>/` with colocated `skill.json`, `body.md`, references, and helper scripts.
- Canonical per-hook policy files under `source/hooks/policies/`.
- Canonical per-platform guidance files under `source/guidance/`.
- Cross-platform `design-polish` skill as a first-class v2 surface in the canonical source tree.

### Changed

- Released the breaking v2 architecture cut with no backward-compatibility shims for retired v1 routes, source paths, or compatibility aliases.
- Generator now reads only the colocated v2 source layout; skill `bodyDir` indirection is gone.
- Codex internal managed profile ids now match the wrapper modifier model:
  - `openagentsbtw-utility`
  - `openagentsbtw-approval-auto`
  - `openagentsbtw-runtime-long`
- Codex wrapper and managed config now use those internal profile ids everywhere.
- Canonical skill folder names now match public v2 names exactly: `deslop`, `document`, and `git-workflow`.
- Docs, contributor guidance, and generated assets now describe only the v2 source layout and route model.
- `CHANGELOG.md` historical wording was normalized so retired v1 route/profile names no longer appear as live terminology.

### Removed

- Old source monoliths and duplicate authorship surfaces:
  - `source/agent-prompts.mjs`
  - `source/project-guidance.mjs`
  - `source/hook-policies.json`
  - legacy registry JSON files
  - duplicate top-level reference trees under `source/errors`, `source/perf`, `source/review`, `source/security`, and `source/test`
- Remaining compatibility behavior for retired installer/config aliases and legacy plan migration paths.
- Legacy repo-root Copilot instruction cleanup path.
- Old scattered platform docs replaced by the consolidated v2 docs layout.

### Verified

- `bun run check:generated`
- `bun test tests claude/tests codex/tests`
- `cd opencode && bun test && bun run typecheck`

## [1.3.3] - 2026-04-13

### Added

- Release tooling: added root `version.sh` / `version.ps1` wrappers plus `scripts/version-cli.mjs` to bump the shared Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions together with `maj|min|pat` aliases or `--set X.Y.Z`.
- Release tooling: added regression coverage for the shared version bump workflow and drift detection across the tracked release surfaces.
- Shared: added a pinned upstream Caveman mirror under `source/upstream/caveman/` plus a local sync helper for upstream-backed always-on Caveman semantics.

### Fixed

- Shared skills: handoff-writing guidance now targets the platform tooling directory instead of hardcoding `.claude/`, using `.claude/` for Claude, `.agents/` for Codex, and `.opencode/` for OpenCode.
- Managed hooks: installed Claude/Codex/Copilot Caveman runtimes no longer import `source/caveman.mjs` from missing home-directory paths; each hook tree now ships a self-contained local Caveman helper.

### Changed

- Shared: Caveman enforcement now uses one stronger canonical contract across Claude, Codex, OpenCode, and Copilot static guidance plus managed session context, keeping code/commands/docs/reviews normal unless an explicit Caveman skill is invoked.
- Build: generated/built outputs now ship the shared Caveman contract source and upstream mirror so hook/runtime imports stay consistent outside the repo tree.
- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `1.3.3`.

## [1.3.2] - 2026-04-12

### Fixed

- Codex: wrapper-managed sessions now filter multiline hook-context dumps on first turn instead of leaking raw hook output into normal conversation flow.
- Codex: startup now warns about `oabtw-codex` only when wrapper resolution is actually broken, not merely when the shim is absent from PATH in the hook process.

### Changed

- Codex: `SessionStart` now owns project-memory recap while `UserPromptSubmit` stays limited to lightweight git context during active work.
- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `1.3.2`.

## [1.3.1] - 2026-04-11

### Changed

- Claude: renamed the supported plan contract to `pro`, `max-5`, and `max-20`, with installer/config updates aligned to the current preset names.
- Copilot: normalized human-facing plan references to `Pro` and `Pro+` while keeping the CLI/config flags `pro` and `pro-plus`.
- Codex: split managed config reasoning so `model_reasoning_effort` stays `medium` on all managed profiles while `plan_mode_reasoning_effort` remains plan-shaped.
- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `1.3.1`.

## [1.3.0] - 2026-04-11

### Added

- Shared: integrated Caveman across Claude, Codex, OpenCode, and Copilot with managed default modes (`off`, `lite`, `full`, `ultra`, `wenyan-lite`, `wenyan`, `wenyan-ultra`).
- Shared: added Caveman skills across all four platforms: `caveman`, `caveman-help`, `caveman-commit`, `caveman-review`, and `caveman-compress`.
- Shared: added local `caveman-compress` tooling that preserves code blocks, links, paths, headings, lists, tables, and writes `.original.md` backups.
- Claude: added route-contract metadata generation plus `SubagentStart` route-context injection for openagentsbtw agents.
- Claude: added route-aware stop-gate tests covering `edit-required`, `execution-required`, and strict `BLOCKED:` behavior.
- OpenCode: added native route classification, task-tool subagent tracking, compaction context injection, and final-response completion gating through documented plugin hooks.

### Changed

- Shared: installer/config now manage `OABTW_CAVEMAN_MODE`, and new sessions seed platform-local Caveman state from that shared default.
- Claude/Codex/Copilot: session hooks now apply Caveman response shaping without rewriting code, docs, commit messages, or review findings.
- Claude: statusline now shows the active Caveman mode when enabled.
- Claude: default continuity now stays native via persisted hook context, transcript resume, and memory; `/cca:handoff` is explicit export-only.
- Claude: `Stop` and `SubagentStop` now reject explanation-only completions, docs-only churn on implementation routes, and prototype/demo scaffolding.
- OpenCode: native `plan`, `explore`, and `general` agents now remain enabled by default; openagentsbtw roles are additive and continuity is native-first via `--continue`, `/sessions`, `/compact`, and `task_id`.
- OpenCode: runtime dependency alignment moved `@opencode-ai/plugin` onto the upstream `1.4.3` line while keeping the openagentsbtw OpenCode package on the shared `1.3.0` framework release.
- Shared guardrails: tightened affect-discipline rules so user frustration cannot downgrade effort or push agents into tutorial/prototype fallbacks.
- Release: aligned Claude plugin, Claude marketplace, Codex plugin, and OpenCode package versions to `1.3.0`.

## [1.2.8] - 2026-04-09

### Added

- Installer/config: added shared subscription preset policy for Codex (`go`, `plus`, `pro-5`, `pro-20`), Claude (`pro`, `max-5`, `max-20`), and Copilot (`pro`, `pro-plus`).
- Config: added in-place plan switching via `./config.sh --claude-plan`, `--codex-plan`, and `--copilot-plan`.

### Changed

- Codex: main, implementation, utility, approval-auto, and runtime-long routing is now plan-aware, with lighter utility routing separated from the main profile.
- Claude: standardized the public plan wording on the current preset names.
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

- Codex: fast routing is available through the `--speed fast` modifier.
- Codex: multi-step coordination routes through explicit orchestration instead of a catch-all mode.
- Codex guidance: prompt contracts, reasoning-activation scaffolding, and explicit anti–god-object rules.
- Codex guidance: explicit subagent-spawning instruction in `AGENTS.md` (Codex only spawns subagents when explicitly asked).

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
- JS tooling preference order is now: `bun`/`bunx` -> `pnpm`/`yarn` -> `npm`/`npx`, with an automatic bun install attempt when none are present.
- Codex sample config and managed guidance are aligned to the `gpt-5.2` / `gpt-5.3-codex` / `gpt-5.3-codex-spark` split (no managed `gpt-5.4` routing).

### Removed

- Chrome DevTools MCP and Browser MCP installer support (flags, config edits, and docs). Reinstalling now also removes the legacy openagentsbtw-managed MCP blocks where applicable.

## [1.1.10] - 2026-04-04

### Changed

- Version `1.1.10` is now aligned across the Claude plugin, Codex plugin, and OpenCode package.
- Codex model presets and routing:
  - the main high-reasoning route now defaults to `gpt-5.2`.
  - the implementation-heavy route stays on `gpt-5.3-codex`.
  - the utility route now uses `gpt-5.3-codex-spark`.
  - the stable `openagentsbtw` profile is pinned to `gpt-5.2` instead of mirroring the selected preset.
- Codex install defaults now prefer the current high-reasoning preset when no explicit Codex plan is supplied.
- Managed Codex guidance and research docs now describe the `gpt-5.2` / `gpt-5.3-codex` / `gpt-5.3-codex-spark` split and remove full `gpt-5.4` from managed routing.

## [1.1.9] - 2026-04-02

### Added

- Codex completion check now supports `cca-allow` suppression when scanning for placeholders/hedges.
- Codex hook library tests for placeholder/hedge behavior.

### Changed

- Version `1.1.9` is now aligned across the Claude plugin, Codex plugin, and OpenCode package.
- Codex model presets and routing:
  - the daily-driver implementation route defaults to `gpt-5.3-codex`.
  - the flagship main route defaults to `gpt-5.4`.
  - the utility profile is a lightweight route (low reasoning/verbosity) without requiring a "mini" model.
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
