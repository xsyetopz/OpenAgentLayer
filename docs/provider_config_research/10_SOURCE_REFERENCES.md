# Source References

## Codex

- `https://raw.githubusercontent.com/openai/codex/refs/heads/main/codex-rs/core/config.schema.json`
- `https://developers.openai.com/codex/config-reference`
- `https://github.com/openai/codex/blob/main/codex-rs/hooks/src/engine/discovery.rs`
- `https://developers.openai.com/codex/agents-md`
- `https://openai.com/index/unrolling-the-codex-agent-loop/`

Key findings:

- Config supports profiles, agents, feature flags, approval/sandbox/model settings, hooks, tools, history, memories, apps/connectors.
- `on-failure` approval policy is deprecated in schema descriptions.
- `guardian_subagent` is legacy compatibility for approvals reviewer; use `auto_review`.
- Hook discovery supports command hooks; prompt/agent hook handler types are skipped in observed implementation.
- Observed hook events: PreToolUse, PermissionRequest, PostToolUse, SessionStart, UserPromptSubmit, Stop.

## Claude Code

- `https://www.schemastore.org/claude-code-settings.json`
- `https://code.claude.com/docs/en/settings`
- `https://docs.claude.com/en/docs/claude-code/hooks`
- `https://docs.claude.com/en/docs/claude-code/skills`
- `https://docs.claude.com/en/docs/claude-code/sub-agents`
- `https://docs.claude.com/en/docs/claude-code/slash-commands`

Key findings:

- Settings are hierarchical: user, project shared, project local, managed.
- Hooks have richer lifecycle than Codex and support structured JSON outputs.
- Skills are directories with `SKILL.md` plus optional scripts/references/templates.
- Subagents are Markdown files with frontmatter and project/user scopes.
- Slash commands are native command surfaces.

## OpenCode

- `https://opencode.ai/config.json`
- `https://opencode.ai/docs/config/`
- `https://opencode.ai/docs/tools/`
- `https://opencode.ai/docs/custom-tools/`
- `https://opencode.ai/docs/agents/`
- `https://opencode.ai/docs/plugins/`

Key findings:

- Config is JSON/JSONC and merged from multiple locations.
- `permission` is the current tool-control surface; legacy `tools` booleans should be avoided when possible.
- Custom tools are TS/JS files in `.opencode/tools` or global tools dir.
- Plugins can add tools, hooks, integrations, and subscribe to many runtime events.
- OpenCode has primary agents and subagents; `default_agent` must be primary.
