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
- `argument_schema`
- `invocation`
- `side_effect_level`
- `surfaces`
- `surface_overrides`
- `model_policy`
- `hook_policies`
- `required_skills`
- `examples`
- `supporting_files`

The `aliases` field is for v4 command ergonomics only.

Command render targets:

- Codex: plugin command skill `skills/command-<id>/SKILL.md` plus listed support files under that command skill directory.
- Claude Code: `.claude/commands/<id>.md` plus listed support files under `.claude/commands/<id>/`.
- OpenCode: `.opencode/commands/<id>.md`, `opencode.json` command entry, and listed support files under `.opencode/commands/<id>/`.

Command rules:

- Commands with side effects must be user-invocable only where the surface supports it.
- Commands with side effects must attach at least one hook policy.
- Isolated commands must route through owner role/subagent fields.
- Declared arguments must appear in the prompt as `$ARGUMENTS`, `$1`, `$2`, or a named `$argument` placeholder.
- Required skills must reference source skill records.
- Model overrides come from `model_policy`, not inline prompt text.
- Hook policies attach by policy id.
- Recovered commands must contain capability-specific route guidance, acceptance gates, and evidence output. They must not reuse generic scaffold prose from recovery work.

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
- `license`
- `compatibility`
- `metadata`
- `allowed_tools`
- `triggers`
- `when_to_use`
- `invocation_mode`
- `user_invocable`
- `tool_grants`
- `route_contract`
- `surfaces`
- `model_policy`
- `supporting_files`
- `upstream`

The `id` field is the canonical Agent Skills `name`. It must match the skill directory name and use lowercase kebab-case. OAL does not maintain a second source-of-truth name field.

`license`, `compatibility`, `metadata`, and `allowed_tools` are Agent Skills metadata fields. `tool_grants` remains OAL's provider-neutral permission intent; adapters translate both permission sources into native surface config.

Skill render targets:

- Codex: plugin skill `skills/<id>/SKILL.md`, support files under the same skill directory, and optional `agents/openai.yaml` for disabled implicit invocation.
- Claude Code: `.claude/skills/<id>/SKILL.md` and support files under the same skill directory.
- OpenCode: `.opencode/skills/<id>/SKILL.md` and support files under the same skill directory.

Imported skill rules:

- Imported skills must keep the concrete upstream skill identity. OAL must not create generic wrapper skills such as `full-skill`.
- Imported skills with `metadata.origin = "openagentlayer-upstream"` must set `metadata.source_package`, `metadata.upstream_name`, `upstream.repository`, and `upstream.commit`.
- Imported skill bodies and mapped support files must resolve from `third_party/` upstream submodules, not manually copied files under `source/skills/`.
- Imported skill bodies must preserve full procedural depth from the source skill. OAL metadata may add routing, tool policy, support-file lists, and surface-native frontmatter, but must not compress the body into a summary.
- Support files from imported skills remain support files. `openai.yaml`, scripts, references, and assets must render under the native skill directory with source-relative paths.
- Caveman-family skills are response-style skills only. Taste-family skills are frontend/UI/design execution skills only.
- Retired implementation snapshots are evidence only. First-party OAL skills must be authored as OAL v4-local source; third-party skills must be sourced through `third_party/` upstream sync records. No active skill may cite `v3-evidence` as its source package.

## Rendering rules

- Codex skills render to Codex plugin skill shape.
- Claude skills render to Claude skill shape.
- OpenCode skills render to OpenCode skill shape.
- Native skill support files keep their source-relative paths under each rendered skill directory.
- Surfaces receive only native frontmatter fields they can consume; dropped fields must remain available in OAL source records.
- Unsupported surfaces have no renderer until their studies are added.

## Authoring rules

- Shared body comes from Markdown.
- `SKILL.md` must contain complete procedural guidance, not a heading plus one-line summary.
- `SKILL.md` must not be an unnecessary wrapper around another skill when the concrete skill can be sourced directly.
- Long guidance goes in linked `references/` files; scripts and assets stay in `scripts/` and `assets/`.
- `references`, `scripts`, `assets`, and `supporting_files` paths must stay inside the skill directory and exist at source-load time.
- Surface-specific behavior goes in metadata override blocks.
- No generated surface file is edited by hand.
- Surface adapters may drop source fields only when the target surface has no equivalent and the drop is recorded in validation output.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
