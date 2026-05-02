# OAL Agents, Skills, Commands, Tools, and Plugins Product Spec

This spec defines what counts as a real OAL artifact. It is intentionally product-oriented: artifacts must be consumed by rendering/deployment and must work on supported providers.

## Agents/subagents

A valid OAL agent/subagent record must include:

- stable id
- provider support list
- role purpose
- exact trigger conditions
- do-not-use conditions
- tool/write/sandbox contract
- allowed skills
- owned routes/commands where relevant
- model routing by provider and plan
- hook/guard expectations
- operational prompt body
- final-output contract
- validation behavior

A shallow role card is invalid. Example invalid shape:

```text
Purpose: tests
Triggers: validate
Workflow: run checks
```

The renderer must emit provider-native agent artifacts:

- Codex role TOML/config layer and spawn guidance.
- Claude subagent Markdown with tools/model/prompt.
- OpenCode agent Markdown/config with permissions/model/provider.

## Skills

A skill must be useful when invoked. It must contain:

- description that helps model choose it.
- operational procedure.
- examples or references when needed.
- scripts/templates/references if it depends on external behavior.
- provider-specific frontmatter only when supported.

Agent Skills should follow the provider’s actual skill conventions. Do not emit unconsumed skill metadata.

## Commands/routes

A command/route must include:

- command name per provider.
- owning route/agent.
- allowed permissions/tools.
- expected arguments.
- operational procedure.
- validation/completion requirements.
- provider-native render target.

Invalid command shape:

```yaml
description: Choose between options.
Output: Decision and rationale.
```

Valid command behavior must be actionable and must route into an actual OAL agent/skill/hook/config path.

## OpenCode tools

OpenCode tools must be actual `.ts` or `.js` tool definitions using the OpenCode plugin helper. They must be installed under `.opencode/tools/` or global tools directory and referenced by permissions/agents/commands where needed.

Good OAL OpenCode tools:

- `oal_manifest_inspect`
- `oal_generated_diff`
- `oal_route_state`
- `oal_project_commands`
- `oal_hook_fixture_run`
- `oal_provider_surface_map`

Bad OAL OpenCode tools:

- metadata names with no file.
- tools that only return canned text.
- tools not visible to OpenCode.

## Plugins

Plugins are valid only when they add runtime behavior:

- hooks/events.
- tools.
- integrations.
- permission/risk control.
- context injection.

A plugin that only exports a static label is invalid.

## Content reducers and integrations

Caveman, Taste Skill, RTK, and similar integrations must be scoped:

- Caveman: optional prose/output reducer, never global distortion of code/errors/config/logs.
- Taste Skill: design/frontend/product-polish routes only.
- RTK/prose rewrite: never rewrite code, commands, JSON/TOML/YAML, exact errors, logs, citations, security findings, migration SQL, validation output.

## Product rule

Artifacts are valid only if they are:

- authored source consumed by loader;
- generated provider output;
- deploy/install/uninstall logic;
- runtime hook/tool/plugin logic;
- validation/fixtures;
- docs describing implemented behavior.

Everything else is suspect.
