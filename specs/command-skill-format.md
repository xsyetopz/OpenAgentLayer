# Command and skill format

Purpose: unified v4 command+skill source design.

Authority: normative.

## Command source layout

```text
source/commands/<id>/command.toml
source/commands/<id>/prompt.md
source/commands/<id>/examples/
```

Command TOML fields:

- `id`
- `title`
- `description`
- `owner_role`
- `route_contract`
- `aliases`
- `arguments`
- `invocation`
- `side_effect_level`
- `surfaces`
- `surface_overrides`
- `model_policy`
- `hook_policies`

The `aliases` field is for v4 command ergonomics only.

Command render targets:

- Codex: plugin skill `skills/<id>/SKILL.md`.
- Claude Code: `.claude/skills/<id>/SKILL.md`.
- OpenCode: `.opencode/commands/<id>.md` by default, or `opencode.jsonc` `command` entry for short generated commands.

Command rules:

- Commands with side effects must be user-invocable only where the surface supports it.
- Isolated commands must route through owner role/subagent fields.
- Model overrides come from `model_policy`, not inline prompt text.
- Hook policies attach by policy id.

## Skill source layout

```text
source/skills/<id>/skill.toml
source/skills/<id>/SKILL.md
source/skills/<id>/references/
source/skills/<id>/scripts/
source/skills/<id>/assets/
```

Skill TOML fields:

- `id`
- `title`
- `description`
- `triggers`
- `when_to_use`
- `invocation_mode`
- `user_invocable`
- `tool_grants`
- `route_contract`
- `surfaces`
- `model_policy`
- `supporting_files`

Skill render targets:

- Codex: plugin skill `skills/<id>/SKILL.md`.
- Claude Code: `.claude/skills/<id>/SKILL.md`.
- OpenCode: `.opencode/skills/<id>/SKILL.md`.

## Rendering rules

- Codex skills render to Codex plugin skill shape.
- Claude skills render to Claude skill shape.
- OpenCode skills render to OpenCode skill shape.
- Unsupported surfaces have no renderer until their studies are added.

## Authoring rules

- Shared body comes from Markdown.
- Surface-specific behavior goes in metadata override blocks.
- No generated surface file is edited by hand.
- Surface adapters may drop source fields only when the target surface has no equivalent and the drop is recorded in validation output.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
