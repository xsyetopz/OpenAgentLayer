# Codex `config.toml` Research for OAL

Sources studied:

- OpenAI Codex schema: `codex-rs/core/config.schema.json`.
- OpenAI Codex config reference.
- Codex hook discovery implementation.
- Codex AGENTS.md and agent-loop docs.

## What OAL should treat as Codex-native

Codex is not just a prompt sink. It has multiple native surfaces OAL can render and deploy:

- `~/.codex/config.toml` and project `.codex/config.toml` layers.
- `AGENTS.md` and configured `model_instructions_file`.
- `[agents]` role definitions with spawn guidance and optional role-specific config files.
- profile-scoped settings in `[profiles.<name>]`.
- profile-scoped feature flags.
- Codex hooks loaded from TOML or `hooks.json`.
- plugin/skill surfaces where supported.
- approval policy, sandbox policy, model provider, reasoning effort, summary, verbosity, service tier.
- SQLite/history/memory settings.
- app/connector tool approval configuration.

OAL should render Codex artifacts as Codex-native output, not generic command cards.

## Top-level and profile settings OAL should use

Codex supports profile objects with many common settings. OAL should render stable managed profiles rather than duplicating all settings at top-level.

OAL capability-maximizing managed profiles:

- `oal` — normal primary profile.
- `oal-implement` — implementation-heavy route.
- `oal-utility` — cheap utility/search/validation route.
- `oal-auto` — sandboxed auto-approval route when explicitly requested.
- `oal-runtime-long` — long-running background/test route.

Use:

- `model`
- `model_provider` only if OAL intentionally controls provider selection.
- `model_reasoning_effort`
- `plan_mode_reasoning_effort`
- `model_reasoning_summary`
- `model_verbosity`
- `approval_policy`
- `approvals_reviewer`
- `sandbox_mode`
- `service_tier`
- `model_instructions_file`
- `tools`
- `web_search`
- profile-scoped `features`.

Use `approvals_reviewer = "auto_review"` if OAL wants an automated approval reviewer. Do not emit the legacy alias `guardian_subagent` even though the schema accepts it for compatibility.

Do not emit `approval_policy = "on-failure"`; Codex schema marks it deprecated and marks the replacement path as `on-request` for interactive runs or `never` for non-interactive runs.

## Codex model policy for OAL

OAL should only render these Codex models:

- `gpt-5.5`
- `gpt-5.4-mini`
- `gpt-5.3-codex`

Do not render:

- `gpt-5.4`
- `gpt-5.2`
- stale v3 model names.

OAL capability-maximizing routing:

| Route class                                                         | Model           | Effort      |
| ------------------------------------------------------------------- | --------------- | ----------- |
| architecture, hard review, orchestration                            | `gpt-5.5`       | medium/high |
| implementation, refactor, bug fix                                   | `gpt-5.3-codex` | medium/high |
| cheap utility, command discovery, simple validation, parsing output | `gpt-5.4-mini`  | low/medium  |

Avoid `xhigh` in the baseline. Render it only for explicit break-glass routes.

## `[agents]` and role-specific config files

Codex supports an `[agents]` table with:

- `max_threads`
- `max_depth`
- `job_max_runtime_seconds`
- `interrupt_message`
- arbitrary named agent role entries.

Each agent role can include:

- `description`
- `nickname_candidates`
- `config_file`

This is important for OAL. Instead of compressing a whole agent into one shallow TOML block, OAL should render:

```toml
[agents]
max_threads = 4
max_depth = 1
job_max_runtime_seconds = 1800

[agents.hephaestus]
description = "Implementation/refactor agent. Use for production code edits after repo evidence is inspected."
nickname_candidates = ["hephaestus", "implementer"]
config_file = "./agents/hephaestus.toml"
```

Then `agents/hephaestus.toml` can carry role-specific model, sandbox, tooling, and deep instructions if Codex supports that config-file layer in the installed version. OAL should validate this against the schema.

## Feature flags OAL should exploit

Useful feature flags from Codex schema that OAL should actively exploit when they improve the generated/deployed product:

