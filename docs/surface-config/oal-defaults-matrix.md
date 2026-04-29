# OAL surface defaults matrix

Purpose: one matrix of generated config defaults across Codex, Claude Code, and OpenCode.

Authority: quick-reference input for adapter implementation agents.

Sources:

- `codex-tailoring-study.md`
- `claude-tailoring-study.md`
- `opencode-tailoring-study.md`
- `../../specs/model-routing.md`
- `../../specs/surface-config-contract.md`

Retrieval date: 2026-04-29.

## Status vocabulary

- `[ ] Queued`: not started.
- `[~] Active`: underway.
- `[x] Sealed`: accepted and ready for implementation.

## Placement matrix

| Concept           | Codex placement                         | Claude placement                                  | OpenCode placement                       | OAL rule |
| ----------------- | --------------------------------------- | ------------------------------------------------- | ---------------------------------------- | -------- |
| Project behavior  | `[profiles.oal]` plus generated files   | `.claude/settings.json`                           | `opencode.json`                          | Project install writes team-safe behavior. |
| User model prefs  | user/global `config.toml` profile       | `~/.claude/settings.json`                         | global OpenCode config                   | Do not write during project install. |
| Hooks             | `[hooks]` in generated profile/root     | `hooks` in settings                               | plugin/hook bridge                       | Generated from policy source. |
| Commands          | role/skill/plugin route files           | slash commands/subagents/instructions as surface allows | `command` object                     | Generated from command records. |
| Agents            | `[agents]` and role config files        | `.claude/agents/` plus optional `agent` setting   | `agent` object                           | Generated from Greek role records. |
| Skills            | Codex skills/plugins                    | Claude skills/plugins where supported             | `skills.paths`                           | Generated source tree copied per surface. |
| Permissions       | `approval_policy`, `sandbox_mode`, `[permissions]` | `permissions`                          | `permission`                             | Route contract is source. |
| Model routing     | `model`, `model_reasoning_effort`, `plan_mode_reasoning_effort` | `model`, `effortLevel`, `availableModels`, env pins | `model`, `small_model`, agent model | Model spec is source. |
| Context budgets   | `project_doc_max_bytes`, token limits, compaction | plan dir, memory/UI settings, effort | `compaction`, `tool_output`, watcher     | Avoid context floods while preserving evidence. |
| Sharing           | not default OAL concern                 | not default OAL concern                           | `share = "manual"`                       | User controls sharing. |
| Provider secrets  | never project-generated                 | never project-generated                           | never project-generated                  | Use provider-native auth/env. |

## Required generated defaults

### Codex

```toml
[features]
fast_mode = false
multi_agent_v2 = true
unified_exec = false
codex_hooks = true
collaboration_modes = true
default_mode_request_user_input = true
memories = true
shell_tool = true
shell_snapshot = true
skill_mcp_dependency_install = true
```

Validation:

- rendered TOML parses;
- features table has required values;
- route profiles do not enable Fast mode unless route asks for speed;
- approval reviewer uses `auto_review`;
- generated hooks point at installed `.mjs` files.

### Claude Code

```json
{
  "$schema": "https://www.schemastore.org/claude-code-settings.json",
  "includeGitInstructions": false,
  "fastModePerSessionOptIn": true,
  "plansDirectory": "./plans"
}
```

Validation:

- settings JSON parses;
- shared project file has no secrets;
- model/env/user UI settings are absent from project file unless explicitly selected;
- `statusLine` command path exists when emitted;
- HTTP hooks have allowlists when emitted.

### OpenCode

```json
{
  "$schema": "https://opencode.ai/config.json",
  "snapshot": true,
  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 10000
  },
  "watcher": {
    "ignore": [".git/**", "node_modules/**", "dist/**", "build/**", "coverage/**", ".oal/generated/**"]
  }
}
```

Validation:

- config validates against OpenCode schema;
- `default_agent` names a primary agent;
- every generated command names valid agent if `agent` is set;
- `permission.bash` does not default to unconditional allow;
- plugin path exists when emitted.
- project install does not write `share`; global/user-owned output may recommend `share = "manual"`.

## Model defaults matrix

| OAL plan/profile | Codex default                                   | Claude default                         | OpenCode default intent |
| ---------------- | ----------------------------------------------- | -------------------------------------- | ----------------------- |
| Low-cost helper  | `gpt-5.4-mini`, effort `low`                    | `haiku`, effort `low`                  | cheapest capable helper model |
| Implementation   | `gpt-5.4`, effort `medium`; or `gpt-5.3-codex` for code-heavy route | `sonnet`, effort `medium` | daily implementation model |
| Planning         | `gpt-5.5`, effort `high` on Pro; `gpt-5.4`, effort `medium` on Plus | `opusplan` or `opus` by Max tier | strongest planning model in provider |
| Review           | `gpt-5.5` or `gpt-5.3-codex`, effort `high`     | `opus`/`sonnet`, effort `medium` or `high` | stronger-than-implementation review model |
| Long context     | explicit model context settings                 | explicit `[1m]` alias/full ID          | provider long-context model |

Rules:

- no `xhigh` or maximum effort default;
- helper routes stay cheap;
- planner/reviewer routes spend budget only where route owns acceptance gate;
- subagents inherit role-specific model class, not one global model.

## Do-not-emit matrix

| Surface | Do not emit by default | Emit/recommend instead |
| ------- | ---------------------- | ---------------------- |
| Codex | automatic speed burn, broad destructive app defaults, credentials, unrestricted network policy | route-owned speed, destructive guard, env/provider auth, route permissions |
| Claude | personal model/env/UI in shared project settings, maximum effort, broad shell allow, HTTP hooks without allowlists | user/global recommendations, medium/high by route, exact permission rules, URL/env allowlists |
| OpenCode | automatic session sharing, provider credentials, broad bash allow, remote skills without source record, source-hiding watcher ignores | manual sharing, provider-native auth, ask policy, explicit source records, safe ignore list |

## Implementation checklist

- [x] Sealed — Codex defaults captured.
- [x] Sealed — Claude defaults captured.
- [x] Sealed — OpenCode defaults captured.
- [x] Sealed — Placement classes mapped across surfaces.
- [x] Sealed — Validation expectations listed for adapters.
