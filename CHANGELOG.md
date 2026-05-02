# Changelog

All notable changes to OpenAgentLayer (OAL) are documented here.

This changelog starts at OAL v1. Earlier repository history is reference
material only and is not part of the OAL release line.

## [0.1.0] - 2026-05-02

### Added

- Introduced OAL as a production-grade generator and deployer for Claude Code,
  Codex, and OpenCode.
- Added authored source loading from `source/` for agents, routes, skills,
  hooks, tools, support files, and product metadata.
- Added provider-native rendering:
  - Codex profiles, agents, skills, executable hooks, `AGENTS.md`, and
    `.codex/config.toml`
  - Claude Code settings, agents, commands, skills, executable hooks, and
    `CLAUDE.md`
  - OpenCode `opencode.jsonc`, agents, commands, skills, tools, plugins,
    instructions, permissions, model fallbacks, and executable hooks
- Added manifest-owned deploy, update, backup, drift detection, and uninstall
  behavior.
- Added OAL managed markers for generated comment-capable artifacts and managed
  instruction blocks.
- Added executable `.mjs` runtime hooks for safety, route context, source drift,
  evidence checks, secret protection, generated-file protection, RTK enforcement,
  and failure-loop protection.
- Added acceptance validation for source loading, provider rendering, manifests,
  deploy/uninstall behavior, hook executability, generated artifact contracts,
  toolchain planning, Homebrew cask syntax, and CI/CD gates.
- Added package boundaries for `source`, `policy`, `adapter`, `artifact`,
  `manifest`, `deploy`, `runtime`, `accept`, `cli`, and `toolchain`.
- Added CLI commands for check, preview, render, deploy, uninstall, acceptance,
  roadmap evidence, and toolchain planning.
- Added Homebrew cask definition for `openagentlayer`.
- Added CI/CD that runs quality gates and deploy dry-runs before guarded
  Homebrew submission.
- Added repo-hosted provider plugin marketplace payloads and user-level plugin
  sync for Claude Code, Codex, and OpenCode with stale OAL cache pruning.

### Changed

- Product naming is OpenAgentLayer or OAL across new code, docs, package names,
  generated user-facing artifacts, and release surfaces.
- CLI command implementations are split under `packages/cli/src/commands`.
- Codex model routing is limited to `gpt-5.5`, `gpt-5.4-mini`, and
  `gpt-5.3-codex`.
- Claude model routing is limited to `claude-opus-4-7`,
  `claude-opus-4-7[1m]`, `claude-sonnet-4-6`, and `claude-haiku-4-5`.
- Codex feature toggles include concise inline reasons in generated TOML.
- `reference notes/` is read-only reference material and is not imported by runtime
  code.

### Removed

- Removed historical release notes from the active OAL changelog.
- Removed blocked product naming from active code, docs, CI, Homebrew metadata,
  package metadata, and generated user-facing artifacts.

### Verified

- `bunx tsc --noEmit`
- `bun run test`
- `bun run accept`
- `bun run biome:check`
- `ruby -c homebrew/Casks/openagentlayer.rb`
- `bun run roadmap:evidence`