- `codex_hooks`
- `hooks`
- `plugin_hooks`
- `multi_agent`
- `multi_agent_v2`
- `child_agents_md`
- `sqlite`
- `memories`
- `memory_tool`
- `shell_tool`
- `shell_snapshot`
- `shell_zsh_fork`
- `unified_exec`
- `web_search`
- `search_tool`
- `plugins`
- `goals`
- `prevent_idle_sleep`
- `tui_app_server`
- `tool_search`
- `tool_suggest`
- `responses_websockets`
- `responses_websockets_v2`

OAL should exploit every useful native feature it owns, but not blindly turn every boolean on. It should use feature flags per profile:

- normal: hooks, multi-agent, sqlite/history, search/web where needed.
- utility: minimal costly features.
- implementation: hooks, multi-agent, shell, patch/edit support.
- runtime-long: unified exec, prevent idle sleep, longer runtime.

## Hooks

Codex hook discovery supports hooks from TOML and `hooks.json`. It loads handlers from config layers and plugin hook sources. Hook events observed in source:

- `PreToolUse`
- `PermissionRequest`
- `PostToolUse`
- `SessionStart`
- `UserPromptSubmit`
- `Stop`

Codex currently treats command hooks as runnable. Prompt and agent hook handler types are present in schema but discovery warns and skips them as unsupported. Async hooks are also skipped as unsupported in the observed discovery implementation.

OAL should therefore render Codex hook handlers as command hooks using executable `.mjs` scripts. Do not rely on prompt/agent hook types until installed Codex support is verified.

OAL Codex hook surfaces to exploit:

- `UserPromptSubmit`: route context, queue/prompt guard, project context injection where safe.
- `PreToolUse`: destructive command guard, secret read guard, generated-file edit guard, branch protections.
- `PermissionRequest`: risk review context or denial policy.
- `PostToolUse`: failure signals, generated drift capture, changed-file context.
- `SessionStart`: git/project context, model/plan context.
- `Stop`: completion gate, validation-evidence gate, no-placeholder/no-demo gate.

## Config merge and ownership

OAL must not clobber user `config.toml`. It should:

- write a managed project file or managed block/structured merge.
- track owned keys in a manifest.
- preserve non-OAL profiles, MCP servers, model providers, apps, user env, user history settings.
- prefer project scope when possible.
- provide uninstall that removes only manifest-owned OAL keys/files.

## Deprecated/legacy/compatibility avoidance

Avoid:

- `approval_policy = "on-failure"`.
- `approvals_reviewer = "guardian_subagent"`; use `auto_review`.
- legacy no-op ghost snapshot settings.
- legacy managed config paths except as uninstall/migration cleanup.
- emitting `gpt-5.4`, `gpt-5.2`, or v3 stale model values.
- prompt/agent hook handler types unless the installed Codex version proves support.

## OAL Codex rendering outputs

OAL should render at least:

```text
.codex/config.toml or managed merge into ~/.codex/config.toml
.codex/agents/*.toml
AGENTS.md or .codex/AGENTS.md depending project policy
.codex/openagentlayer/skills/*/SKILL.md
.codex/openagentlayer/hooks/*.mjs
.codex/openagentlayer/runtime/*.mjs
.codex/openagentlayer/manifest.json
```

Final names should be `openagentlayer` or `oal`, not `openagentsbtw`.

## User-researched native-capability feature profile for OAL-managed Codex profiles

See `11_CODEX_FEATURE_FLAGS_TESTED_PROFILE.md` for the tested feature policy. In summary:

- enable: `shell_zsh_fork`, `steer`, `tui_app_server`, `memories`, `sqlite`, `plugins`, `codex_hooks`, `responses_websockets`, `responses_websockets_v2`;
- emit `tools_view_image = true` in the schema-supported profile/top-level location;
- explicitly pin off as controlled exclusions: `apps`, `unified_exec`, `multi_agent`, `shell_snapshot`, `collaboration_modes`, `fast_mode`, `voice_transcription`, `undo`, `js_repl`;
- allow `unified_exec = true` only in a dedicated tested long-runtime profile;
- reject typo keys such as `snell_shapshot`.
