# OpenAgentLayer

OpenAgentLayer (OAL) generates, previews, deploys, updates, and uninstalls provider-native agent layers for Claude Code, Codex, and OpenCode.

OAL keeps authored product input in `source/`, renders disposable provider artifacts, records manifest ownership, and removes only OAL-owned material during uninstall.

## Contents

1. [OpenAgentLayer](#openagentlayer)
   1. [Contents](#contents)
   2. [Quick start](#quick-start)
   3. [Install paths](#install-paths)
   4. [Provider support](#provider-support)
   5. [Model plans](#model-plans)
   6. [CLI commands](#cli-commands)
   7. [Interactive CLI](#interactive-cli)
   8. [Common workflows](#common-workflows)
      1. [Inspect generated output](#inspect-generated-output)
      2. [Deploy to one project](#deploy-to-one-project)
      3. [Deploy globally](#deploy-globally)
      4. [Sync provider plugins into your home directory](#sync-provider-plugins-into-your-home-directory)
      5. [Remove OAL from a project or provider home](#remove-oal-from-a-project-or-provider-home)
   9. [Homebrew](#homebrew)
   10. [Repository layout](#repository-layout)
   11. [Validation](#validation)
   12. [Contributing](#contributing)
   13. [Star History](#star-history)
   14. [License](#license)

## Quick start

Clone, load upstream skill submodules, install dependencies, and verify the source graph:

```bash
git clone https://github.com/xsyetopz/OpenAgentLayer.git
cd OpenAgentLayer
git submodule update --init --recursive
bun install --frozen-lockfile
bun run check
```

`bun` is a required OAL runtime dependency. The Homebrew cask depends on Bun, and `bun run toolchain` includes Bun in OS package-manager setup plans so generated Bun shims do not fail at use time. `setup --toolchain` can include the same toolchain plan before deploying provider artifacts.

RTK setup must use `rtk-ai/rtk`: install it, verify with `rtk gain`, then initialize provider policies with `rtk init -g --auto-patch`, `rtk init -g --codex`, and `rtk init -g --opencode`. OAL RTK hooks enforce RTK only when the binary works and `RTK.md` exists globally or in the project.

Preview exactly what OAL would generate before writing anything:

```bash
bun run preview -- --provider all
bun run preview -- --provider codex --path .codex/config.toml --content
```

Dry-run deployment into a project before applying changes:

```bash
bun run setup -- --target /path/to/project --scope project --provider all --dry-run
bun run deploy -- --target /path/to/project --scope project --provider all --dry-run
```

Apply only after the dry-run paths are correct:

```bash
bun run deploy -- --target /path/to/project --scope project --provider all
```

In a terminal, run the CLI without a command for guided prompts:

```bash
bun packages/cli/src/main.ts
```

Detailed setup options are in [INSTALLATION.md](INSTALLATION.md).

Convenience install scripts are available from the repository root:

```bash
./install.sh setup --scope global --provider all --toolchain --dry-run
./install-online.sh setup --scope global --provider all --toolchain --dry-run
```

`install-online.sh` clones OAL into a temporary directory, copies it into `OAL_INSTALL_DIR` or `$HOME/.local/share/openagentlayer`, runs `install.sh`, and removes the temporary clone.

## Install paths

| Path                 | Use when                                                                 | Commands                                                                                |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Source checkout      | You want the current repository behavior or plan to contribute.          | `git submodule update --init --recursive`, then `bun install --frozen-lockfile`.        |
| Online install       | You want a persistent user install without manually cloning the repo.    | `./install-online.sh setup --scope global --provider all --toolchain --dry-run`.        |
| Homebrew cask        | You want the packaged `oal` binary after a release archive exists.       | Use the tap cask described in [Homebrew](#homebrew).                                    |
| Provider plugin sync | You want OAL available from provider plugin locations in your user home. | `bun run plugins -- --home "$HOME" --provider all --dry-run`.                           |
| Project deploy       | You want OAL artifacts in one project repository.                        | `bun run deploy -- --target /path/to/project --scope project --provider all --dry-run`. |
| Global deploy        | You want OAL active in global provider config.                           | `bun run deploy -- --scope global --provider all --dry-run`.                            |

## Provider support

Legend: ✅ supported, ⚠️ partial/provider-limited, 🚧 under construction, ❌ unsupported by provider surface, - not applicable.

| Capability                | Claude Code                            | Codex                                       | OpenCode                                   |
| ------------------------- | -------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| Agents/subagents          | ✅ Markdown agents.                     | ✅ TOML agents.                              | ✅ Markdown plus config agents.             |
| Per-agent model routing   | ✅ Claude allowlist.                    | ✅ Codex allowlist.                          | ✅ Auth model detection plus free fallback. |
| Per-agent colors          | ✅ Quoted hex frontmatter.              | ✅ Quoted hex TOML values.                   | ✅ Quoted hex frontmatter.                  |
| Skills                    | ✅ `skills/*/SKILL.md`.                 | ✅ `openagentlayer/skills/*/SKILL.md`.       | ✅ `skills/*/SKILL.md`.                     |
| Commands/routes           | ✅ Slash-command Markdown.              | ⚠️ Rendered into `AGENTS.md`.                | ✅ Command Markdown plus config entries.    |
| Hooks                     | ✅ Hook entries plus executable `.mjs`. | ✅ Executable `.mjs` plus feature flags.     | ⚠️ Plugin-mediated executable `.mjs`.       |
| Custom tools              | ❌ No matching provider surface.        | ❌ No matching provider surface.             | ✅ `@opencode-ai/plugin` TypeScript tools.  |
| Provider instructions     | ✅ `CLAUDE.md`.                         | ✅ `AGENTS.md`.                              | ✅ instruction file plus config reference.  |
| Structured config merge   | ✅ `settings.json`.                     | ✅ `config.toml`.                            | ✅ `opencode.jsonc`.                        |
| Plugin payload sync       | ✅ Claude plugin layout.                | ✅ Codex plugin layout.                      | ✅ OpenCode plugin layout.                  |
| RTK command enforcement   | ⚠️ Requires `rtk init -g --auto-patch`. | ✅ Hook-enforced with `rtk init -g --codex`. | ⚠️ Requires `rtk init -g --opencode`.       |
| Privileged exec helper    | ✅ Executable helper scripts.           | ✅ Executable helper scripts.                | ✅ Executable helper scripts.               |
| Manifest deploy/uninstall | ✅ OAL-owned artifact tracking.         | ✅ OAL-owned artifact tracking.              | ✅ OAL-owned artifact tracking.             |
| Drift checks              | ✅ Generated edit guards.               | ✅ Generated edit guards.                    | ✅ Generated edit guards.                   |

For Codex, OAL renders `.codex/requirements.toml` with `hooks = true` and
managed OAL hook entries. Codex only treats hooks as approval-free when that
requirements file is installed into Codex's managed requirements layer for the
environment; `deploy` prints a warning when this step is still external.

Codex also has an OAL-managed delegation CLI for environments where the native subagent launcher is unavailable to the current session:

```bash
oal codex agent hermes --dry-run "map runtime hooks"
oal codex route review --dry-run "audit the current diff"
oal codex peer batch --dry-run "investigate, implement, validate, and review"
```

`oal codex peer batch` creates a `.openagentlayer/codex-peer/<run-id>/` run directory and coordinates orchestrator, validate, worker, and review passes.

## Model plans

OAL applies subscription-specific model and reasoning choices instead of giving every generated agent the same model. Use `--plan` with `preview`, `render`, `deploy`, or `plugins`.

| Provider    | Plans                                             | Notes                                                                                                                                                             |
| ----------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex       | `plus`, `pro-5`, `pro-20`                         | Uses only `gpt-5.5`, `gpt-5.4-mini`, and `gpt-5.3-codex`; default, Plus, and Pro-5 avoid `gpt-5.5`, while Pro-20 uses `gpt-5.5` high without defaulting to xhigh. |
| Claude Code | `max-5`, `max-20`, `max-20-long`                  | `max-20-long` is the explicit `claude-opus-4-6[1m]` route for long-context Opus agents.                                                                           |
| OpenCode    | `opencode-auto`, `opencode-auth`, `opencode-free` | `opencode-auto` reads `opencode models` when available and falls back to OAL's free OpenCode model set.                                                           |

Examples:

```bash
bun run preview -- --provider codex --plan pro-20 --path .codex/agents/athena.toml --content
bun run preview -- --provider claude --plan max-20-long --path .claude/agents/nemesis.md --content
bun run preview -- --provider opencode --plan opencode-auto --path opencode.jsonc --content
```

For deterministic OpenCode previews, save `opencode models` output and pass it explicitly:

```bash
opencode models > /tmp/opencode-models.txt
bun run preview -- --provider opencode --plan opencode-auto --opencode-models-file /tmp/opencode-models.txt --path opencode.jsonc --content
```

## CLI commands

Run through package scripts from a source checkout, or replace `bun run <script> --` with `oal` after installing the binary.

| Command            | Purpose                                                                              | Common flags                                                                                        | Safe first command                                                                      |
| ------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `check`            | Load source, validate policy, and prove renderability.                               | None.                                                                                               | `bun run check`.                                                                        |
| `preview`          | Show generated artifact paths and optional file contents without writing.            | `--scope`, `--home`, `--provider`, `--path`, `--content`, `--plan`.                                 | `bun run preview -- --provider all`.                                                    |
| `render`           | Write generated artifacts into an output directory.                                  | `--scope`, `--home`, `--provider`, `--out`, `--plan`.                                               | `bun run render -- --provider codex --out generated`.                                   |
| `setup`            | Plan or apply toolchain, deploy, plugin sync, binary shim, and installed checks.     | `--target`, `--scope`, `--provider`, `--toolchain`, `--optional`, `--dry-run`, `--verbose`.         | `bun run setup -- --scope global --provider all --toolchain --dry-run`.                 |
| `profiles`         | Save, show, activate, or remove reusable setup profiles.                             | `list`, `show`, `save`, `use`, `remove`, `--config`, setup flags.                                   | `bun run profiles -- save global --scope global --provider codex,opencode --activate`.  |
| `state`            | Inspect active profile, provider availability, deploy changes, and removal state.    | `inspect`, `--profile`, `--config`, `--provider`, `--json`.                                         | `bun run state -- inspect --json`.                                                      |
| `deploy`           | Merge OAL artifacts into a target project or global provider home.                   | `--target`, `--scope project\|global`, `--home`, `--provider`, `--dry-run`, `--verbose`, `--quiet`. | `bun run deploy -- --target /path/to/project --scope project --provider all --dry-run`. |
| `bin`              | Install, inspect, or remove the source-checkout `oal` executable shim.               | `--home`, `--bin-dir`, `--remove`, `--dry-run`.                                                     | `bun packages/cli/src/main.ts bin --dry-run`.                                           |
| `uninstall`        | Remove one provider's OAL-owned artifacts from a target project or provider home.    | `--target`, `--scope project\|global`, `--home`, `--provider`.                                      | `bun run uninstall -- --target /path/to/project --scope project --provider codex`.      |
| `plugins`          | Sync provider plugin payloads into user-level provider homes.                        | `--home`, `--provider`, `--dry-run`, `--plan`, `--opencode-models-file`.                            | `bun run plugins -- --home "$HOME" --provider all --dry-run`.                           |
| `inspect`          | Print shared OAL capability, manifest, generated-input, policy, or release evidence. | `capabilities`, `manifest`, `generated-diff`, `rtk-report`, `command-policy`, `release-witness`.    | `bun packages/cli/src/main.ts inspect capabilities`.                                    |
| `toolchain`        | Print OS package-manager setup commands for OAL-friendly tools.                      | `--os`, `--pkg`, `--optional`, `--json`.                                                            | `bun run toolchain -- --os macos --optional ctx7,anthropic-docs,opencode-docs`.         |
| `features`         | Print optional feature install or removal commands.                                  | `--install`, `--remove`.                                                                            | `bun run features -- --install ctx7,anthropic-docs,opencode-docs`.                      |
| `mcp`              | Run OAL-owned MCP servers over stdio.                                                | `serve anthropic-docs`, `serve opencode-docs`, `serve oal-inspect`.                                 | `bun packages/cli/src/main.ts mcp serve oal-inspect`.                                   |
| `rtk-gain`         | Check RTK token-savings policy.                                                      | `--from-file`, `--allow-empty-history`.                                                             | `bun run rtk-gain -- --allow-empty-history`.                                            |
| `codex-usage`      | Inspect local Codex state for weekly quota-drain patterns.                           | `--home`, `--db`, `--project`, `--limit`, `--json`.                                                 | `bun packages/cli/src/main.ts codex-usage --project "$PWD"`.                            |
| `roadmap-evidence` | Print the acceptance evidence ledger.                                                | None.                                                                                               | `bun run roadmap:evidence`.                                                             |
| `accept`           | Run full product acceptance over source, rendering, deploy, uninstall, and fixtures. | None.                                                                                               | `bun run accept`.                                                                       |

Providers accepted by provider-aware commands are `all`, `codex`, `claude`, `opencode`, or a comma-separated set such as `codex,opencode`. `uninstall` requires one provider, not `all`.

Profiles live in `~/.openagentlayer/config.json` by default. They preserve provider order, scope, target/home paths, model plans, optional tools, and setup toggles:

```bash
bun run profiles -- save work --scope global --provider opencode,codex --optional ctx7,opencode-docs --activate
bun run state -- inspect --profile work
bun run setup -- --profile work --dry-run
```

## Interactive CLI

OAL uses Commander for option parsing and Clack for simple terminal prompts. Run without a command in a TTY, or call `interactive` explicitly:

```bash
bun packages/cli/src/main.ts
bun packages/cli/src/main.ts interactive
```

Interactive mode supports setup, profile saving, state inspection, preview, deploy, plugin sync, uninstall, and check. Setup is a high-level wrapper over the same low-level `setup` command used by scripts. Provider prompts use multiselect where commands can act on multiple providers. Global deploy auto-detects the home directory and only asks when you override it. Non-interactive commands remain script-safe and print help instead of prompting when stdin is not a TTY.

Optional features are explicit add/remove commands on top of OAL:

```bash
bun run features -- --install ctx7,playwright,anthropic-docs,opencode-docs
bun run features -- --remove playwright,anthropic-docs,opencode-docs
```

Feature labels use `[CLI]` for command-line setup and `[MCP]` for provider MCP configuration. `anthropic-docs` and `opencode-docs` are normal OAL-owned MCP servers registered with provider MCP commands and served by `oal mcp serve`.

Copy commands from fenced `bash` blocks. Do not paste Markdown list bullets.

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

### Deploy globally

```bash
bun run deploy -- --scope global --provider all --dry-run
bun run deploy -- --scope global --provider all
```

Global deploy writes provider-native config under your provider homes and records global ownership under `.openagentlayer/manifest/global/`.

### Sync provider plugins into your home directory

```bash
bun run plugins -- --home "$HOME" --provider all --dry-run
bun run plugins -- --home "$HOME" --provider all
```

### Remove OAL from a project or provider home

```bash
bun run uninstall -- --target /path/to/project --scope project --provider codex
bun run uninstall -- --target /path/to/project --scope project --provider claude
bun run uninstall -- --target /path/to/project --scope project --provider opencode
bun run uninstall -- --scope global --provider codex
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

| Path                 | Responsibility                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `source/`            | Authored OAL source records, prompt templates, skills, routes, hooks, tools, and provider inputs.  |
| `docs/`              | Indexed user-facing operation docs for install, CLI, provider setup, validation, and release.      |
| `specs/`             | Indexed product, provider, runtime, acceptance, and reference-evidence contracts for implementers. |
| `packages/source`    | Source loading and record validation.                                                              |
| `packages/policy`    | Product policy validation, model allowlists, and generated text checks.                            |
| `packages/adapter`   | Provider-native rendering for Claude Code, Codex, and OpenCode.                                    |
| `packages/deploy`    | Deploy planning, merging, backup, and uninstall behavior.                                          |
| `packages/manifest`  | OAL ownership metadata.                                                                            |
| `packages/runtime`   | Executable `.mjs` hooks and runtime helpers.                                                       |
| `packages/accept`    | Full product acceptance gates.                                                                     |
| `packages/cli`       | User-facing command entrypoint.                                                                    |
| `packages/toolchain` | OS toolchain setup plan rendering.                                                                 |
| `plugins/`           | Provider plugin metadata and sync roots, not duplicated generated content.                         |

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
