# Claude Code settings study

Purpose: extract current Claude Code settings and schema concepts useful for OpenAgentLayer's Claude adapter.

Authority: study input for `../specs/surface-config-contract.md`.

Sources:

- `https://code.claude.com/docs/en/settings`
- `https://www.schemastore.org/claude-code-settings.json`

Retrieval date: 2026-04-30.

## Scope model

Claude settings use hierarchical scopes:

- Managed: all users on a machine; cannot be overridden by lower scopes.
- User: `~/.claude/settings.json`.
- Project: `.claude/settings.json`.
- Local: `.claude/settings.local.json`.

Precedence:

1. Managed
2. Command-line arguments
3. Local
4. Project
5. User

OAL rule: project install writes project-scoped files; global install writes user-scoped files; organization policy docs may describe managed scope but normal OAL install does not claim it.

## Files and locations

Settings:

- User: `~/.claude/settings.json`
- Project: `.claude/settings.json`
- Local: `.claude/settings.local.json`

Other Claude configuration:

- User subagents: `~/.claude/agents/`
- Project subagents: `.claude/agents/`
- User MCP: `~/.claude.json`
- Project MCP: `.mcp.json`
- User instructions: `~/.claude/CLAUDE.md`
- Project instructions: `CLAUDE.md` or `.claude/CLAUDE.md`
- Local instructions: `CLAUDE.local.md`

OAL rule: do not place project-shared machine-specific settings in project scope.

## Settings OAL may emit

| Key                                        | Use in OAL                          | Scope guidance                              |
| ------------------------------------------ | ----------------------------------- | ------------------------------------------- |
| `$schema`                                  | JSON validation                     | all emitted settings files                  |
| `agent`                                    | Run main thread as named subagent   | route-specific config only                  |
| `permissions`                              | allow/ask/deny tool rules           | project or user                             |
| `env`                                      | environment variables               | user/local unless project-safe              |
| `hooks`                                    | runtime enforcement                 | project or user                             |
| `model`                                    | model selection                     | user/project if v4 model policy owns it     |
| `outputStyle`                              | system-prompt style                 | user/project if OAL owns output style       |
| `statusLine`                               | status command                      | user/project                                |
| `includeCoAuthoredBy` is not an OAL target | use `attribution`                   | see replacement table                       |
| `attribution`                              | commit/PR attribution customization | user/project                                |
| `allowedHttpHookUrls`                      | HTTP hook allowlist                 | managed/project when HTTP hooks are emitted |
| `allowedChannelPlugins`                    | channel plugin allowlist            | managed only                                |
| `allowedMcpServers`                        | MCP allowlist                       | managed only                                |
| `allowManagedHooksOnly`                    | force only managed hooks            | managed only                                |
| `allowManagedMcpServersOnly`               | constrain MCP source                | managed only                                |
| `allowManagedPermissionRulesOnly`          | constrain permission source         | managed only                                |
| `enabledPlugins`                           | force/load plugins                  | user/project/managed as supported           |
| `extraKnownMarketplaces`                   | plugin marketplace list             | user/project/managed                        |
| `strictKnownMarketplaces`                  | marketplace allowlist               | managed only                                |
| `plansDirectory`                           | plan file directory                 | project-safe                                |
| `availableModels`                          | restrict selectable models          | managed/user/project depending policy       |

## Permission rule syntax

SchemaStore `permissionRule` pattern supports:

- tool name alone: `Bash`, `Edit`, `Read`, `WebFetch`;
- tool with matcher: `Bash(npm run build)`, `Read(./.env)`;
- MCP tool namespace: `mcp__server__tool`;
- agent/tool classes including `Agent`, `Bash`, `Edit`, `ExitPlanMode`, `Glob`, `Grep`, `LSP`, `Read`, `Skill`, `TodoWrite`, `ToolSearch`, `WebFetch`, `WebSearch`, `Write`.

OAL mapping:

