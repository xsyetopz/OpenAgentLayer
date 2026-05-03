# Installation

This guide covers the supported OpenAgentLayer install and setup paths. Use `--dry-run` before any command that writes provider homes or project files.

## Contents

1. [Installation](#installation)
   1. [Contents](#contents)
   2. [Prerequisites](#prerequisites)
   3. [Install from source](#install-from-source)
   4. [Install with Homebrew](#install-with-homebrew)
   5. [Interactive CLI](#interactive-cli)
   6. [Set up provider plugins](#set-up-provider-plugins)
   7. [Deploy into a project](#deploy-into-a-project)
   8. [Deploy globally](#deploy-globally)
   9. [Select model plans](#select-model-plans)
   10. [Verify the install](#verify-the-install)
   11. [Uninstall](#uninstall)
   12. [Troubleshooting](#troubleshooting)

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

The plan prints copy-safe `bash` blocks. Paste command lines without Markdown list bullets.

The toolchain plan includes Bun itself. OAL-generated npm/pnpm/yarn/npx shims rely on Bun being present before provider usage starts.

Install RTK when it is missing:

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh
rtk --version
rtk gain
rtk init -g --auto-patch
rtk init -g --codex
rtk init -g --opencode
rtk init --show
```

RTK must be the `rtk-ai/rtk` binary. `rtk gain` verifies the correct package. `rtk init` must create an `RTK.md` policy in global tool config or the current project before OAL hooks enforce RTK-wrapped commands.

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

## Interactive CLI

Run without a command in a TTY for guided prompts:

```bash
bun packages/cli/src/main.ts
```

The interactive path uses Commander-parsed commands plus Clack prompts. It covers preview, deploy, plugin sync, uninstall, and check. Provider prompts use multiselect where the command can act on multiple providers. Global flows detect the home directory automatically and only ask when you override it. Non-TTY usage prints help instead of blocking for input.

Optional feature commands can be printed separately:

```bash
bun run features -- --install ctx7,playwright
bun run features -- --remove ctx7,playwright
```

Feature labels use `[CLI]` for command-line setup and `[MCP]` for provider MCP configuration.

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

## Deploy globally

Global deploy writes provider-native artifacts under the selected home directory. It also installs an owned source-checkout `oal` shim into `$HOME/.local/bin/oal` unless `--skip-bin` is passed. Dry-run first:

```bash
bun run deploy -- --scope global --provider all --dry-run
bun run deploy -- --scope global --provider all --dry-run --verbose
```

Apply all providers:

```bash
bun run deploy -- --scope global --provider all
```

Apply one provider:

```bash
bun run deploy -- --scope global --provider codex
bun run deploy -- --scope global --provider claude
bun run deploy -- --scope global --provider opencode
```

Use `--home /path/to/home` for fixture installs or non-default provider homes. OAL records global ownership under `.openagentlayer/manifest/global/` in that home.

If the binary directory is not in `PATH`, OAL prints the exact `export PATH=...` command. The current shell cannot see a newly available command until `PATH` is updated and the shell command cache is refreshed.

Manage the source-checkout shim directly:

```bash
bun packages/cli/src/main.ts bin --dry-run
bun packages/cli/src/main.ts bin
bun packages/cli/src/main.ts bin --remove
```

## Select model plans

Model plans are optional. Without a plan, OAL uses the source record defaults. With a plan, OAL applies subscription-specific provider model and reasoning choices for each Greek agent.

Codex plans:

```bash
bun run deploy -- --target /path/to/project --scope project --provider codex --plan plus --dry-run
bun run deploy -- --target /path/to/project --scope project --provider codex --plan pro-5 --dry-run
bun run deploy -- --target /path/to/project --scope project --provider codex --plan pro-20 --dry-run
```

Claude Code plans:

```bash
bun run deploy -- --target /path/to/project --scope project --provider claude --plan max-5 --dry-run
bun run deploy -- --target /path/to/project --scope project --provider claude --plan max-20 --dry-run
bun run deploy -- --target /path/to/project --scope project --provider claude --plan max-20-long --dry-run
```

OpenCode plans:

```bash
bun run preview -- --provider opencode --plan opencode-auto --path opencode.jsonc --content
bun run preview -- --provider opencode --plan opencode-free --path opencode.jsonc --content
```

`opencode-auto` runs `opencode models` and uses authenticated allowed models when available. If `opencode models` is unavailable, it falls back to OAL's free OpenCode set. Use `opencode-auth` when fallback should be an error.

For reproducible dry-runs:

```bash
opencode models > /tmp/opencode-models.txt
bun run preview -- --provider opencode --plan opencode-auto --opencode-models-file /tmp/opencode-models.txt --path opencode.jsonc --content
```

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
bun run uninstall -- --scope global --provider codex
bun run uninstall -- --scope global --provider claude
bun run uninstall -- --scope global --provider opencode
```

After project uninstall, inspect the target project's git status. User-owned files and user-authored blocks should remain.

## Troubleshooting

| Symptom                                           | Check                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `bun run check` fails on missing upstream skills. | Run `git submodule update --init --recursive`.                                                 |
| Preview shows stale provider output.              | Edit `source/`, not generated artifacts, then rerun `bun run preview -- --provider all`.       |
| Deploy wants to touch unexpected paths.           | Stop and inspect `--dry-run` output before applying.                                           |
| Codex sessions do not show OAL instructions.      | Confirm `.codex/AGENTS.md` exists and the generated profile is active in `.codex/config.toml`. |
| OpenCode tools fail to load.                      | Confirm dependencies include `@opencode-ai/plugin` and rerun `bun install --frozen-lockfile`.  |
| RTK gain fails in local release checks.           | Run RTK-wrapped commands, then rerun `bun run rtk-gain -- --allow-empty-history`.              |
