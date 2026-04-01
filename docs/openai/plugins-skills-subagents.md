# Plugins, Skills, And Subagents

Codex has separate native surfaces for plugins, skills, custom agents, `AGENTS.md`, hooks, and config. openagentsbtw uses each surface for what it can actually enforce, rather than pretending the plugin layer controls everything. Sources: <https://developers.openai.com/codex/plugins>, <https://developers.openai.com/codex/skills>, <https://developers.openai.com/codex/subagents>, <https://developers.openai.com/codex/guides/agents-md>, <https://developers.openai.com/codex/config-reference>

## Plugins

The Codex plugin manifest lives at `.codex-plugin/plugin.json`. Marketplaces live in `.agents/plugins/marketplace.json` at repo scope or `~/.agents/plugins/marketplace.json` at user scope. openagentsbtw ships:

- a repo-local marketplace file at `.agents/plugins/marketplace.json`
- a Codex plugin payload at `codex/plugin/openagentsbtw/`
- an installer step that registers the plugin in the user marketplace as a local plugin

We intentionally keep the plugin source under `codex/plugin/openagentsbtw` inside this repo rather than pretending Codex uses the Claude marketplace format.

The plugin layer packages and distributes reusable assets. It does not guarantee role routing, force a custom agent for `/plan`, or enable hooks by itself.

## Skills

Codex skills live in `.agents/skills` for repo scope and `~/.agents/skills` for user scope. openagentsbtw’s Codex plugin bundles the shared skill set under `codex/plugin/openagentsbtw/skills/`, including the `openagentsbtw` orchestration skill and optional `openai.yaml` metadata where we want better discoverability. Source: <https://developers.openai.com/codex/skills>

Skills are reusable workflows. They help Codex discover and apply repeated patterns, but they are still one layer in the stack rather than the whole system.

## Custom Agents

Codex custom agents live in `.codex/agents` for project scope and `~/.codex/agents` for user scope. openagentsbtw installs seven agent TOML files into `~/.codex/agents/`:

- `athena`
- `hephaestus`
- `nemesis`
- `atalanta`
- `calliope`
- `hermes`
- `odysseus`

These are the Codex-native replacement for the old Claude agent markdown manifests. Source: <https://developers.openai.com/codex/subagents>

## AGENTS.md

Codex applies the closest `AGENTS.md`, then parent `AGENTS.md` files up to the repo root, then the home-level file. openagentsbtw therefore installs guidance into `~/.codex/AGENTS.md` and ships a project template in `codex/templates/AGENTS.md`. We do not rely on `CLAUDE.md` symlinks for Codex. Source: <https://developers.openai.com/codex/guides/agents-md>

This is the main style and behavior-shaping layer for the CCA-like response contract.

## Hooks And Config

Hooks are enabled by config, not by the plugin manifest alone. openagentsbtw merges supported hook definitions into `~/.codex/hooks.json`, turns on `codex_hooks = true` in the managed profiles, and keeps the unsupported policy map explicit in `codex/hooks/`.

Config is also where Codex-native defaults live: profile selection, `commit_attribution`, reasoning effort, Fast mode policy, and optional MCP servers such as DeepWiki.

The Codex memory feature follows that same split. Native Codex SQLite/session persistence remains the runtime base, while openagentsbtw stores project-level recall in its own SQLite DB under `~/.codex/openagentsbtw/state/memory.sqlite` and surfaces it through the supported hook events.

## Wrapper Routing

`openagentsbtw-codex <mode> ...` is the supported routing layer for mode-specific CLI flows. The wrapper selects the managed profile, adds per-mode model overrides where needed, and supplies a strong role-shaped prompt for plan, accept-edits, implement, review, orchestration, docs, cleanup, handoff, bounded validation, and the explicit `deepwiki` exploration path.

Wrappers also auto-attach the plugin by prepending `$openagentsbtw` to the prompt when the plugin is installed under `~/.codex/plugins/openagentsbtw`. This is the most reliable way we can make “plugin usage” automatic in Codex today.

The wrapper also exposes `memory show`, `memory forget-project`, and `memory prune` so users can inspect or clear the openagentsbtw memory layer without touching SQLite directly.

`deepwiki` is intentionally explicit instead of silently changing `triage`. It depends on an opt-in `mcp_servers.deepwiki` config block and is meant for GitHub repo exploration, not as a universal replacement for local repo reads.

That wrapper contract is more reliable than implying the plugin can hard-bind native `/plan` or `/review` to a custom agent. Native `/plan` remains useful, but it is documented as a reasoning mode, not as an agent selector.

We also support `oabtw-codex` as a short alias for the same wrapper behavior. The alias is human-facing only; plugin IDs, marketplace keys, and profile names remain `openagentsbtw`.

## Local Observation

In the currently installed Codex CLI on this machine, `codex --help` exposes `mcp`, `review`, and other top-level commands, but there is no documented `codex plugins` or `codex skills` subcommand in the local help output. That is a local observation, not an official OpenAI guarantee. It is the reason the installer uses file-based marketplace and agent installation rather than assuming a plugin-install CLI verb.
