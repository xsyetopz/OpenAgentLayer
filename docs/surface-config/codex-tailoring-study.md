# Codex tailoring study

Purpose: define OpenAgentLayer defaults for generated Codex `config.toml` files.

Authority: study input for `../../specs/surface-config-contract.md` and `../../specs/model-routing.md`.

Sources:

- `https://raw.githubusercontent.com/openai/codex/refs/heads/main/codex-rs/core/config.schema.json`

Retrieval date: 2026-04-29.

## Scope

This file is about defaults, placement, and route tuning. The companion schema study lists keys that an adapter may emit. This study says which keys OAL should emit by default, which keys require user-owned placement, and which keys should be route-only.

Codex config has root keys, profile keys, feature gates, hooks, apps, agents, permissions, MCP servers, model providers, history, memories, and UI/noise controls. OAL must treat the file as a typed target, not as a text blob.

## Required OAL Codex baseline

Every generated OAL Codex profile must carry this feature baseline:

```toml
[features]
fast_mode = false
multi_agent_v2 = true
unified_exec = false
```

Reason:

- `fast_mode = false`: OAL favors usage control and deliberate routing over speed burn.
- `multi_agent_v2 = true`: OAL uses multi-agent routing as core behavior.
- `unified_exec = false`: OAL keeps hook and shell behavior in the stable path chosen by route policy.

OAL should also enable feature gates that are direct dependencies of OAL behavior:

```toml
[features]
codex_hooks = true
collaboration_modes = true
default_mode_request_user_input = true
memories = true
shell_tool = true
shell_snapshot = true
skill_mcp_dependency_install = true
```

Do not enable broad surface features just because they exist. Emit feature gates only when the generated route, adapter, or installed runtime requires them.

## Placement classes

| Placement class             | Meaning                                                                    | OAL action                                                                                         |
| --------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Generated project profile   | Route-safe settings tied to one repo.                                      | Emit into managed OAL profile tables.                                                              |
| Generated global profile    | User-level OAL default shared across repos.                                | Emit only when global install is requested.                                                        |
| User-local recommendation   | Personal preference, privacy choice, terminal preference, or usage budget. | Document exact recommendation; do not overwrite unless user explicitly selects managed generation.  |
| Policy-owned route override | Permission, tool, hook, approval, model, or effort value from source graph. | Emit per route/profile and validate against route contract.                                        |
| Runtime-owned generated     | Hook command, generated instruction file, generated role config path.       | Emit paths into config; write target files from installer manifest.                                |
| Enterprise-managed note     | Organization policy key.                                                   | Describe only; normal OAL installer does not write managed policy files.                           |

## Baseline project profile

OAL project install should produce a named profile, not mutate unrelated root choices. Baseline shape:

```toml
[profiles.oal]
model_verbosity = "medium"
approval_policy = "on-request"
approvals_reviewer = "auto_review"
sandbox_mode = "workspace-write"
web_search = "enabled"
include_environment_context = true
include_permissions_instructions = true
include_apps_instructions = true
project_doc_max_bytes = 262144
tool_output_token_limit = 20000
model_auto_compact_token_limit = 160000
hide_agent_reasoning = false
```

Model and effort values are not fixed in the baseline snippet. They come from the plan-tier table below and `../../specs/model-routing.md`.

## Model and effort defaults

OAL must tune model and effort together:

| Subscription profile | Default implementation route             | Default plan route                       | Notes                                                                      |
| -------------------- | ---------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| `codex-plus`         | `model = "gpt-5.4-mini"`, effort `low`   | `model = "gpt-5.4"`, effort `medium`     | Avoid high-effort defaults. Reserve stronger models for plan/review gates. |
| `codex-pro-5`        | `model = "gpt-5.4"`, effort `medium`     | `model = "gpt-5.5"`, effort `high`       | Use `gpt-5.5` for architecture and arbitration.                            |
| `codex-pro-20`       | `model = "gpt-5.4"`, effort `medium`     | `model = "gpt-5.5"`, effort `high`       | Permit more parallel agents, still avoid waste.                            |
| high-volume helpers  | `model = "gpt-5.4-mini"`, effort `low`   | same                                     | Summaries, indexing, narrow diagnostics.                                   |
| code execution roles | `model = "gpt-5.3-codex"`, effort `high` | `model = "gpt-5.3-codex"`, effort `high` | Deep implementation only.                                                  |

`xhigh` is not a default. OAL may emit `xhigh` only for explicit, narrow routes that name a hard acceptance gate.

## Approval and sandbox defaults

OAL interactive routes:

```toml
approval_policy = "on-request"
approvals_reviewer = "auto_review"
sandbox_mode = "workspace-write"
```

OAL validation or automation routes:

```toml
approval_policy = "never"
approvals_reviewer = "auto_review"
```

Use granular approval objects only when OAL has an exact route policy:

```toml
approval_policy = { granular = { mcp_elicitations = true, rules = true, sandbox_approval = true, request_permissions = false, skill_approval = false } }
```

Rules:

- interactive write work asks for user approval when sandbox requires it;
- automation never waits on a prompt;
- approval routing uses `auto_review` when generated by OAL;
- sandbox mode follows install scope and route contract.

## Hooks defaults

OAL should emit hooks when hook runtime is installed. Required generated events:

