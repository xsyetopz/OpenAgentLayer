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
- OpenCode runtime guardrails live in generated plugins using documented plugin events such as `chat.message`, `command.execute.before`, `tool.execute.before`, `tool.execute.after`, `experimental.session.compacting`, and `experimental.text.complete`.
- OpenCode continuity is native-first: use `opencode --continue`, `/sessions`, `/compact`, and `task_id` reuse before any explicit handoff/export flow.
- openagentsbtw no longer disables OpenCode's native `plan`, `explore`, or `general` agents by default; the Greek-role agents are additive.
- OpenCode repo hygiene stays in generated git hooks for `pre-commit` and `pre-push`.
- OpenCode agent prompts are generated as plain markdown sections with no XML-style prompt tags.
- External docs flow uses `ctx7` CLI guidance when available; openagentsbtw does not install a managed Context7 MCP block for OpenCode.
