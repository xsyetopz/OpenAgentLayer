# Config validation

## Purpose

OAL validates generated tool configuration against upstream schemas. Schema validation is part of `oal check`.

## Upstream schemas

| Platform    | Schema URL                                               | OAL cache key          |
| ----------- | -------------------------------------------------------- | ---------------------- |
| Codex       | `https://developers.openai.com/codex/config-schema.json` | `codex_config`         |
| Claude Code | `https://www.schemastore.org/claude-code-settings.json`  | `claude_code_settings` |
| OpenCode    | `https://opencode.ai/config.json`                        | `opencode_config`      |

`source/schemas/upstream.json` records URL, cache path, SHA-256, and generated files validated by each schema.

## Validation stages

`oal check` runs config validation in this order:

1. validate OAL source JSON against local OAL schemas
2. verify upstream schema cache hashes
3. render platform config into temporary output
4. validate generated Codex config against Codex schema
5. validate generated Claude Code settings against SchemaStore schema
6. validate generated OpenCode config against OpenCode schema
7. run OAL policy checks for required/blocked keys

Schema pass is not enough. OAL policy checks enforce chosen defaults that upstream schemas allow but OAL rejects.

## Codex policy checks

Codex generated config must:

- set `features.fast_mode = false`
- set `features.unified_exec = false`
- set root `unified_exec = false`
- set `features.codex_hooks = true`
- set `features.multi_agent = false`
- set `features.multi_agent_v2 = true`
- keep subscription profile inside `plus`, `pro-5`, `pro-20`
- default subscription profile to `plus`
- keep model ids inside OAL Codex model set

Managed Codex keys include:

- `agents`
- `approval_policy`
- `features`
- `hooks`
- `marketplaces`
- `mcp_servers`
- `model`
- `model_reasoning_effort`
- `model_verbosity`
- `plugins`
- `profile`
- `profiles`
- `project_doc_max_bytes`
- `sandbox_mode`
- `skills`
- `tool_output_token_limit`
- `tools`

## Claude Code policy checks

Claude Code generated settings must:

- validate against SchemaStore Claude Code settings schema
- allow only `max-5` and `max-20` consumer subscription profiles
- reject `plus`
- set `disableAllHooks = false`
- set `fastMode = false`
- set `fastModePerSessionOptIn = false`
- keep model ids inside OAL Claude model set

Managed Claude keys include:

- `agent`
- `availableModels`
- `hooks`
- `model`
- `modelOverrides`
- `permissions`
- `statusLine`
- `strictPluginOnlyCustomization`

## OpenCode policy checks

OpenCode generated config must:

- validate against OpenCode config schema
- keep `default_agent` in Greek-gods agent set
- keep route models inside configured OpenCode fallback set
- configure agents, commands, skills, permissions, MCP, providers, watcher, tools, and output limits through schema-backed keys

Managed OpenCode keys include:

- `agent`
- `command`
- `default_agent`
- `instructions`
- `mcp`
- `model`
- `permission`
- `plugin`
- `provider`
- `skills`
- `small_model`
- `tool_output`
- `tools`
- `watcher`

## Failure shape

Validation errors name:

- platform
- generated file
- schema URL or OAL policy id
- JSON path
- bad value
- required value

Example:

```text
codex config policy failed: features.fast_mode=true, required false
```

