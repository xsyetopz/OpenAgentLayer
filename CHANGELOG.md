# Changelog

All notable changes to openagentsbtw are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

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
