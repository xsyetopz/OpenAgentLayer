# Configure Providers

OAL renders provider-native files. The source intent is shared, but each
provider gets files in its own format.

## Codex

OAL renders `.codex/config.toml`, `.codex/agents/*.toml`,
`.codex/openagentlayer/skills/*/SKILL.md`, executable hooks, `AGENTS.md`, and
Codex plugin marketplace payloads.

OAL uses the normal shell for Codex and keeps RTK enforcement in visible hooks.
It also renders `.codex/requirements.toml` as the Codex managed-hook policy
template. Codex loads `requirements.toml` from its system or managed config
locations. If you want hooks to run without approval review, install the
rendered requirements file into the Codex requirements layer for your
environment. OAL deploy prints a warning when this file exists so the admin
install step is visible.

OAL renders `.codex/openagentlayer/codex-base-instructions.md` from upstream
`openai/codex` base instructions plus the tracked OAL patch in
`patches/openai-codex-base-instructions-default-md.patch`, then points
`model_instructions_file` at that patched file.
Generated Codex config also includes a `#:schema` comment that points to the
[Codex config schema](https://developers.openai.com/codex/config-schema.json).
The research disposition for the reddit-derived changes lives in
`docs/codex-reddit-research.md`.

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

Setup treats provider binaries as optional during planning. If a provider binary
is not available, OAL reports it and continues with steps that do not need that
binary, such as source rendering, deploy planning, plugin payloads, and shared
validation.
