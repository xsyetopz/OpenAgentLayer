# openagentsbtw

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Deterministic, multi-platform agents/skills/hooks for:
- Claude Code
- Codex CLI
- OpenCode
- GitHub Copilot (VS Code)

Everything is generated from `source/` at install/build time so we don’t maintain duplicate agent/skill/hook files per platform.

## Quickstart (ADHD edition)

Install one system:

```bash
./install.sh --claude
./install.sh --codex
./install.sh --opencode
./install.sh --copilot
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

Update later:

```bash
git pull
./install.sh --claude --codex --opencode --copilot
```

Uninstall:

```bash
./uninstall.sh --all
```

## What this repo is

This repo packages the four platform-specific surfaces:

- `claude/`: Claude Code plugin package + tests
- `codex/`: Codex-native plugin package + Codex research docs in `docs/openai/`
- `opencode/`: OpenCode framework integration + generator inputs
- `copilot/`: Copilot/VS Code assets + runtime hook scripts

Shared source-of-truth content lives in `source/`. The installer generates platform artifacts into a temporary build dir (and `bun run generate` can write into `.build/generated/`).

Each platform also gets a generated “hook support map” so it’s explicit what ports cleanly vs what’s unsupported.

## Docs

- Full installer flags + per-platform details: `docs/install.md`
- Codex notes (models, hooks, porting): `docs/openai/README.md`
- OpenCode notes (rules/plugins): `docs/opencode/README.md`
- “Nano BMAD” method notes: `docs/method/nano-bmad.md`

## Development

Contributor workflow details live in `CONTRIBUTING.md`.

```bash
bun install --frozen-lockfile
bun run generate
bun run test
cd opencode && bun install --frozen-lockfile && bun run test && bun run typecheck
./build-plugin.sh
```

Build output for the Claude plugin lands in `dist/openagentsbtw-claude-plugin/`.

## License

[MIT](LICENSE)
