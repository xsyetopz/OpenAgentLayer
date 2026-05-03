# OAL surfaces

OAL owns authored source records and renders provider-native artifacts.

Source inputs:

- `source/product.json`
- `source/agents/*.json`
- `source/routes/*.json`
- `source/skills/*.json`
- `source/hooks/*.json`
- `source/tools/*.json`
- provider renderers in `packages/adapter/src`
- deploy and manifest logic in `packages/deploy` and `packages/manifest`

Artifact outputs:

- Codex: `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`, hooks, shims, skills
- Claude Code: `CLAUDE.md`, `.claude/agents/*.md`, commands, hooks, skills, settings
- OpenCode: `opencode.jsonc`, `.opencode/agents/*.md`, commands, plugin, tools, hooks, skills

Source-to-artifact chain must be complete for new behavior: source record, renderer, deploy ownership, acceptance check.
