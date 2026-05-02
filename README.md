# OpenAgentLayer

OpenAgentLayer (OAL) generates, previews, deploys, updates, and uninstalls provider-native agent layers for Claude Code, Codex, and OpenCode.

OAL keeps authored product input in `source/`, renders disposable provider artifacts, records manifest ownership, and removes only OAL-owned material during uninstall.

## Contents

1. [OpenAgentLayer](#openagentlayer)
   1. [Contents](#contents)
   2. [Quick start](#quick-start)
   3. [Install paths](#install-paths)
   4. [Provider support](#provider-support)
   5. [CLI commands](#cli-commands)
   6. [Common workflows](#common-workflows)
      1. [Inspect generated output](#inspect-generated-output)
      2. [Deploy to one project](#deploy-to-one-project)
      3. [Sync provider plugins into your home directory](#sync-provider-plugins-into-your-home-directory)
      4. [Remove OAL from a project](#remove-oal-from-a-project)
   7. [Homebrew](#homebrew)
   8. [Repository layout](#repository-layout)
   9. [Validation](#validation)
   10. [Contributing](#contributing)
   11. [Star History](#star-history)
   12. [License](#license)

## Quick start

Clone, load upstream skill submodules, install dependencies, and verify the source graph:

```bash
git clone https://github.com/xsyetopz/OpenAgentLayer.git
cd OpenAgentLayer
git submodule update --init --recursive
bun install --frozen-lockfile
bun run check
```

`bun` is a required OAL runtime dependency. The Homebrew cask depends on Bun, and `bun run toolchain` includes Bun in OS package-manager setup plans so generated Bun shims do not fail at use time.

Preview exactly what OAL would generate before writing anything:

```bash
bun run preview -- --provider all
bun run preview -- --provider codex --path .codex/config.toml --content
```

Dry-run deployment into a project before applying changes:

```bash
bun run deploy -- --target /path/to/project --scope project --provider all --dry-run
```

Apply only after the dry-run paths are correct:

```bash
bun run deploy -- --target /path/to/project --scope project --provider all
```

Detailed setup options are in [INSTALLATION.md](INSTALLATION.md).

## Install paths

| Path                 | Use when                                                                 | Commands                                                                                |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Source checkout      | You want the current repository behavior or plan to contribute.          | `git submodule update --init --recursive`, then `bun install --frozen-lockfile`.        |
| Homebrew cask        | You want the packaged `oal` binary after a release archive exists.       | Use the tap cask described in [Homebrew](#homebrew).                                    |
| Provider plugin sync | You want OAL available from provider plugin locations in your user home. | `bun run plugins -- --home "$HOME" --provider all --dry-run`.                           |
| Project deploy       | You want OAL artifacts in one project repository.                        | `bun run deploy -- --target /path/to/project --scope project --provider all --dry-run`. |

## Provider support

| Capability                          | Claude Code                                                     | Codex                                                                                      | OpenCode                                                                |
| ----------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Provider-native agents or subagents | ✅ Markdown agents with models, tools, and colors.               | ✅ TOML agents with model routes and quoted hex colors.                                     | ✅ Config agents plus Markdown agent files with quoted hex colors.       |
| Skills                              | ✅ `.claude/skills/*/SKILL.md`.                                  | ✅ `.codex/openagentlayer/skills/*/SKILL.md`.                                               | ✅ `.opencode/skills/*/SKILL.md`.                                        |
| Commands and routes                 | ✅ Slash-command Markdown files.                                 | 🟡 Routes are rendered into `AGENTS.md` because Codex has no matching command-file surface. | ✅ Command Markdown files and config command entries.                    |
| Hooks                               | ✅ Provider hook command entries plus executable `.mjs` scripts. | ✅ Executable `.mjs` hooks and Codex feature flags.                                         | 🟡 Executable `.mjs` scripts plus plugin guidance.                       |
| Custom tools                        | ❌ No OpenCode-style custom tool surface.                        | ❌ No OpenCode-style custom tool surface.                                                   | ✅ TypeScript tools using `@opencode-ai/plugin`.                         |
| Config rendering                    | ✅ `.claude/settings.json` and `CLAUDE.md`.                      | ✅ `.codex/config.toml` and `AGENTS.md`.                                                    | ✅ `opencode.jsonc`, plugins, instructions, tools, commands, and agents. |
| Model routing                       | ✅ Claude allowlisted models only.                               | ✅ Codex allowlisted models only.                                                           | ✅ OAL OpenCode fallback model list.                                     |
| RTK and privileged runtime          | 🟡 Privileged runtime helpers.                                   | ✅ RTK zsh shim, command shims, and privileged runtime helpers.                             | 🟡 Privileged runtime helpers.                                           |
| Manifest deploy and uninstall       | ✅ OAL-owned artifact tracking.                                  | ✅ OAL-owned artifact tracking.                                                             | ✅ OAL-owned artifact tracking.                                          |

## CLI commands

Run through package scripts from a source checkout, or replace `bun run <script> --` with `oal` after installing the binary.

| Command                | Purpose                                                                              | Common flags                                              | Safe first command                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `check`                | Load source, validate policy, and prove renderability.                               | None.                                                     | `bun run check`.                                                                        |
| `preview`              | Show generated artifact paths and optional file contents without writing.            | `--provider`, `--path`, `--content`.                      | `bun run preview -- --provider all`.                                                    |
| `render` or `generate` | Write generated artifacts into an output directory.                                  | `--provider`, `--out`.                                    | `bun run render -- --provider codex --out generated`.                                   |
| `deploy`               | Merge OAL artifacts into a target project and write ownership metadata.              | `--target`, `--scope project`, `--provider`, `--dry-run`. | `bun run deploy -- --target /path/to/project --scope project --provider all --dry-run`. |
| `uninstall`            | Remove one provider's OAL-owned artifacts from a target project.                     | `--target`, `--scope project`, `--provider`.              | `bun run uninstall -- --target /path/to/project --scope project --provider codex`.      |
| `plugins`              | Sync provider plugin payloads into user-level provider homes.                        | `--home`, `--provider`, `--dry-run`.                      | `bun run plugins -- --home "$HOME" --provider all --dry-run`.                           |
| `toolchain`            | Print OS package-manager setup commands for OAL-friendly tools.                      | `--os`, `--pkg`, `--optional`, `--json`.                  | `bun run toolchain -- --os macos --optional ctx7,playwright`.                           |
| `rtk-gain`             | Check RTK token-savings policy.                                                      | `--from-file`, `--allow-empty-history`.                   | `bun run rtk-gain -- --allow-empty-history`.                                            |
| `roadmap-evidence`     | Print the acceptance evidence ledger.                                                | None.                                                     | `bun run roadmap:evidence`.                                                             |
| `accept`               | Run full product acceptance over source, rendering, deploy, uninstall, and fixtures. | None.                                                     | `bun run accept`.                                                                       |

Providers accepted by provider-aware commands are `all`, `codex`, `claude`, and `opencode`. `uninstall` requires one provider, not `all`.

## Common workflows

### Inspect generated output

```bash
bun run preview -- --provider all
bun run preview -- --provider opencode --path opencode.jsonc --content
```

### Deploy to one project

```bash
bun run deploy -- --target /path/to/project --scope project --provider all --dry-run
bun run deploy -- --target /path/to/project --scope project --provider all
```

### Sync provider plugins into your home directory

```bash
bun run plugins -- --home "$HOME" --provider all --dry-run
bun run plugins -- --home "$HOME" --provider all
```

### Remove OAL from a project

```bash
bun run uninstall -- --target /path/to/project --scope project --provider codex
bun run uninstall -- --target /path/to/project --scope project --provider claude
bun run uninstall -- --target /path/to/project --scope project --provider opencode
```

Uninstall removes OAL-owned artifacts from the manifest. It must preserve user-owned files and user-authored config blocks.

## Homebrew

The cask definition lives at `homebrew/Casks/openagentlayer.rb`. It expects release archives from [xsyetopz/OpenAgentLayer](https://github.com/xsyetopz/OpenAgentLayer) on the `master` branch with this name:

```text
openagentlayer-<version>-macos-universal.tar.gz
```

The archive must contain `bin/oal`. After a tap contains the cask, the installed binary supports the same commands as the source checkout:

```bash
oal check
oal preview --provider all
oal deploy --target /path/to/project --scope project --provider all --dry-run
```

Run the syntax check before submitting cask changes:

```bash
rtk ruby -c homebrew/Casks/openagentlayer.rb
```

## Repository layout

| Path                 | Responsibility                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `source/`            | Authored OAL source records, prompt templates, skills, routes, hooks, tools, and provider inputs. |
| `packages/source`    | Source loading and record validation.                                                             |
| `packages/policy`    | Product policy validation, model allowlists, and generated text checks.                           |
| `packages/adapter`   | Provider-native rendering for Claude Code, Codex, and OpenCode.                                   |
| `packages/deploy`    | Deploy planning, merging, backup, and uninstall behavior.                                         |
| `packages/manifest`  | OAL ownership metadata.                                                                           |
| `packages/runtime`   | Executable `.mjs` hooks and runtime helpers.                                                      |
| `packages/accept`    | Full product acceptance gates.                                                                    |
| `packages/cli`       | User-facing command entrypoint.                                                                   |
| `packages/toolchain` | OS toolchain setup plan rendering.                                                                |
| `plugins/`           | Provider plugin metadata and sync roots, not duplicated generated content.                        |

## Validation

Use package scripts where possible:

```bash
rtk bun run biome:format
rtk bun run test
rtk bun run accept
rtk proxy -- bun run accept
rtk bun run rtk-gain -- --allow-empty-history
rtk bun run biome:check
rtk bunx tsc --noEmit
rtk ruby -c homebrew/Casks/openagentlayer.rb
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and validation guidance.

All contributors must follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Star History

<a href="https://www.star-history.com/?repos=xsyetopz%2FOpenAgentLayer&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=xsyetopz/OpenAgentLayer&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=xsyetopz/OpenAgentLayer&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=xsyetopz/OpenAgentLayer&type=date&legend=top-left" />
 </picture>
</a>

## License

[MIT](LICENSE)
