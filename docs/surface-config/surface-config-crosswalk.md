# Surface config crosswalk

Purpose: map equivalent OpenAgentLayer config concepts across Codex, Claude Code, and OpenCode.

Authority: study synthesis for adapter implementation.

Sources:

- Codex: `https://raw.githubusercontent.com/openai/codex/refs/heads/main/codex-rs/core/config.schema.json`
- Claude settings: `https://code.claude.com/docs/en/settings`
- Claude SchemaStore: `https://www.schemastore.org/claude-code-settings.json`
- OpenCode: `https://opencode.ai/config.json`

Retrieval date: 2026-04-29.

## Crosswalk

| OAL concept            | Codex                                                | Claude Code                                                            | OpenCode                                        |
| ---------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| instruction file       | `model_instructions_file`, `developer_instructions`  | `CLAUDE.md`, `.claude/CLAUDE.md`, `settings.json` fields               | `instructions`                                  |
| role/agent             | `[agents.<role>]`, role config file                  | `.claude/agents/<name>.md`, `agent` setting                            | `agent`, `default_agent`                        |
| command route          | wrapper CLI + profile + prompt                       | slash/custom command surface outside settings; hooks can enforce       | `command.<name>`                                |
| skill                  | Codex plugin skill folder                            | Claude skill/plugin folders                                            | `skills.paths`, `skills.urls`                   |
| hooks                  | `[hooks]` event tables                               | `hooks` in settings schema                                             | `plugin` runtime hooks                          |
| permission policy      | `approval_policy`, `sandbox_mode`, `[permissions]`   | `permissions.allow/ask/deny`                                           | `permission`                                    |
| model routing          | `model`, profiles, `model_provider`, reasoning knobs | `model`, `availableModels`                                             | `model`, `small_model`, `provider`              |
| MCP                    | `mcp_servers`                                        | `.mcp.json`, `~/.claude.json` MCP config                               | `mcp`                                           |
| output budget          | `tool_output_token_limit`, `project_doc_max_bytes`   | hook/status/output settings only; no exact same budget key in settings | `tool_output`                                   |
| connector/app controls | `[apps]`                                             | plugins/channel allowlists                                             | `plugin`, `tools`                               |
| config scope           | root/profile/user config                             | managed/user/project/local hierarchy                                   | project/global config file resolved by OpenCode |
| runtime guard          | command/prompt/agent hooks                           | command/prompt/agent/http hooks                                        | TypeScript plugin events                        |

## Adapter responsibilities

- Codex adapter emits TOML profiles, agents, hooks, permissions, apps/tools, and wrappers.
- Claude adapter emits JSON settings, agent files, hooks, permissions, and instruction files.
- OpenCode adapter emits JSON/JSONC config, commands, skills paths, plugin entries, agents, instructions, permissions.

## Do-not-emit summary

- Codex: old approval fallback policy, old approval reviewer name, experimental realtime/thread endpoint keys.
- Claude: old attribution toggle, old voice boolean, old managed settings path.
- OpenCode: old boolean sharing key, fixed-layout key, experimental keys by default.

## Implementation rule

Each adapter owns a schema-derived allowlist. Render fails if a generated key is not on the allowlist unless the adapter explicitly marks it as a pass-through user-owned key.

