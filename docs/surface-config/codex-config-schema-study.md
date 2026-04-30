# Codex config schema study

Purpose: extract current Codex `config.toml` keys that OpenAgentLayer adapters may emit.

Authority: study input for `../specs/surface-config-contract.md`.

Source:

- `https://raw.githubusercontent.com/openai/codex/refs/heads/main/codex-rs/core/config.schema.json`

Retrieval date: 2026-04-30.

## Scope

Study target is Codex TOML configuration as described by upstream JSON Schema. OpenAgentLayer should generate only current keys that are useful for v4 Codex adapter behavior. Entries described by upstream as no-op, old, or replacement-only are not included in the emit allowlist.

## Top-level OAL emit allowlist

| TOML path                          | Use in OAL                          | Notes                                                                                                     |
| ---------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `profile`                          | Select active generated profile     | Only when installer intentionally owns active profile.                                                    |
| `model`                            | Default model for profile or root   | Prefer profile-scoped values for OAL-generated profiles.                                                  |
| `model_provider`                   | Select provider key                 | Emit only when OAL owns provider config.                                                                  |
| `model_reasoning_effort`           | Set reasoning effort                | Surface knob for route/model policy.                                                                      |
| `model_reasoning_summary`          | Control reasoning summaries         | Use for privacy/noise policy.                                                                             |
| `model_verbosity`                  | Control response verbosity          | Route/profile policy.                                                                                     |
| `plan_mode_reasoning_effort`       | Plan-mode reasoning                 | Planner defaults.                                                                                         |
| `personality`                      | Response style/personality setting  | Use only when v4 defines a surface style.                                                                 |
| `approval_policy`                  | Approval policy                     | Use `untrusted`, `on-request`, granular object, or `never`; do not emit old auto-approve fallback policy. |
| `approvals_reviewer`               | Approval routing                    | Emit `auto_review` or `user`; do not emit older reviewer name.                                            |
| `sandbox_mode`                     | Filesystem/network isolation policy | Core OAL permission bridge.                                                                               |
| `service_tier`                     | Fast/flex service preference        | Emit only for explicit speed modes.                                                                       |
| `web_search`                       | Web-search mode                     | Use for route-specific search policy.                                                                     |
| `tools`                            | Tool settings                       | Use for view image, web/search, shell/runtime surface knobs.                                              |
| `include_environment_context`      | Prompt preamble inclusion           | Adapter-controlled context shape.                                                                         |
| `include_permissions_instructions` | Permission text inclusion           | Useful for generated surface clarity.                                                                     |
| `include_apps_instructions`        | App connector instructions          | Use only if apps/connectors are enabled.                                                                  |
| `model_instructions_file`          | External instructions file          | Use for managed `AGENTS.md` or equivalent.                                                                |
| `developer_instructions`           | Developer-message text              | Use sparingly; prefer files for long managed instructions.                                                |
| `compact_prompt`                   | Compaction prompt                   | OAL can emit route-aware compaction text.                                                                 |
| `default_permissions`              | Named permission profile            | Use with `[permissions]`.                                                                                 |
| `sqlite_home`                      | SQLite state location               | Emit only when OAL owns state placement.                                                                  |
| `project_doc_max_bytes`            | Project-doc budget                  | Harness-engineering budget control.                                                                       |
| `tool_output_token_limit`          | Tool output budget                  | Harness-engineering budget control.                                                                       |
| `hide_agent_reasoning`             | Agent reasoning visibility          | Noise/privacy control.                                                                                    |
| `review_model`                     | Review route model                  | Optional review defaults.                                                                                 |
| `allow_login_shell`                | Shell behavior                      | Emit only when login-shell behavior is intentionally required.                                            |
| `project_doc_fallback_filenames`   | Project instruction fallback names  | OAL can include fallback docs for cross-surface projects.                                                 |

## Profiles

`[profiles.<name>]` accepts common config options as a reusable unit. OAL should render surface routes as named profiles when a setting differs by route.

Profile-scoped keys to use:

- `model`
- `model_provider`
- `model_reasoning_effort`
- `model_reasoning_summary`
- `model_verbosity`
- `plan_mode_reasoning_effort`
- `personality`
- `approval_policy`
- `approvals_reviewer`
- `sandbox_mode`
- `service_tier`
- `web_search`
- `tools`
- `features`
- `windows`

Profile rule: route-owned values go under profile tables. Root values are reserved for global defaults.

## Agents

`[agents]` accepts role definitions plus concurrency controls.

Emit allowlist:

- `agents.max_threads`
- `agents.max_depth`
- `agents.job_max_runtime_seconds`
- `agents.interrupt_message`
- `[agents.<role>].description`
- `[agents.<role>].config_file`
- `[agents.<role>].nickname_candidates`

