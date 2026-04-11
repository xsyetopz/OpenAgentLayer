# openagentsbtw

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Deterministic, multi-platform agents/skills/hooks for:
- Claude Code
- Codex CLI
- OpenCode
- GitHub Copilot (VS Code)

Everything is generated from `source/` at install/build time so we don’t maintain duplicate agent/skill/hook files per platform.

## Shared Surfaces

openagentsbtw treats these as shared cross-platform surfaces:

- `ctx7` CLI for external library/API/setup/config docs lookups
- RTK enforcement via `rtk rewrite` when RTK policy is active
- Playwright CLI for browser automation tasks
- DeepWiki MCP plus explicit DeepWiki-assisted exploration routing

## Quickstart

Install one system:

```bash
./install.sh --claude
./install.sh --codex
./install.sh --opencode
./install.sh --copilot
```

```powershell
./install.ps1 --claude
./install.ps1 --codex
./install.ps1 --opencode
./install.ps1 --copilot
```

Install everything (or run with no flags to get prompts):

```bash
./install.sh --all
./install.sh
```

Optional browser automation (Playwright CLI):

```bash
./install.sh --playwright-cli
```

Optional external-doc tooling (Context7 CLI):

```bash
./install.sh --ctx7-cli
./install.sh --no-ctx7-cli
```

Post-install configuration:

```bash
./config.sh --ctx7
./config.sh --ctx7-api-key
./config.sh --deepwiki
./config.sh --rtk
```

```powershell
./config.ps1 --ctx7
./config.ps1 --deepwiki
./config.ps1 --rtk
```

Update later:

```bash
git pull
./install.sh --claude --codex --opencode --copilot
```

Uninstall:

```bash
./uninstall.sh --all
```

```powershell
./uninstall.ps1 --all
```

## What this repo is

This repo packages the four platform-specific surfaces:

- `claude/`: Claude Code plugin package + tests
- `codex/`: Codex-native plugin package + Codex research docs in `docs/openai/`
- `opencode/`: OpenCode framework integration + generator inputs
- `copilot/`: Copilot/VS Code assets + runtime hook scripts

Shared source-of-truth content lives in `source/`. The installer generates platform artifacts into a temporary build dir (and `bun run generate` can write into `.build/generated/`).

Installer/generator decomposition (no god script):

- `install.sh` is a thin Bash compatibility wrapper over `scripts/install/cli.mjs`
- `config.sh` is a thin Bash compatibility wrapper over `scripts/install/config-cli.mjs`
- `uninstall.sh` is a thin Bash compatibility wrapper over `scripts/install/uninstall-cli.mjs`
- `build-plugin.sh` is a thin Bash compatibility wrapper over `scripts/build-plugin-cli.mjs`
- `install.ps1`, `config.ps1`, `uninstall.ps1`, and `build-plugin.ps1` are matching PowerShell wrappers over the same shared Node CLIs
- `scripts/build.mjs` assembles build output for packaging
- `scripts/generate.mjs` orchestrates focused render modules under `scripts/generate/`

Each platform also gets a generated “hook support map” so it’s explicit what ports cleanly vs what’s unsupported.

## Docs

- Full installer flags + per-platform details: `docs/install.md`
- Codex notes (models, hooks, porting): `docs/openai/README.md`
- OpenCode notes (rules/plugins): `docs/opencode/README.md`
- “Nano BMAD” method notes: `docs/method/nano-bmad.md`

Codex installs also add PATH-managed `oabtw-codex`, `openagentsbtw-codex`, `oabtw-codex-peer`, and `openagentsbtw-codex-peer` shims, so `oabtw-codex qa`, `oabtw-codex longrun`, `oabtw-codex resume --last`, and `oabtw-codex-peer batch|tmux` are directly invocable after install on correctly configured shells.

RTK enforcement is only active when both of the following are true:
- `rtk` is installed
- an `RTK.md` policy file exists in the repo tree (nearest ancestor wins) or at the managed global openagentsbtw config path (`~/.config/openagentsbtw/RTK.md` on Unix, `%APPDATA%\openagentsbtw\RTK.md` on Windows; legacy fallback paths are also checked)

When active, openagentsbtw uses `rtk rewrite` as the source of truth and enforces RTK-prefixed Bash forms for commands RTK can rewrite.

## Development

Contributor workflow details live in `CONTRIBUTING.md`.

```bash
bun install --frozen-lockfile
bun run generate
bun test tests claude/tests codex/tests
cd opencode && bun install --frozen-lockfile && bun test && bun run typecheck
node scripts/ci/install-smoke.mjs
./build-plugin.sh
```

```powershell
bun install --frozen-lockfile
bun run generate
bun test tests claude/tests codex/tests
./build-plugin.ps1
```

Local Claude plugin build output lands in `dist/openagentsbtw-claude-plugin/`. Tag releases also publish a combined generated-assets archive for Codex, Copilot, OpenCode, and shared templates.

## License

[MIT](LICENSE)
