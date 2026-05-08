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

Agent use:

- Prefer provider-native subagent or agent launch when the active provider exposes it.
- Default Codex CLI sessions use `oal codex peer batch <task>`, `oal opendex`, `opendex`, or Symphony workflow commands for bounded OpenDex/Symphony orchestration.
- Codex CLI sessions with the native subagent surface explicitly enabled spawn rendered OAL custom agents by name, wait for their results, and merge only final summaries, diff evidence, and validation results.
- `oal codex peer batch` creates a `.openagentlayer/codex-peer/<run-id>/` handoff directory with orchestrator, validate, worker, and review passes.

Source-to-artifact chain must be complete for new behavior: source record, renderer, deploy ownership, acceptance check.
