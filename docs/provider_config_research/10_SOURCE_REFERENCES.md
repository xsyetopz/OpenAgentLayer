# Source References

## Codex

- [Codex config schema](https://raw.githubusercontent.com/openai/codex/refs/heads/main/codex-rs/core/config.schema.json)
- [Codex config reference](https://developers.openai.com/codex/config-reference)
- [Codex hook discovery source](https://github.com/openai/codex/blob/main/codex-rs/hooks/src/engine/discovery.rs)
- [Codex AGENTS.md documentation](https://developers.openai.com/codex/agents-md)
- [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)

Key findings:

- Config supports profiles, agents, feature flags, approval/sandbox/model settings, hooks, tools, history, memories, apps/connectors.
- `on-failure` approval policy is deprecated in schema descriptions.
- `deprecated approval alias` is compatibility for approvals reviewer; use `auto_review`.
- Hook discovery supports command hooks; prompt/agent hook handler types are skipped in observed implementation.
- Observed hook events: PreToolUse, PermissionRequest, PostToolUse, SessionStart, UserPromptSubmit, Stop.

## Claude Code

- [Claude Code settings schema](https://www.schemastore.org/claude-code-settings.json)
- [Claude Code settings](https://code.claude.com/docs/en/settings)
- [Claude Code hooks](https://docs.claude.com/en/docs/claude-code/hooks)
- [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills)
- [Claude Code subagents](https://docs.claude.com/en/docs/claude-code/sub-agents)
- [Claude Code slash commands](https://docs.claude.com/en/docs/claude-code/slash-commands)

Key findings:

- Settings are hierarchical: user, project shared, project local, managed.
- Hooks have richer lifecycle than Codex and support structured JSON outputs.
- Skills are directories with `SKILL.md` plus optional scripts/references/templates.
- Subagents are Markdown files with frontmatter and project/user scopes.
- Slash commands are native command surfaces.

## OpenCode

- [OpenCode config schema](https://opencode.ai/config.json)
- [OpenCode config documentation](https://opencode.ai/docs/config/)
- [OpenCode tools](https://opencode.ai/docs/tools/)
- [OpenCode custom tools](https://opencode.ai/docs/custom-tools/)
- [OpenCode agents](https://opencode.ai/docs/agents/)
- [OpenCode plugins](https://opencode.ai/docs/plugins/)

Key findings:

- Config is JSON/JSONC and merged from multiple locations.
- `permission` is the current tool-control surface; deprecated `tools` booleans should be avoided when possible.
- Custom tools are TS/JS files in `.opencode/tools` or global tools dir.
- Plugins can add tools, hooks, integrations, and subscribe to many runtime events.
- OpenCode has primary agents and subagents; `default_agent` must be primary.
