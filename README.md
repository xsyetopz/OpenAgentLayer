# openagentsbtw

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

7 agents, 14 skills, and 10 safety hooks for Claude Code, Codex CLI, OpenCode, and GitHub Copilot -- generated from a single canonical source.

Edit once in `source/`. Run the generator. Get deterministic, platform-correct artifacts for all four targets. No duplicate files to maintain.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 24.14.1 LTS
- [Bun](https://bun.sh/) (build/test toolchain)
- Git

## Architecture

```
source/                          Canonical definitions
  agents.json                    7 agents (athena, hephaestus, nemesis, atalanta, calliope, hermes, odysseus)
  skills.json                    14 skills (review, test, desloppify, explore, ...)
  hook-policies.json             10 hook policies (pre-bash guard, post-write scan, ...)
  agent-prompts.mjs              Prompt templates
  project-guidance.mjs           Shared project guidance
  skills/*/body.md               Skill content
       |
       v
scripts/generate.mjs             Renders platform-specific artifacts
       |
       +---> claude/              Claude Code plugin + hooks + tests
       +---> codex/               Codex plugin + custom agents + research docs
       +---> opencode/            OpenCode integration + templates
       +---> copilot/             Copilot/VS Code assets + hook scripts
```

Each platform gets a generated hook support map showing what ports cleanly vs what's unsupported.

## Quickstart

Install one platform:

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

Install all (or run with no flags to get interactive prompts):

```bash
./install.sh --all
./install.sh
```

## Shared Surfaces

These tools are available across all four platforms when installed:

| Surface | What it does | Install flag |
|---------|-------------|--------------|
| **ctx7** | CLI for external library/API doc lookups ([Context7](https://context7.com/)) | `--ctx7-cli` / `--no-ctx7-cli` |
| **RTK** | Rewrites dangerous shell commands to safer equivalents | `--rtk` / `--skip-rtk` |
| **Playwright CLI** | Browser automation (screenshots, traces, DOM snapshots) | `--playwright-cli` |
| **DeepWiki MCP** | Indexed exploration of public GitHub repos | `--deepwiki` / `--no-deepwiki` |

RTK enforcement activates only when both `rtk` is on PATH and an `RTK.md` policy file exists (repo tree or `~/.config/openagentsbtw/RTK.md`).

## Post-Install Configuration

Update an existing install without re-running full setup:

```bash
./config.sh --ctx7
./config.sh --ctx7-api-key
./config.sh --deepwiki
./config.sh --rtk
./config.sh --claude-plan pro-20
./config.sh --codex-plan plus
```

```powershell
./config.ps1 --ctx7
./config.ps1 --deepwiki
./config.ps1 --rtk
```

## Update

```bash
git pull
./install.sh --claude --codex --opencode --copilot
```

## Uninstall

```bash
./uninstall.sh --all
```

```powershell
./uninstall.ps1 --all
```

Per-platform uninstall also works: `./uninstall.sh --claude --codex`.

## Platform Details

### Claude

Installs the `xsyetopz@openagentsbtw` plugin, user-level hooks, and output style under `~/.claude/`.

```bash
./install.sh --claude --claude-plan pro-20
./install.sh --claude --skip-rtk
```

### Codex

Installs the plugin into `~/.codex/plugins/openagentsbtw`, custom agents into `~/.codex/agents/`, and merges hooks into `~/.codex/hooks.json`.

```bash
./install.sh --codex --codex-plan plus
```

Plan presets: `go`, `plus`, `pro-5`, `pro-20`. See `docs/install.md` for model routing per preset.

Installed helper commands (available on PATH after install):

- `oabtw-codex qa` / `longrun` / `resume --last`
- `oabtw-codex plan` / `implement` / `review` / `test`
- `oabtw-codex explore` / `docs` / `trace` / `debug` / `deepwiki`
- `oabtw-codex-peer batch` / `tmux`

### OpenCode

Writes managed instruction files and merges into `opencode.json`.

```bash
./install.sh --opencode --opencode-default-model opencode/gpt-5-nano
```

### Copilot

Writes to `.github/` (project scope) or `~/.copilot/` (global scope): agents, skills, prompts, hooks, and instruction files.

```bash
./install.sh --copilot
```

## Installer Decomposition

No god script. Each shell wrapper delegates to a shared Node CLI:

| Wrapper | Delegates to |
|---------|-------------|
| `install.sh` / `install.ps1` | `scripts/install/cli.mjs` |
| `config.sh` / `config.ps1` | `scripts/install/config-cli.mjs` |
| `uninstall.sh` / `uninstall.ps1` | `scripts/install/uninstall-cli.mjs` |
| `build-plugin.sh` / `build-plugin.ps1` | `scripts/build-plugin-cli.mjs` |

Generation: `scripts/generate.mjs` orchestrates focused render modules under `scripts/generate/`.

## Generated Output Example

A generated agent definition (from `source/agents.json`):

```json
{
  "name": "hephaestus",
  "claude": {
    "displayName": "Hephaestus",
    "description": "Use for code implementation, bug fixes, and refactors once the plan is clear.",
    "model": "sonnet",
    "tools": ["Read", "Edit", "MultiEdit", "Write", "Grep", "Glob", "Bash"],
    "skills": ["cca:review", "cca:test", "cca:style"],
    "permissionMode": "acceptEdits",
    "maxTurns": 80
  },
  "codex": {
    "model": "gpt-5.3-codex",
    "reasoning": "high",
    "sandboxMode": "workspace-write"
  }
}
```

Same source, different platform artifacts. The generator handles the translation.

## Docs

| Doc | Contents |
|-----|----------|
| `docs/install.md` | Full installer flags, per-platform options, RTK details |
| `docs/openai/README.md` | Codex research: models, hooks, porting decisions |
| `docs/opencode/README.md` | OpenCode rules and plugin integration |
| `docs/method/nano-bmad.md` | Nano BMAD workflow (Research > Plan > Execute > Review > Ship) |
| `CONTRIBUTING.md` | Development setup, workflow, contribution rules |
| `AGENTS.md` | Agent operating instructions |
| `SECURITY.md` | Security policy and reporting |
| `CHANGELOG.md` | Release history |

## Development

```bash
bun install --frozen-lockfile
bun run generate
bun test tests claude/tests codex/tests
cd opencode && bun install --frozen-lockfile && bun test && bun run typecheck
node scripts/ci/install-smoke.mjs
./build-plugin.sh
```

Build output lands in `dist/openagentsbtw-claude-plugin/`. Tag releases publish a combined archive for all platforms.

## License

[MIT](LICENSE)
