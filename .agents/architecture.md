# OpenAgentLayer agent architecture

OAL agents are authored in `source/agents/*.json` and rendered into provider
artifacts. Agent records define role, routes, model defaults, and skill access.

## Boundaries

- `source/agents/*.json` owns agent identity and provider-agnostic role data.
- `source/routes/*.json` owns route semantics, permissions, and validation intent.
- `source/skills/*.json` plus `source/skill-resources/**` owns reusable workflow
  instructions.
- Provider renderers in `packages/adapter/src` translate those records into
  Codex, Claude Code, and OpenCode artifacts.

## Codex orchestration

Codex uses native rendered OAL agents from `.codex/config.toml` and
`.codex/agents/*.toml`. Parent sessions split broad work by owner, launch
bounded subagents, and merge final evidence.

## Change rule

Update authored `source/**` records or renderer code first, then regenerate and
validate provider artifacts.