OAL mapping:

- role record -> `[agents.<role>]`;
- role prompt/config -> generated `config_file`;
- role aliases -> `nickname_candidates`;
- swarm policy -> `max_threads`, `max_depth`, `job_max_runtime_seconds`.

## Apps/connectors

`[apps]` config controls connector exposure and tool approval.

Emit allowlist:

- `[apps._default].enabled`
- `[apps._default].destructive_enabled`
- `[apps._default].open_world_enabled`
- `[apps.<id>].enabled`
- `[apps.<id>].default_tools_enabled`
- `[apps.<id>].default_tools_approval_mode`
- `[apps.<id>].destructive_enabled`
- `[apps.<id>].open_world_enabled`
- `[apps.<id>.tools.<tool>].enabled`
- `[apps.<id>.tools.<tool>].approval_mode`

OAL rule: keep connector defaults restrictive unless a route needs them.

## Hooks

Codex hook events in schema:

- `PreToolUse`
- `PostToolUse`
- `UserPromptSubmit`
- `SessionStart`
- `Stop`
- `PermissionRequest`

Hook group shape:

- `matcher`
- `hooks`

Hook handler types:

- `command`
- `prompt`
- `agent`

Command handler fields:

- `type = "command"`
- `command`
- `timeout`
- `async`
- `statusMessage`

OAL policy mapping:

- command safety -> `PreToolUse`
- prompt/context injection -> `UserPromptSubmit`
- startup context -> `SessionStart`
- completion gate -> `Stop`
- approval guard -> `PermissionRequest`
- output checks -> `PostToolUse`

## Permissions

Codex exposes named permission profiles through `[permissions]`.

Filesystem concepts:

- access modes: `read`, `write`, `none`
- per-path mapping
- `glob_scan_max_depth`

Network concepts:

- enabled flag
- mode/domain allowlists where supported by schema branch

OAL rule: permissions are generated from route contract + install scope, not from prose.

## Tools

Useful tools keys:

- `view_image`
- web/search config where object-form tools are available
- shell/runtime feature keys under profile `features`

OAL rule: tool config belongs in adapter-owned profile fragments.

## Features to allow for OAL emission

Keep feature flags only when they directly affect OAL behavior:

- `codex_hooks`
- `multi_agent`
- `multi_agent_v2`
- `collaboration_modes`
- `default_mode_request_user_input`
- `fast_mode`
- `memories`
- `shell_tool`
- `shell_snapshot`
- `skill_mcp_dependency_install`
- `unified_exec`
- `prevent_idle_sleep`
- `apps`
- `connectors`
- `plugins`
- `request_permissions`
- `web_search`
- `image_generation`
- `in_app_browser`

Do not emit experimental realtime/thread endpoint knobs.

## Required feature defaults

Every OAL-generated Codex profile must set:

```toml
[features]
fast_mode = false
multi_agent = false
multi_agent_v2 = true
unified_exec = false
```

These defaults are part of the OAL model-balance contract:

- `fast_mode = false`: OAL does not burn usage for speed unless a route explicitly opts in.
- `multi_agent = false`: disable the non-v2 multi-agent path.
- `multi_agent_v2 = true`: OAL uses multi-agent routing as a core capability.
- `unified_exec = false`: OAL keeps stable hook/shell behavior until a dedicated route opts into different execution semantics.

## Replacement table

| Do not emit                                | Emit instead                                                                                      | Reason                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `approval_policy = "on-failure"`           | `approval_policy = "on-request"` for interactive, `approval_policy = "never"` for non-interactive | Schema description points users away from old auto-approve fallback behavior. |
| `approvals_reviewer = "guardian_subagent"` | `approvals_reviewer = "auto_review"`                                                              | Schema description names `auto_review` as current reviewer.                   |
| `experimental_realtime_*`                  | none                                                                                              | Schema says experimental / do not use.                                        |
| `experimental_thread_*`                    | none                                                                                              | Schema says experimental / do not use.                                        |

## OAL adapter decisions

- Render profile-first Codex config.
- Keep root config minimal.
- Emit current approvals keys only.
- Emit hooks from policy source, not hand-authored JSON.
- Emit agents from role records.
- Validate generated TOML against this study, upstream JSON Schema, and source/schemas/upstream/manifest.json provenance.

## Provenance checkpoint

- Raw schema cache: `source/schemas/upstream/codex-config.schema.json`.
- Manifest entry: `codex-config-schema` in `source/schemas/upstream/manifest.json`.
- Extraction policy: include current keys only; skip descriptions marked experimental endpoint, replacement-only, old fallback, no-op, or not emitted by project install.
