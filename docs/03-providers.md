# Configure Providers

OAL renders provider-native artifacts. The source intent is shared, but the
files are different for Codex, Claude Code, and OpenCode.

## Codex

OAL renders `.codex/config.toml`, `.codex/agents/*.toml`,
`.codex/openagentlayer/skills/*/SKILL.md`, executable hooks, `AGENTS.md`, and
Codex plugin marketplace payloads.

OAL uses the normal shell for Codex and keeps RTK enforcement in visible hooks.

## Claude Code

OAL renders `.claude/settings.json`, `.claude/agents/*.md`,
`.claude/skills/*/SKILL.md`, `.claude/hooks/scripts/*.mjs`,
`.claude/commands/*.md`, and `CLAUDE.md`.

Anthropic Docs MCP is OAL-owned and can be registered with Claude Code:

```bash
claude mcp add oal-anthropic-docs --scope user -- oal mcp serve anthropic-docs
```

## OpenCode

OAL renders `opencode.jsonc`, `.opencode/agents/*.md`,
`.opencode/commands/*.md`, `.opencode/tools/*.ts`,
`.opencode/plugins/openagentlayer.ts`, instructions, and executable hooks.

OpenCode Docs and OAL Inspect MCP servers can be installed through OAL:

```bash
oal mcp install opencode-docs --provider opencode --scope global
oal mcp install oal-inspect --provider opencode --scope global
```

## Provider Availability

Setup treats provider binaries as optional for planning. A missing provider
binary is reported and skipped for provider-native setup that requires that
binary.
