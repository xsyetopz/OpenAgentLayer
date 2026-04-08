# Install (full)

The root installer supports multiple systems in one run and generates platform artifacts deterministically from `source/`.

## Install

```bash
./install.sh --claude --opencode
./install.sh --codex
./install.sh --copilot
./install.sh --all
```

If no system flags are passed, the installer prompts for each system as a toggle.

## Playwright CLI (optional)

Installs Playwright CLI for browser automation (screenshots, traces, DOM snapshots) during debugging:

```bash
./install.sh --playwright-cli
./install.sh --no-playwright-cli
```

On project-scoped installs, the installer can also run `playwright-cli install --skills` in the current repo.

## Claude options

```bash
./install.sh --claude --claude-tier 20x
./install.sh --claude --skip-rtk
```

Claude installs:

- the `xsyetopz@openagentsbtw` plugin
- user-level hooks and output style under `~/.claude/`
- optional RTK setup via `rtk init -g`

## OpenCode options

```bash
./install.sh --opencode --opencode-default-model opencode/gpt-5-nano
./install.sh --opencode --opencode-model build=github-copilot/gpt-5-mini
./install.sh --opencode --opencode-model plan=opencode/qwen3.6-plus-free
```

OpenCode install also:

- writes a managed instruction file under `.opencode/instructions/` or `~/.config/opencode/instructions/`
- merges that file into the documented `instructions` array in `opencode.json`
- installs a generated runtime plugin and git hooks (when supported by your chosen OpenCode surfaces)

## Codex

```bash
./install.sh --codex --codex-tier plus
./install.sh --codex --codex-tier pro
./install.sh --codex --skip-rtk
```

Codex installation:

- copies the local plugin package into `~/.codex/plugins/openagentsbtw`
- registers the plugin in `~/.agents/plugins/marketplace.json`
- installs custom agents into `~/.codex/agents/`
- installs and merges hook config into `~/.codex/hooks.json`
- appends managed guidance to `~/.codex/AGENTS.md`
- appends managed profiles (tier-dependent) to `~/.codex/config.toml`

If RTK is enabled during Codex install, the installer also runs `rtk init -g --codex`.

Codex preset summary:

- `plus`: `gpt-5.3-codex` preset for code-specialized daily work and implementation-heavy sessions
- `pro`: default high-reasoning preset using `gpt-5.2` for the main interactive session and the planning/review orchestration route
- `openagentsbtw-codex-mini`: optional lightweight profile using `gpt-5.3-codex-spark` with low reasoning/verbosity

Installed Codex helper command (after install):

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

```bash
git pull
./install.sh --claude --codex --opencode --copilot
```

Re-running `install.sh` is the supported way to pick up additions/removals in generated assets.

## Uninstall

```bash
./uninstall.sh --claude
./uninstall.sh --opencode --codex
./uninstall.sh --all
```