| Event              | OAL default use                                         | Handler type              |
| ------------------ | ------------------------------------------------------- | ------------------------- |
| `UserPromptSubmit` | route detection, OAL context injection, one-turn opts   | command                   |
| `SessionStart`     | runtime health, project context, profile verification   | command                   |
| `PreToolUse`       | destructive command guard, permission policy bridge     | command                   |
| `PostToolUse`      | generated artifact checks, output classification        | command                   |
| `Stop`             | completion gate, required validation reminder/block     | command or agent          |
| `PermissionRequest`| approval summary, risk classification                   | command or agent          |

Hook command defaults:

```toml
timeout = 10
async = false
```

Use `statusMessage` only when the hook may run longer than normal or when the user needs visible risk context. Do not print routine success noise.

## Agent defaults

OAL should render Codex agents from source role records:

```toml
[agents]
max_threads = 6
max_depth = 2
job_max_runtime_seconds = 3600
interrupt_message = true
```

Plan-tier overrides:

- Plus: lower thread count; favor one implementation agent plus one review/validation agent.
- Pro 5: allow moderate fanout for research, implementation, review.
- Pro 20: allow deeper parallel study and disjoint implementation work.

Each `[agents.<role>]` entry must include:

- `description`
- `config_file`
- `nickname_candidates` when role has stable aliases.

## Apps and tool defaults

Default connector posture:

```toml
[apps._default]
enabled = true
destructive_enabled = false
open_world_enabled = false
```

Tool defaults:

- `tools.view_image = true` for routes that inspect images or screenshots.
- Web/search tool settings follow route search policy.
- Shell tool feature stays enabled because OAL workflows require real validation.
- Open-world and destructive connector tools require route policy.

## Context and compaction defaults

OAL should set context budgets where Codex schema exposes them:

| Key                                | Default class             | Suggested OAL default | Reason                                      |
| ---------------------------------- | ------------------------- | --------------------- | ------------------------------------------- |
| `project_doc_max_bytes`            | generated project profile | `262144`              | enough for dense AGENTS/spec docs           |
| `tool_output_token_limit`          | generated project profile | `20000`               | keep validation evidence but avoid floods   |
| `model_auto_compact_token_limit`   | route/profile             | model-window aware    | avoid late compaction                       |
| `model_context_window`             | route/profile             | model-specific        | only when OAL owns model metadata           |
| `compact_prompt`                   | runtime-owned generated   | OAL summary prompt    | preserve route state and acceptance gates   |
| `model_instructions_file`          | runtime-owned generated   | generated path        | keep large instructions out of inline TOML  |

Compaction prompt must preserve:

- active route;
- changed files;
- validation evidence;
- unresolved blockers;
- source URLs used for config decisions;
- agent handoff packets.

## History and memory defaults

History:

```toml
[history]
persistence = "save-all"
max_bytes = 104857600
```

Memory:

```toml
[memories]
generate_memories = true
use_memories = true
disable_on_external_context = true
extract_model = "gpt-5.4-mini"
consolidation_model = "gpt-5.4-mini"
```

OAL should recommend these as user/global defaults. Project installs should not force personal memory choices unless the user asks for an OAL-managed global install.

## UI and notification defaults

These are mostly user-owned:

| Key or group                    | OAL recommendation                         | Placement                  |
| ------------------------------- | ------------------------------------------ | -------------------------- |
| `notifications`                 | enable for long-running tasks only         | user-local recommendation  |
| `notification_method`           | user terminal/OS choice                    | user-local recommendation  |
| `notification_condition`        | failures, approval waits, completion       | user-local recommendation  |
| `status_line`                   | concise OAL route/model/status command     | generated profile or user  |
| `terminal_title`                | include route and repo                     | user-local recommendation  |
| `animations`                    | user preference                            | user-local recommendation  |
| `show_tooltips`                 | user preference                            | user-local recommendation  |
| `theme`                         | user preference                            | user-local recommendation  |
| `hide_agent_reasoning`          | false for development, true for demos      | route/profile             |

OAL-generated status line should show:

- route;
- active model;
- plan tier;
- sandbox/approval mode;
- validation state when known.

## MCP and provider defaults

OAL must not emit MCP or provider entries unless source graph names them.

MCP rules:

- local MCP server must have command, args, env policy, and timeout;
- remote MCP server must have URL, header policy, auth policy, and timeout;
- secrets belong in environment or credential stores, not generated project files.

Provider rules:

- `model_provider` only when OAL emits matching `model_providers`;
- `model_catalog_json` only when OAL owns model catalog file;
- `mcp_oauth_credentials_store` is user/global, not project-owned.

## Do-not-emit defaults

OAL should not emit:

- experimental realtime/thread endpoint keys;
- provider credentials;
- broad destructive connector enablement;
- unrestricted network policy;
- global profile switch unless installer explicitly owns global activation;
- terminal theme and animation preferences in project scope;
- auth credential store changes in project scope.

## Progress checklist

- [x] Sealed — Codex baseline feature defaults identified.
- [x] Sealed — Codex model/effort defaults mapped by plan tier.
- [x] Sealed — Codex hook defaults mapped by lifecycle event.
- [x] Sealed — Codex context/history/memory defaults separated by ownership.
- [x] Sealed — Codex app/tool/provider/MCP defaults separated by route policy.
