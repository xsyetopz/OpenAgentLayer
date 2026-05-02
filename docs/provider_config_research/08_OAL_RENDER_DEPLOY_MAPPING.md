# OAL Render and Deploy Mapping

## Source graph

The OAL source graph should model product concepts, not provider files:

- agents/subagents
- skills
- routes/commands
- tools
- hooks/policies
- model plans
- config intents
- integrations
- instructions

Every source record must know which providers it supports and what provider-specific requirements it has.

## Render outputs

### Codex

```text
.codex/config.toml
.codex/agents/*.toml
AGENTS.md or managed instruction file
.codex/openagentlayer/skills/*/SKILL.md
.codex/openagentlayer/hooks/*.mjs
.codex/openagentlayer/runtime/*.mjs
```

### Claude Code

```text
.claude/settings.json
.claude/agents/*.md
.claude/skills/*/SKILL.md
.claude/skills/*/{scripts,references,templates}
.claude/commands/*.md
CLAUDE.md or .claude/CLAUDE.md
.claude/hooks/scripts/*.mjs
```

### OpenCode

```text
opencode.jsonc
.opencode/agents/*.md
.opencode/commands/*.md
.opencode/tools/*.ts
.opencode/plugins/openagentlayer.ts
.opencode/skills/*/SKILL.md
.opencode/instructions/*.md
```

## Deploy outputs

Deploy should take rendered artifacts and produce an install plan:

- full-file writes
- marked-block inserts
- structured config merges
- executable mode writes for `.mjs` scripts
- manifest writes
- backup plan
- uninstall plan

## Manifest ownership

Manifest entries should track:

- provider
- scope
- path
- install mode
- hash
- config keys or block marker
- executable bit when relevant
- source record id

## No generated/source drift

Generated outputs are disposable. If an output changes by hand, the check command should fail unless the authored source and renderer produce the same output.

## Provider-native rendering standard

One source record may render differently per provider. Example:

- route `implement`
  - Codex: profile + wrapper/command + role config + stop hook context.
  - Claude: slash command + subagent + stop/subagent hooks.
  - OpenCode: command entry + primary/subagent + permissions + plugin hooks.

Fake uniformity is invalid.
