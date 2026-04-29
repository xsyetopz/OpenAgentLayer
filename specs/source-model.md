# Source model

Purpose: canonical v4 source graph schema.

Authority: normative.

## Record rules

- Every record has `id`, `kind`, `title`, `description`, and `surfaces`.
- IDs are lowercase kebab-case.
- Body files are Markdown.
- Metadata files are TOML.
- Record loading must fail on duplicate IDs.
- Record loading must fail on unknown surface names.
- Record loading must fail on missing body files.

## Agent record

Fields:

- `id`
- `title`
- `role`
- `description`
- `prompt`
- `mode`: `primary`, `subagent`, or `both`
- `route_contract`
- `model_intent`
- `family`
- `primary`
- `subagent`
- `model_class`
- `effort_ceiling`
- `budget_tier`
- `handoff_contract`
- `permissions`
- `skills`
- `surfaces`

Agent records express role behavior. They do not contain rendered frontmatter for any one surface.

Agent role IDs are source data. The schema must allow new Greek-named roles without code changes. Role families are metadata values loaded from source; validation may enforce a configured family list, but renderer logic must not depend on a fixed role-name enum.

## Skill record

Fields:

- `id`
- `title`
- `description`
- `triggers`
- `body`
- `references`
- `scripts`
- `assets`
- `when_to_use`
- `invocation_mode`
- `user_invocable`
- `tool_grants`
- `route_contract`
- `surfaces`
- `model_policy`
- `supporting_files`

Skill records express procedural capability. Adapters translate into native skill formats.

## Command record

Fields:

- `id`
- `title`
- `description`
- `owner_role`
- `route_contract`
- `aliases`
- `prompt_template`
- `arguments`
- `invocation`
- `side_effect_level`
- `surfaces`
- `surface_overrides`
- `model_policy`
- `hook_policies`
- `supporting_files`

Commands are semantic routes first. Surface overrides may change syntax, not mission.

## Policy record

Fields:

- `id`
- `category`
- `severity`
- `event_intent`
- `runtime_script`
- `surface_mappings`
- `blocking`
- `failure_mode`
- `handler_class`
- `matcher`
- `payload_schema`
- `surface_events`
- `test_payloads`
- `message`
- `tests`

Policy records map behavior to hookable events.

## Surface render target record

Fields:

- `surface`
- `kind`
- `path`
- `format`
- `source_record`
- `adapter`
- `validation_rule`

Surface render target records express output files and config entries produced by adapters.

## Guidance record

Fields:

- `id`
- `authority`
- `surfaces`
- `body`
- `injection_point`

Guidance records provide instruction bodies for generated surface files.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
