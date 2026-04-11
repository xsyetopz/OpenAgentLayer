# openagentsbtw

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

7 agents, 16 skills, and 10 safety hooks for Claude Code, Codex CLI, OpenCode, and GitHub Copilot -- generated from a single canonical source.

Edit once in `source/`. Run the generator. Get deterministic, platform-correct artifacts for all four targets. No duplicate files to maintain.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 24.14.1 LTS
- [Bun](https://bun.sh/) (build/test toolchain)
- Git

## Architecture

```
source/                          Canonical definitions
  agents.json                    7 agents (athena, hephaestus, nemesis, atalanta, calliope, hermes, odysseus)
  skills.json                    16 skills (review, test, desloppify, explore, ...)
  hook-policies.json             10 hook policies (pre-bash guard, post-write scan, ...)
  agent-prompts.mjs              Prompt templates
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

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/xsyetopz/openagentsbtw.git
cd openagentsbtw
```

### 2. Pick your plan

Each platform has plan presets that control which models route to which agents. Pick the plan that matches your subscription tier.

**Claude Code:**

| Plan    | Flag                  | Subscription | What you get                                                            |
| ------- | --------------------- | ------------ | ----------------------------------------------------------------------- |
| `plus`  | `--claude-plan plus`  | Claude Plus  | Sonnet-only. Budget-conscious, no Opus routing.                         |
| `max5`  | `--claude-plan max5`  | Claude Pro   | **Default.** Opus for planning/review, Sonnet for implementation.       |
| `max20` | `--claude-plan max20` | Claude Max   | Full Opus orchestration, Sonnet for lightweight tasks, max parallelism. |

**Codex CLI:**

| Plan     | Flag                  | Subscription        | What you get                                                           |
| -------- | --------------------- | ------------------- | ---------------------------------------------------------------------- |
| `go`     | `--codex-plan go`     | Codex (free/budget) | Mini-only. Cheapest option.                                            |
| `plus`   | `--codex-plan plus`   | Codex Plus          | Codex model for main work, Mini for utility.                           |
| `pro-5`  | `--codex-plan pro-5`  | Codex Pro           | **Default.** GPT-5.2 planning, Codex implementation, Spark utility.    |
| `pro-20` | `--codex-plan pro-20` | Codex Pro           | Same models as pro-5, stronger reasoning and more aggressive swarming. |

**GitHub Copilot:**

| Plan       | Flag                      | What you get                                                   |
| ---------- | ------------------------- | -------------------------------------------------------------- |
| `pro`      | `--copilot-plan pro`      | **Default.** GPT-5.2 for planning/review, Mini for build/test. |
| `pro-plus` | `--copilot-plan pro-plus` | Codex for build/implement, heavier parallelism.                |

**OpenCode:** No preset plans. Uses `--opencode-default-model <MODEL>` or per-role overrides with `--opencode-model <ROLE>=<MODEL>`.

### 3. Install

Install with your plan:

```bash
./install.sh --claude --claude-plan max5
./install.sh --codex --codex-plan plus
./install.sh --copilot --copilot-plan pro
./install.sh --all --caveman-mode full
./install.sh --opencode
```

Or install everything at once:

```bash
./install.sh --all
```

Or run with no flags for interactive prompts that walk you through each choice:

```bash
./install.sh
```

PowerShell works the same way: `./install.ps1 --claude --claude-plan max5`.

### 4. Change your plan later

No need to reinstall. Use `config.sh`:

```bash
./config.sh --claude-plan max20
./config.sh --codex-plan pro-5
./config.sh --copilot-plan pro-plus
./config.sh --caveman-mode off
```

## Shared Surfaces

Optional tools available across all four platforms:

| Surface            | What it does                                                                 | Install flag           |
| ------------------ | ---------------------------------------------------------------------------- | ---------------------- |
| **ctx7**           | CLI for external library/API doc lookups ([Context7](https://context7.com/)) | `--ctx7-cli`           |
| **RTK**            | Rewrites dangerous shell commands to safer equivalents                       | `--rtk` / `--skip-rtk` |
| **Playwright CLI** | Browser automation (screenshots, traces, DOM snapshots)                      | `--playwright-cli`     |
| **DeepWiki MCP**   | Indexed exploration of public GitHub repos                                   | `--deepwiki`           |

Configure these post-install with `./config.sh --ctx7`, `./config.sh --deepwiki`, etc.
Managed Caveman defaults are shared through `./config.sh --caveman-mode <off|lite|full|ultra|wenyan-lite|wenyan|wenyan-ultra>`.

## Update / Uninstall

```bash
git pull && ./install.sh --all          # update
./uninstall.sh --all                    # remove everything
./uninstall.sh --claude --codex         # remove specific platforms
```

## Docs

| Doc                        | Contents                                                          |
| -------------------------- | ----------------------------------------------------------------- |
| `docs/install.md`          | Full installer flags, per-platform options, model routing details |
| `docs/openai/README.md`    | Codex research: models, hooks, porting decisions                  |
| `docs/opencode/README.md`  | OpenCode rules and plugin integration                             |
| `docs/method/nano-bmad.md` | Nano BMAD workflow (Research > Plan > Execute > Review > Ship)    |
| `CONTRIBUTING.md`          | Development setup, workflow, contribution rules                   |
| `CHANGELOG.md`             | Release history                                                   |

## Installer/generator decomposition

- `install.sh` is a thin Bash compatibility wrapper over `scripts/install/cli.mjs`
- `config.sh` is a thin Bash compatibility wrapper over `scripts/install/config-cli.mjs`
- `uninstall.sh` is a thin Bash compatibility wrapper over `scripts/install/uninstall-cli.mjs`
- `build-plugin.sh` is a thin Bash compatibility wrapper over `scripts/build-plugin-cli.mjs`
- PowerShell wrappers (`install.ps1`, `config.ps1`, `uninstall.ps1`, `build-plugin.ps1`) delegate to the same Node CLIs
- `scripts/generate.mjs` orchestrates focused render modules under `scripts/generate/`

## Development

```bash
bun install --frozen-lockfile
bun run generate
bun test tests claude/tests codex/tests
cd opencode && bun install --frozen-lockfile && bun test && bun run typecheck
```

See `CONTRIBUTING.md` for the full contributor workflow.

## License

[MIT](LICENSE)
