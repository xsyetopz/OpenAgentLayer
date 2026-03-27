# Plugins, Skills, And Subagents

Codex has separate native surfaces for plugins, skills, and custom agents. openagentsbtw now uses all three where they make sense. Sources: <https://developers.openai.com/codex/plugins>, <https://developers.openai.com/codex/skills>, <https://developers.openai.com/codex/subagents>

## Plugins

The Codex plugin manifest lives at `.codex-plugin/plugin.json`. Marketplaces live in `.agents/plugins/marketplace.json` at repo scope or `~/.agents/plugins/marketplace.json` at user scope. openagentsbtw ships:

- a repo-local marketplace file at `.agents/plugins/marketplace.json`
- a Codex plugin payload at `codex/plugin/openagentsbtw/`
- an installer step that registers the plugin in the user marketplace as a local plugin

We intentionally keep the plugin source under `codex/plugin/openagentsbtw` inside this repo rather than pretending Codex uses the Claude marketplace format.

## Skills

Codex skills live in `.agents/skills` for repo scope and `~/.agents/skills` for user scope. openagentsbtw’s Codex plugin bundles the shared skill set under `codex/plugin/openagentsbtw/skills/`, including the new `openagentsbtw` orchestration skill. Source: <https://developers.openai.com/codex/skills>

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

## Local Observation

In the currently installed Codex CLI on this machine, `codex --help` exposes `mcp`, `review`, and other top-level commands, but there is no documented `codex plugins` or `codex skills` subcommand in the local help output. That is a local observation, not an official OpenAI guarantee. It is the reason the installer uses file-based marketplace and agent installation rather than assuming a plugin-install CLI verb.
