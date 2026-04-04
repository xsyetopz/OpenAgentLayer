# openagentsbtw

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

`openagentsbtw` is the umbrella repo for three distinct agent systems:

- `claude/`: the existing Claude Code plugin package, now published as `openagentsbtw`
- `opencode/`: the imported OpenCode framework, installed from this repo instead of as a separate manual setup
- `codex/`: a Codex-native system with a plugin manifest, custom agents, hooks, templates, and research docs

Shared agent, skill, command, and hook-manifest content now lives in `source/`. The platform directories are generated outputs that should be regenerated after editing the shared source.

Each platform now also gets a generated hook mapping artifact from the shared policy source:

- Claude: `claude/hooks/HOOKS.md` and `claude/hooks/policy-map.json`
- Codex: `codex/hooks/HOOKS.md` and `codex/hooks/policy-map.json`
- OpenCode: `opencode/templates/hooks/HOOKS.md` and `opencode/templates/hooks/policy-map.json`

These files make supported versus unsupported shared hook policies explicit per platform instead of leaving non-portable policies implicit.

## Install

The root installer now supports multiple systems in one run.

```bash
./install.sh --claude --opencode
./install.sh --codex
./install.sh --all
```

If no system flags are passed, the installer prompts for each system as a toggle.

### MCP options

These flags apply to any selected systems (Claude, OpenCode, Codex):

```bash
./install.sh --chrome-devtools-mcp
./install.sh --no-chrome-devtools-mcp
./install.sh --browsermcp
./install.sh --no-browsermcp
```

If you run `./install.sh` interactively without these flags, it prompts per MCP server as `keep/enable/disable` (default: `keep`).

### Claude options

```bash
./install.sh --claude --claude-tier 20x
./install.sh --claude --skip-rtk
```

Claude installs:

- the `xsyetopz@openagentsbtw` plugin
- user-level hooks and output style under `~/.claude/`
- optional RTK setup via `rtk init -g`

### OpenCode options

```bash
./install.sh --opencode --opencode-default-model opencode/gpt-5-nano
./install.sh --opencode --opencode-model build=github-copilot/gpt-5-mini
./install.sh --opencode --opencode-model plan=opencode/trinity-large-preview-free
```

OpenCode no longer injects the old Bailian defaults into your config. You can supply one default model for all roles or per-role overrides.

OpenCode install also:

- writes a managed instruction file under `.opencode/instructions/` or `~/.config/opencode/instructions/`
- merges that file into the documented `instructions` array in `opencode.json`
- installs a generated runtime plugin plus generated `pre-commit` and `pre-push` hooks

### Codex

```bash
./install.sh --codex --codex-tier plus
./install.sh --codex --codex-tier pro
./install.sh --codex --skip-rtk
```

Codex installation now does the following:

- copies the local plugin package into `~/.codex/plugins/openagentsbtw`
- registers the plugin in `~/.agents/plugins/marketplace.json`
- installs custom agents into `~/.codex/agents/`
- installs and merges openagentsbtw hook config into `~/.codex/hooks.json`
- appends managed openagentsbtw guidance to `~/.codex/AGENTS.md`
- appends managed `openagentsbtw-plus`, `openagentsbtw-pro`, `openagentsbtw-codex-mini`, and selected `openagentsbtw` profiles to `~/.codex/config.toml`

The Codex research and design notes live in `docs/openai/`.

If RTK is enabled during Codex install, the installer also runs `rtk init -g --codex`.

Codex preset summary:

- `plus`: `gpt-5.3-codex` preset for code-specialized daily work and implementation-heavy sessions
- `pro`: default high-reasoning preset using `gpt-5.2` for the main interactive session and the planning/review orchestration route
- `openagentsbtw-codex-mini`: optional lightweight profile for narrow, high-volume work using `gpt-5.3-codex-spark` with low reasoning/verbosity

Installed Codex helper command:

- `~/.codex/openagentsbtw/bin/openagentsbtw-codex docs ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex explore ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex trace ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex debug ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex deepwiki ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex desloppify ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex test ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex plan ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex implement ...`
- `~/.codex/openagentsbtw/bin/openagentsbtw-codex review ...`

## Updating

Short version:

```bash
git pull
./install.sh --claude --codex
```

Pick only the systems you use.

What this refreshes:

- plugin files
- generated skills
- agents
- hooks
- wrapper commands
- managed config blocks

Important:

- Codex does not currently have a first-class plugin update command in this repo flow. Re-run the installer to get additions, removals, and changed generated assets.
- Claude may auto-refresh some plugin state, but the supported path here is still: update the repo, then re-run `install.sh`.
- If a release removes files, the reinstall step is what cleans up the synced plugin payloads and scripts.

## Layout

```text
claude/     Claude Code plugin package, hooks, skills, tests
opencode/   OpenCode framework source and templates
codex/      Codex-native plugin, agents, hooks, templates
docs/       Research notes, including docs/openai/ and docs/opencode/
bin/        Shared helper scripts
source/     Shared source-of-truth for prompt schemas, skills, commands, hook policies, and guidance assets
scripts/    Source bootstrap and generation tooling
```

## Development

Contributor workflow details live in `CONTRIBUTING.md`.

```bash
bun install --frozen-lockfile
bun run generate
bun run check:generated
bun run test
cd opencode && bun install --frozen-lockfile && bun run test && bun run typecheck
./build-plugin.sh
```

`bun run bootstrap:source` is now a no-op reminder: `source/` is the canonical layer, so edit `source/` directly and regenerate outputs.

Build output for the Claude plugin lands in `dist/openagentsbtw-claude-plugin/`.

## Uninstall

```bash
./uninstall.sh --claude
./uninstall.sh --opencode --codex
./uninstall.sh --all
```

## License

[MIT](LICENSE)
