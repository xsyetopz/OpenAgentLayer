# Install Reference

For quickstart and plan selection, see the [README](../README.md). This doc covers all flags and platform-specific details.

## Install Flags

### System Flags

```bash
./install.sh --claude              # Claude Code only
./install.sh --codex               # Codex CLI only
./install.sh --opencode            # OpenCode only
./install.sh --copilot             # GitHub Copilot only
./install.sh --all                 # All four
./install.sh                       # Interactive (prompts for each)
```

PowerShell: `./install.ps1` accepts the same flags.

### Plan Flags

```bash
./install.sh --claude-plan <plus|max5|max20>
./install.sh --codex-plan <go|plus|pro-5|pro-20>
./install.sh --copilot-plan <pro|pro-plus>
./install.sh --caveman-mode <off|lite|full|ultra|wenyan-lite|wenyan|wenyan-ultra>
./install.sh --opencode-default-model <MODEL_ID>
./install.sh --opencode-model <ROLE>=<MODEL_ID>
```

Claude aliases: `5x` and `pro-5` map to `max5`, `20x` and `pro-20` map to `max20`. Codex alias: `pro` maps to `pro-5`.

### Scope Flags

```bash
./install.sh --opencode-scope <global|project>
./install.sh --copilot-scope <global|project|both>
```

### Optional Surface Flags

```bash
./install.sh --ctx7-cli / --no-ctx7-cli
./install.sh --deepwiki-mcp / --no-deepwiki-mcp
./install.sh --playwright-cli / --no-playwright-cli
./install.sh --skip-rtk
```

## Interactive Mode

Running `./install.sh` with no flags prompts for each choice:

1. **System selection** -- install Claude? Codex? OpenCode? Copilot? (all default yes)
2. **Plan selection** -- per-platform plan preset (defaults to `max5` / `pro-5` / `pro`)
3. **Optional surfaces** -- Context7 CLI (default yes), DeepWiki MCP (default no), Playwright CLI (default no)

Selections are saved to `~/.config/openagentsbtw/config.env` and reused on future installs.

In CI mode (`CI=true`), all prompts are skipped; defaults or env vars are used.

## Shared cross-platform surfaces

openagentsbtw treats the following as shared surfaces across Claude, Codex, OpenCode, and Copilot:

- `ctx7` CLI for external docs lookup workflows
- RTK enforcement for rewritable shell commands when policy is active
- Playwright CLI for browser-automation workflows
- DeepWiki MCP plus explicit `deepwiki` exploration routing

## Claude

Installs the `xsyetopz@openagentsbtw` plugin, user-level hooks, and output style under `~/.claude/`.

```bash
./install.sh --claude --claude-plan max5
./install.sh --claude --skip-rtk
```

### Claude Plan Details

| Plan    | Default Model    | Opus Slot     | Sonnet Slot | Haiku Slot | Swarm Threads |
| ------- | ---------------- | ------------- | ----------- | ---------- | ------------- |
| `plus`  | Sonnet 4.6       | Sonnet 4.6    | Sonnet 4.6  | Haiku 4.5  | 3             |
| `max5`  | Opus (plan mode) | Opus 4.6 (1M) | Sonnet 4.6  | Haiku 4.5  | 5             |
| `max20` | Opus (1M)        | Opus 4.6 (1M) | Sonnet 4.6  | Sonnet 4.6 | 6             |

- **plus**: Sonnet-only. No Opus routing. Keep payloads narrow.
- **max5**: Default. Opus for planning/review, Sonnet for implementation. Balanced.
- **max20**: Full Opus orchestration. Sonnet replaces Haiku for lightweight tasks. Quality-first.

Context windows: Opus agents get 1M context. Sonnet and Haiku agents get 200K.

## Codex

Installs the plugin into `~/.codex/plugins/openagentsbtw`, custom agents into `~/.codex/agents/`, and merges hooks into `~/.codex/hooks.json`.

```bash
./install.sh --codex --codex-plan pro-5
./install.sh --codex --skip-rtk
```

### Codex Plan Details

| Plan     | Main Model    | Utility Model       | Spark (Pro-only) | Swarm Threads |
| -------- | ------------- | ------------------- | ---------------- | ------------- |
| `go`     | gpt-5.4-mini  | gpt-5.4-mini        | No               | 3             |
| `plus`   | gpt-5.3-codex | gpt-5.4-mini        | No               | 4             |
| `pro-5`  | gpt-5.2       | gpt-5.3-codex-spark | Yes              | 5             |
| `pro-20` | gpt-5.2       | gpt-5.3-codex-spark | Yes              | 6             |

Agent routing on `pro-5`:
- Athena, Nemesis, Odysseus: gpt-5.2 (xhigh reasoning)
- Hephaestus: gpt-5.3-codex (high reasoning)
- Hermes, Atalanta, Calliope: gpt-5.3-codex-spark (medium, Pro-only; falls back to mini on non-Pro plans)

### Codex Profiles

Each plan installs these profiles into `~/.codex/config.toml`:

- `openagentsbtw-<plan>` -- main route
- `openagentsbtw-codex-mini` -- lightweight tasks
- `openagentsbtw-accept-edits` -- sandboxed auto-approval
- `openagentsbtw-longrun` -- patient builds/tests with `unified_exec` and higher timeout

### Codex Helper Commands

Available on PATH after install:

