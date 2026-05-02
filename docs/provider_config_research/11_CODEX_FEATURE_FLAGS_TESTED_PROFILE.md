# Codex feature flags: OAL native-capability profile

This file captures user-researched Codex `config.toml` feature keys as an OAL capability-utilization policy.

The goal is **not** conservative defaults. The goal is: **take advantage of every useful Codex-native capability OAL can own, validate, and deploy**, while explicitly pinning off features that conflict with OAL’s wrapper/runtime/deploy model, duplicate user tools, are deprecated, or are not yet wired into real OAL product behavior.

In other words: maximize useful native capability, not maximize `true` booleans.

## Important key corrections

- Current Codex schema exposes image viewing as `tools_view_image` in the profile/top-level config shape. Some tested builds/config examples discuss image viewing as a feature-style toggle; OAL should prefer schema-validated `tools_view_image = true` unless the local schema cache explicitly supports `features.view_image`.
- `multi_agent_v2` is schema-supported as a boolean or object. OAL should keep it explicitly on until OAL implements and validates a compatible orchestration contract.

## OAL maximum-use managed profile block

OAL-managed Codex profiles should emit a deliberate feature block rather than leaving behavior implicit:

```toml
[profiles.openagentlayer.features]
shell_zsh_fork = true
steer = true
apps = false
tui_app_server = true
memories = true
sqlite = true
plugins = true
codex_hooks = true
responses_websockets = true
responses_websockets_v2 = true
unified_exec = false
multi_agent = false
multi_agent_v2 = true
shell_snapshot = false
collaboration_modes = false
codex_git_commit = true
fast_mode = false
voice_transcription = false
undo = false
js_repl = false
```

Companion profile setting:

```toml
[profiles.openagentlayer]
tools_view_image = true
```

If the local Codex schema for a target install supports `features.view_image`, OAL may emit it as a version-gated compatibility path, but the preferred schema-visible key is `tools_view_image`.

## Rationale by key

| Key                       | OAL-managed state | Capability interpretation                                                                                                                                                                      |
| ------------------------- | ----------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shell_zsh_fork`          |            `true` | Use the synchronous/custom shell execution path useful for serious coder workflows.                                                                                                            |
| `tools_view_image`        |            `true` | Use image viewing for UI work, screenshots, visual debugging, design review, and multimodal repo tasks.                                                                                        |
| `steer`                   |            `true` | Use mid-turn and inter-agent steering/communication behavior where supported.                                                                                                                  |
| `apps`                    |           `false` | Explicitly do not enable app/connector surfaces until OAL deploys and validates app config. This is controlled exclusion, not omission.                                                        |
| `tui_app_server`          |            `true` | Use richer TUI/app-server behavior when supported.                                                                                                                                             |
| `memories`                |            `true` | Use continuity when OAL also controls compaction/continuation guidance.                                                                                                                        |
| `sqlite`                  |            `true` | Use persistent local state for OAL hooks/stateful workflows when the installed Codex build honors this flag.                                                                                   |
| `plugins`                 |            `true` | Use Codex plugin/skill payloads as first-class OAL surfaces.                                                                                                                                   |
| `codex_hooks`             |            `true` | Use Codex hooks for running-state tracking and deterministic guardrails.                                                                                                                       |
| `responses_websockets`    |            `true` | Use faster streaming/runtime path where supported.                                                                                                                                             |
| `responses_websockets_v2` |            `true` | Use the newer faster websocket path where supported.                                                                                                                                           |
| `unified_exec`            |           `false` | Controlled exclusion for the normal profile because parallel exec/stdin polling can conflict with wrapper expectations. Enable only in an owned long-runtime profile with acceptance coverage. |
| `multi_agent`             |           `false` | Controlled exclusion because it is an incompatible orchestration pattern for OAL’s managed routing model.                                                                                      |
| `multi_agent_v2`          |            `true` |                                                                                                                                                                                                |
| `shell_snapshot`          |           `false` | Controlled exclusion because shell snapshots can interfere with shell wrappers.                                                                                                                |
| `collaboration_modes`     |           `false` | Controlled exclusion because UX variants should be explicit OAL/user choices, not implicit mode drift.                                                                                         |
| `codex_git_commit`        |           `false` | Controlled exclusion because commits should remain manual or OAL-managed with explicit attribution and guardrails.                                                                             |
| `fast_mode`               |           `false` | Controlled exclusion because OAL should achieve speed through model/profile routing, websockets, and concurrency, not a blanket fast-mode semantic shift.                                      |
| `voice_transcription`     |           `false` | Controlled exclusion because users can use dedicated tools such as Wispr Flow.                                                                                                                 |
| `undo`                    |           `false` | Controlled exclusion because it can conflict conceptually with version control and manifest-owned deploy.                                                                                      |
| `js_repl`                 |           `false` | Controlled exclusion because terminal access is clearer unless OAL owns a real REPL integration.                                                                                               |

## Dedicated long-runtime profile exception

OAL should define a separate long-runtime profile with `unified_exec = true` only when acceptance tests prove it does not break wrappers, hook stdin, or command polling in the target Codex build.

Example:

```toml
[profiles.openagentlayer-runtime-long.features]
shell_zsh_fork = true
steer = true
tui_app_server = true
memories = true
sqlite = true
plugins = true
codex_hooks = true
responses_websockets = true
responses_websockets_v2 = true
unified_exec = true
prevent_idle_sleep = true
multi_agent = false
multi_agent_v2 = true
shell_snapshot = false
collaboration_modes = false
codex_git_commit = true
fast_mode = false
voice_transcription = false
undo = false
js_repl = false
```

This profile is not a conservative fallback. It is the owned place where OAL exploits long-running execution capability after proving compatibility.

## Renderer requirements

OAL’s Codex renderer must treat this as an exploitation contract:

1. Emit these features inside each OAL-managed profile, not as a global blanket, unless Codex requires top-level feature placement.
2. Validate every emitted feature key against the cached current Codex schema.
3. Fail if the renderer emits typo keys such as `shell_shapshot`.
4. Fail if blocked Codex models, deprecated approval policy values, or blocked Claude model family Claude model names appear in generated output.
5. Preserve user-owned feature overrides outside OAL-managed profile blocks.
6. Treat `false` entries as deliberate product decisions with reasons, not as unresearched omissions.
7. Enable a feature only when OAL owns the generated/deployed/runtime behavior that uses it.

## Acceptance checks

The OAL acceptance suite should assert:

- generated `config.toml` contains the native-capability feature block for every OAL Codex profile that needs it;
- `tools_view_image = true` is emitted in the schema-supported location;
- `shell_snapshot = false` is emitted.
- `multi_agent = false` and `multi_agent_v2 = true` are explicitly emitted as controlled exclusions;
- `unified_exec = true` appears only in a deliberately named long-runtime profile with fixture coverage;
- `plugins = true` is emitted only if the plugin payload is deployed and manifest-owned;
- `codex_hooks = true` is emitted only if hook runtime scripts are deployed;
- generated TOML parses and validates against the current Codex schema cache.