- route contract -> default permission block;
- policy record -> explicit deny/ask/allow rules;
- secret path guard -> deny `Read` patterns;
- build/test command policy -> allow exact `Bash(...)` patterns.

## Hook configuration

SchemaStore hook handler types:

- `command`
- `prompt`
- `agent`
- `http`

Command hook fields:

- `type = "command"`
- `command`
- `timeout`
- `async`
- `statusMessage`

Prompt hook fields:

- `type = "prompt"`
- `prompt`
- `model`
- `timeout`
- `statusMessage`

Agent hook fields:

- `type = "agent"`
- `prompt`
- `model`
- `timeout`
- `statusMessage`

HTTP hook fields:

- `type = "http"`
- `url`
- `headers`
- `timeout`
- `statusMessage`

OAL rule: prefer command hooks for deterministic runtime guards. Use prompt/agent hooks only for explicit review/verification policies. Use HTTP hooks only when `allowedHttpHookUrls` is configured.

## Hook events

Study target events from Claude settings and schema:

- `PreToolUse`
- `PostToolUse`
- `UserPromptSubmit`
- `SessionStart`
- `Stop`
- subagent/task lifecycle events where supported by current Claude Code hooks docs.

OAL mapping:

- command safety -> `PreToolUse`
- write/output checks -> `PostToolUse`
- prompt context -> `UserPromptSubmit`
- budget/session context -> `SessionStart`
- route completion -> `Stop`

## Replacement table

| Do not emit                                 | Emit instead                                | Reason                                                                  |
| ------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| `includeCoAuthoredBy`                       | `attribution`                               | Claude docs list `attribution` for commit/PR attribution customization. |
| `voiceEnabled`                              | `voice.enabled` inside `voice` object       | Claude docs describe `voice` object as current shape.                   |
| Windows managed settings in old system path | current system locations from settings docs | Docs identify current file-based managed settings locations.            |

## Model and effort tailoring

Claude Code model settings relevant to OAL:

- `model` can be an alias or full model ID.
- `availableModels` constrains selectable models.
- `env` can set alias pins.
- `agent` can run the main thread as a named subagent.
- subagent and skill frontmatter can carry model/effort intent where the surface supports it.

Alias/pin variables:

- `ANTHROPIC_DEFAULT_OPUS_MODEL`: target for `opus`, and for `opusplan` in plan mode.
- `ANTHROPIC_DEFAULT_SONNET_MODEL`: target for `sonnet`, and for `opusplan` in execution mode.
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`: target for `haiku` and background functionality.
- `CLAUDE_CODE_SUBAGENT_MODEL`: default model for subagents.

OAL model rules:

- Include `haiku` for small helpers, summaries, narrow diagnostics, and background work.
- Use `opusplan` for Max interactive routes that need strong planning but efficient execution.
- Use full model IDs when exact model selection matters.
- Use `claude-opus-4-6` explicitly when OAL wants Opus 4.6.
- Use `claude-opus-4-6[1m]`, `opus[1m]`, or `sonnet[1m]` only for explicit long-context routes.
- Avoid `max` effort by default.
- Avoid `xhigh` effort by default.

## OAL adapter decisions

- Emit `$schema` in every settings JSON.
- Keep project settings limited to team-safe hooks, permissions, plugins, and instructions.
- Keep user/local settings for personal model/UI/env values.
- Generate command hooks from policy records.
- Generate permission rules from route contracts and policy records.
- Validate against SchemaStore and source/schemas/upstream/manifest.json provenance while accepting that docs may lead schema for new fields.

## Provenance checkpoint

- Raw schema cache: `source/schemas/upstream/claude-code-settings.schema.json`.
- Official docs study entry: `claude-code-settings-docs` in `source/schemas/upstream/manifest.json`.
- Manifest entries: `claude-code-settings-schema` and `claude-code-settings-docs`.
- Extraction policy: include current project-safe settings only; skip managed-only, user-local-only, old alias, or replacement-only keys unless documented as non-emitted guidance.
