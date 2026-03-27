# OpenCode Research

This directory documents the OpenCode-specific side of the shared openagentsbtw framework. It was researched against the OpenCode docs on 2026-03-27.

## What Lives Here

- `rules-and-plugins.md` explains the documented OpenCode surfaces we use for project guidance, runtime guardrails, and repo hygiene.

## Canonical Sources

- Rules: <https://opencode.ai/docs/rules>
- Agents: <https://opencode.ai/docs/agents>
- Permissions: <https://opencode.ai/docs/permissions>
- Plugins: <https://opencode.ai/docs/plugins>
- Config: <https://opencode.ai/docs/config>

## openagentsbtw Decisions

- OpenCode project guidance is installed as a managed instruction file and wired through `opencode.json` `instructions`.
- OpenCode runtime guardrails live in generated plugins using documented plugin events such as `tool.execute.before`.
- OpenCode repo hygiene stays in generated git hooks for `pre-commit` and `pre-push`.
- OpenCode agent prompts are generated as plain markdown sections with no XML-style prompt tags.