| Command                     | Purpose                       |
| --------------------------- | ----------------------------- |
| `oabtw-codex plan`          | Plan phase                    |
| `oabtw-codex implement`     | Implementation phase          |
| `oabtw-codex review`        | Review phase                  |
| `oabtw-codex test`          | Test phase                    |
| `oabtw-codex explore`       | Codebase exploration          |
| `oabtw-codex docs`          | Documentation lookup          |
| `oabtw-codex trace`         | Execution tracing             |
| `oabtw-codex debug`         | Debugging                     |
| `oabtw-codex qa`            | Quality assurance             |
| `oabtw-codex deepwiki`      | DeepWiki exploration          |
| `oabtw-codex desloppify`    | AI slop detection and cleanup |
| `oabtw-codex longrun`       | Long-running tasks            |
| `oabtw-codex resume --last` | Resume last session           |
| `oabtw-codex-peer batch`    | Multi-worker batch            |
| `oabtw-codex-peer tmux`     | Multi-worker tmux             |

Direct fallback path: `~/.codex/openagentsbtw/bin/openagentsbtw-codex ...`

### Codex Continuity Defaults

Installs write these into the managed `~/.codex/config.toml` block:

- `sqlite_home = "~/.codex/openagentsbtw/sqlite"`
- Cross-session `history` enabled
- `memories` enabled with MCP/web-search pollution protection
- Production-shaped `compact_prompt`
- `hide_agent_reasoning = true`
- `tool_output_token_limit = 12000`

## OpenCode

Writes managed instruction files and merges into `opencode.json`.

```bash
./install.sh --opencode
./install.sh --opencode --opencode-default-model opencode/gpt-5-nano
./install.sh --opencode --opencode-model build=github-copilot/gpt-5-mini
./install.sh --opencode --opencode-model plan=opencode/qwen3.6-plus-free
```

No preset plans. Model selection is per-role or a single default for all roles. Supported roles: `build`, `plan`, `explore`, `review`, `implement`, `document`, `test`.

If blank, auto-detects available models.

## Copilot

Writes platform assets to project scope (`.github/`) or global scope (`~/.copilot/`).

```bash
./install.sh --copilot
./install.sh --copilot --copilot-plan pro-plus
./install.sh --copilot --copilot-scope both
```

### Copilot Plan Details

| Plan       | Plan/Review Model | Build/Test Model | Implement Model | Swarm Threads |
| ---------- | ----------------- | ---------------- | --------------- | ------------- |
| `pro`      | gpt-5.2           | gpt-5-mini       | gpt-5.2         | 3             |
| `pro-plus` | gpt-5.2           | gpt-5.3-codex    | gpt-5.3-codex   | 5             |

### Copilot Install Locations

Project scope: `.github/agents`, `.github/skills`, `.github/prompts`, `.github/hooks`, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`

Global scope: `~/.copilot/agents`, `~/.copilot/skills`, `~/.copilot/hooks`, `~/.copilot/copilot-instructions.md`, `~/.copilot/instructions/*.instructions.md`

### Copilot Continuity

Use native session surfaces: `copilot --continue`, `copilot --resume`, `/resume`, `/instructions`, `/fleet`.

## RTK Enforcement

Active when both conditions are true:

1. `rtk` is installed and on PATH
2. `RTK.md` policy file exists in:
   - Repo tree ancestry (nearest file wins), or
   - `~/.config/openagentsbtw/RTK.md` (Unix) / `%APPDATA%\openagentsbtw\RTK.md` (Windows)
   - Legacy fallback: `~/.codex/RTK.md`, `~/.claude/RTK.md`

Behavior per platform:
- **Claude**: hooks auto-rewrite to the RTK command
- **Codex, OpenCode, Copilot**: block the raw command, show the RTK replacement
- Commands already prefixed with `rtk` pass through
- Commands RTK cannot rewrite are not blocked

## Context7 CLI

```bash
./install.sh --ctx7-cli
./install.sh --no-ctx7-cli
```

- CLI-only in openagentsbtw; no managed Context7 MCP block
- API keys stored in `~/.config/openagentsbtw/config.env`
- Managed wrappers: `~/.local/bin/ctx7` (Unix), `%APPDATA%\openagentsbtw\bin\ctx7.ps1` + `ctx7.cmd` (Windows)

## Post-Install Configuration

Update without re-running full setup:

```bash
./config.sh --claude-plan max20
./config.sh --codex-plan plus
./config.sh --copilot-plan pro-plus
./config.sh --caveman-mode off
./config.sh --ctx7 / --no-ctx7
./config.sh --ctx7-api-key
./config.sh --deepwiki / --no-deepwiki
./config.sh --rtk / --no-rtk
```

PowerShell: `./config.ps1` accepts the same flags.

Notes:
- `--deepwiki` / `--no-deepwiki` updates installed Claude, Codex, OpenCode, and Copilot DeepWiki config surfaces in place.
- `--rtk` ensures the RTK binary is installed and writes the managed global RTK policy. `--no-rtk` removes only the managed global `RTK.md`; it does not uninstall RTK.

## Installer/generator decomposition

openagentsbtw keeps install-time and generation-time responsibilities separate:

- `install.sh` is a thin Bash wrapper over `scripts/install/cli.mjs`
- `config.sh` is a thin Bash wrapper over `scripts/install/config-cli.mjs`
- `uninstall.sh` is a thin Bash wrapper over `scripts/install/uninstall-cli.mjs`
- `build-plugin.sh` is a thin Bash wrapper over `scripts/build-plugin-cli.mjs`
- `install.ps1`, `config.ps1`, `uninstall.ps1`, and `build-plugin.ps1` are first-class PowerShell wrappers over the same shared Node CLIs
- `scripts/build.mjs` stages build output
- `scripts/generate.mjs` orchestrates smaller render modules under `scripts/generate/`

## Update

```bash
git pull
./install.sh --claude --codex --opencode --copilot
```

Re-running `install.sh` picks up additions/removals in generated assets.

## Uninstall

```bash
./uninstall.sh --all
./uninstall.sh --claude
./uninstall.sh --opencode --codex
```

```powershell
./uninstall.ps1 --all
```
