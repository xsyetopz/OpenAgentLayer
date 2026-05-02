# Installation

This guide covers the supported OpenAgentLayer install and setup paths. Use `--dry-run` before any command that writes provider homes or project files.

## Contents

- [Prerequisites](#prerequisites)
- [Install from source](#install-from-source)
- [Install with Homebrew](#install-with-homebrew)
- [Set up provider plugins](#set-up-provider-plugins)
- [Deploy into a project](#deploy-into-a-project)
- [Verify the install](#verify-the-install)
- [Uninstall](#uninstall)
- [Troubleshooting](#troubleshooting)

## Prerequisites

OAL expects:

- Bun `1.3.13` for repository scripts.
- Git submodules for upstream skill sources.
- RTK for command-efficient validation and CI parity.
- Provider CLIs or config homes for the providers you plan to use.

Recommended toolchain plan:

```bash
bun run toolchain -- --os macos --optional ctx7,playwright
bun run toolchain -- --os linux --pkg apt --optional ctx7,playwright
```

Install RTK when it is missing:

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh
rtk gain
```

## Install from source

Use source checkout when you want current repository behavior or contributor validation.

```bash
git clone https://github.com/xsyetopz/OpenAgentLayer.git
cd OpenAgentLayer
git submodule update --init --recursive
bun install --frozen-lockfile
bun run check
```

Preview generated provider artifacts:

```bash
bun run preview -- --provider all
bun run preview -- --provider codex --path .codex/config.toml --content
```

## Install with Homebrew

The repository includes `homebrew/Casks/openagentlayer.rb`. The cask expects a release archive named:

```text
openagentlayer-<version>-macos-universal.tar.gz
```

The archive must contain `bin/oal`. After the cask is published in a tap, install from that tap and verify:

```bash
brew install --cask openagentlayer
oal check
oal preview --provider all
```

Before submitting cask changes, run:

```bash
rtk ruby -c homebrew/Casks/openagentlayer.rb
```

## Set up provider plugins

User-level plugin sync writes provider-native plugin payloads into provider homes. Always inspect the dry-run first:

```bash
bun run plugins -- --home "$HOME" --provider all --dry-run
bun run plugins -- --home "$HOME" --provider all
```

Provider-specific dry-runs:

```bash
bun run plugins -- --home "$HOME" --provider codex --dry-run
bun run plugins -- --home "$HOME" --provider claude --dry-run
bun run plugins -- --home "$HOME" --provider opencode --dry-run
```

Claude Code plugin metadata lives under `.claude-plugin/` and the Claude plugin root. Codex plugin metadata lives under `.codex-plugin/` and the Codex marketplace entry. OpenCode plugin metadata lives under `plugins/opencode/openagentlayer/` and generated project plugin files.

## Deploy into a project

Project deploy renders provider-native artifacts and writes OAL ownership metadata into the target project. Dry-run first:

```bash
bun run deploy -- --target /path/to/project --scope project --provider all --dry-run
```

Apply all providers:

```bash
bun run deploy -- --target /path/to/project --scope project --provider all
```

Apply one provider:

```bash
bun run deploy -- --target /path/to/project --scope project --provider codex
bun run deploy -- --target /path/to/project --scope project --provider claude
bun run deploy -- --target /path/to/project --scope project --provider opencode
```

Generated files that support comments include OAL managed markers. Edit `source/` and rerender instead of editing generated files directly.

## Verify the install

Source checkout validation:

```bash
rtk bun run test
rtk bun run accept
rtk proxy -- bun run accept
rtk bun run biome:check
rtk bunx tsc --noEmit
```

Installed binary smoke test:

```bash
oal check
oal preview --provider all
oal toolchain --os macos --optional ctx7,playwright
```

RTK policy check:

```bash
bun run rtk-gain -- --allow-empty-history
```

## Uninstall

Uninstall removes OAL-owned artifacts for one provider. It does not accept `all` because each provider should be removed deliberately.

```bash
bun run uninstall -- --target /path/to/project --scope project --provider codex
bun run uninstall -- --target /path/to/project --scope project --provider claude
bun run uninstall -- --target /path/to/project --scope project --provider opencode
```

After uninstall, inspect the target project's git status. User-owned files and user-authored blocks should remain.

## Troubleshooting

| Symptom | Check |
| ------- | ----- |
| `bun run check` fails on missing upstream skills. | Run `git submodule update --init --recursive`. |
| Preview shows stale provider output. | Edit `source/`, not generated artifacts, then rerun `bun run preview -- --provider all`. |
| Deploy wants to touch unexpected paths. | Stop and inspect `--dry-run` output before applying. |
| Codex sessions do not show OAL instructions. | Confirm generated `.codex/config.toml` sets `model_instructions_file = "AGENTS.md"`. |
| OpenCode tools fail to load. | Confirm dependencies include `@opencode-ai/plugin` and rerun `bun install --frozen-lockfile`. |
| RTK gain fails in local release checks. | Run RTK-wrapped commands, then rerun `bun run rtk-gain -- --allow-empty-history`. |
