# Hook, command, and skill crosswalk

Purpose: one adapter-facing map for OAL hook policies, command records, and skill records across Codex, Claude Code, and OpenCode.

Authority: implementation companion for `../../specs/hook-policy-engine.md` and `../../specs/command-skill-format.md`.

Sources:

- `codex-hooks-commands-skills-study.md`
- `claude-hooks-commands-skills-study.md`
- `opencode-hooks-commands-skills-study.md`

Retrieval date: 2026-04-29.

## Hook crosswalk

| OAL policy | Codex | Claude Code | OpenCode |
| ---------- | ----- | ----------- | -------- |
| `session_context` | `SessionStart` | `SessionStart`, `InstructionsLoaded` | `session.created`, `session.updated`, `server.connected` |
| `input_guard` | `UserPromptSubmit` | `UserPromptSubmit`, `UserPromptExpansion` | `tui.prompt.append`, `tui.command.execute` |
| `execution_guard` | `PreToolUse`, `PermissionRequest` | `PreToolUse`, `PermissionRequest`, `PermissionDenied` | `tool.execute.before`, `permission.asked` |
| `output_safety` | `PostToolUse` | `PostToolUse`, `PostToolUseFailure`, `PostToolBatch` | `tool.execute.after`, `file.edited`, `lsp.client.diagnostics` |
| `completion_gate` | `Stop` | `Stop`, `StopFailure` | `session.idle`, `session.error`, `session.status` |
| `delegation` | `PermissionRequest` | `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted` | `command.executed`, `todo.updated` |
| `vcs_gate` | `PreToolUse`, `PostToolUse`, `Stop` | `PreToolUse`, `PostToolUse`, `Stop` | `tool.execute.before`, `tool.execute.after`, `session.diff` |
| `drift_guard` | `PostToolUse` | `FileChanged`, `ConfigChange`, `CwdChanged` | `file.watcher.updated`, `session.diff` |
| `context_budget` | `Stop` plus compaction prompt | `PreCompact`, `PostCompact` | `session.compacted` |

Rules:

- Codex and Claude Code use explicit hook config.
- OpenCode uses plugin event handlers.
- OAL source records use OAL policy names, never surface event names as primary keys.
- Adapter validation fails when a policy maps to no current surface event.

## Handler crosswalk

| OAL handler class | Codex | Claude Code | OpenCode |
| ----------------- | ----- | ----------- | -------- |
| `command_script` | `type = "command"` hook | `type: "command"` hook | plugin handler calls OAL `.mjs` or TS helper |
| `prompt_review` | `type = "prompt"` hook | `type: "prompt"` hook | command or plugin-driven model call |
| `agent_review` | `type = "agent"` hook | `type: "agent"` hook | command `subtask` or agent-targeted route |
| `http_callout` | not OAL baseline | `type: "http"` with URL allowlist | plugin fetch only with source policy |
| `mcp_callout` | tool/app permission path | `type: "mcp"` hook | MCP tool through provider/config |

Default: use `command_script` for deterministic guards.

## Command crosswalk

| OAL command source | Codex render | Claude Code render | OpenCode render |
| ------------------ | ------------ | ------------------ | --------------- |
| command body | plugin skill `SKILL.md` | `.claude/skills/<id>/SKILL.md` | `.opencode/commands/<id>.md` |
| command title | skill heading/description | skill `description` | command `description` |
| arguments | prose + route parser | `arguments`, `$ARGUMENTS`, `$0` | `$ARGUMENTS`, `$1` |
| owner role | route text and Codex agent config | `agent` plus `context: fork` when isolated | `agent` plus `subtask` |
| model override | profile/route model | `model`, `effort` | `model` |
| aliases | trigger examples | not emitted as file aliases unless surface supports it | not emitted as file aliases unless source allows override |

Default command render:

- Codex: skill invocation.
- Claude Code: skill invocation.
- OpenCode: markdown command file.

## Skill crosswalk

| OAL skill source | Codex | Claude Code | OpenCode |
| ---------------- | ----- | ----------- | -------- |
| file path | plugin `skills/<id>/SKILL.md` | `.claude/skills/<id>/SKILL.md` | `.opencode/skills/<id>/SKILL.md` |
| required metadata | `name`, `description` where supported by loader | `description` recommended, `name` optional | `name`, `description` |
| invocation control | skill selected with `$` | `disable-model-invocation`, `user-invocable` | `permission.skill` |
| supporting files | plugin skill directory | skill directory support files | skill directory support files |
| tool grants | Codex profile permissions | `allowed-tools` | `permission` rules |
| model/effort | route/profile | `model`, `effort` | command/agent model |

## Source record additions

OAL command records need:

- `id`
- `title`
- `description`
- `owner_role`
- `route_contract`
- `arguments`
- `invocation`
- `side_effect_level`
- `surface_targets`
- `model_policy`
- `hook_policies`

OAL skill records need:

- `id`
- `title`
- `description`
- `when_to_use`
- `invocation_mode`
- `tool_grants`
- `route_contract`
- `supporting_files`
- `surface_targets`
- `model_policy`

OAL hook policy records need:

- `id`
- `category`
- `blocking`
- `failure_mode`
- `surface_events`
- `handler_class`
- `runtime_script`
- `matcher`
- `payload_schema`
- `test_payloads`

## Validation checklist

- [x] Sealed — Every OAL hook policy category has a surface mapping.
- [x] Sealed — Every command source has one default render target per surface.
- [x] Sealed — Every skill source has one native render target per surface.
- [x] Sealed — OpenCode hook-like behavior maps to plugin events, not settings hooks.
