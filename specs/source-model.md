# Source model

Purpose: canonical v4 source graph schema.

Authority: normative.

## Record rules

- Every record has `id`, `kind`, `title`, `description`, and `surfaces`.
- IDs are lowercase kebab-case.
- Body files are Markdown.
- Loaded records include exact body file text for adapter rendering.
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
- `prompt_content`
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
- `body_content`
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
- `upstream`

Skill records express procedural capability. Adapters translate into native skill formats.

Imported skills are first-class skill records. They keep the original `SKILL.md` body, attribution metadata, and support files instead of being summarized into OAL prose. Third-party-backed records keep only OAL overlay metadata under `source/skills/<id>/skill.toml`; body and mapped support files resolve from `third_party/` upstream submodules through the `upstream` table. Imported records must include `metadata.source_package`, `metadata.upstream_name`, `upstream.repository`, and `upstream.commit`; records named as generic wrappers such as `full-skill` are invalid because they hide the concrete Agent Skill identity.

## Command record

Fields:

- `id`
- `title`
- `description`
- `owner_role`
- `route_contract`
- `aliases`
- `prompt_template`
- `prompt_template_content`
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
- `body_content`
- `injection_point`

Guidance records provide instruction bodies for generated surface files.

Prompt architecture derives prompt layers from existing guidance, agent, command, skill, policy, and route-contract source records. It does not add a separate prompt record kind.

## Model plan record

Path:

- `source/model-plans/<id>/model-plan.toml`

Fields:

- `id`
- `kind`: `model-plan`
- `title`
- `description`
- `surfaces`
- `default_plan`
- `default_model`
- `implementation_effort`
- `plan_effort`
- `review_effort`
- `effort_ceiling`
- `role_assignments`
- `deep_route_overrides`
- `long_context_routes`

Each `role_assignments` entry contains:

- `role`
- `model`
- `effort`

Each `deep_route_overrides` entry contains:

- `role`
- `route`
- `model`
- `effort`

Model plan records are source truth for profile and agent model assignment. Adapters translate model plans into native profile/settings/config files, but must not hardcode role names or default model assignments.

At most one model plan may set `default_plan = true` for a surface. Explicit render calls may select a non-default plan by ID; unknown selected plan IDs must fail render validation.

## Surface config record

Path:

- `source/surface-configs/<surface>/surface-config.toml`

Fields:

- `id`
- `kind`: `surface-config`
- `title`
- `description`
- `surface`
- `surfaces`
- `allowed_key_paths`
- `do_not_emit_key_paths`
- `project_defaults`
- `default_profile`
- `replacements`
- `validation_rules`

`default_profile` contains:

- `profile_id`
- `placement`
- `emitted_key_paths`
- `source_url`
- `validation`

Each replacement contains:

- `from`
- `to`
- `reason`
- `source_url`

Surface config records are source truth for native config allowlists, default project values, blocked keys, and replacement mappings. Adapters must validate emitted config objects against these records before returning bundles.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
