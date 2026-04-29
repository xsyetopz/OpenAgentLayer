# Claude Code tailoring study

Purpose: define OpenAgentLayer defaults for generated Claude Code settings files.

Authority: study input for `../../specs/surface-config-contract.md` and `../../specs/model-routing.md`.

Sources:

- `https://code.claude.com/docs/en/settings`
- `https://code.claude.com/docs/en/model-config`
- `https://www.schemastore.org/claude-code-settings.json`

Retrieval date: 2026-04-29.

## Scope

This file is about tailoring Claude Code settings for OAL. It does not define the source graph. It tells adapters where settings belong, which defaults OAL should emit, and which values must stay user/local or managed by organization policy.

Claude settings precedence from highest to lowest:

1. Managed settings
2. Command-line arguments
3. Local project settings `.claude/settings.local.json`
4. Shared project settings `.claude/settings.json`
5. User settings `~/.claude/settings.json`

OAL rule: shared project settings contain team-safe behavior only. Personal model, effort, UI, environment, and subscription choices belong in user/local settings unless the user explicitly requests generated global config.

## OAL Claude baseline

Project-shared `.claude/settings.json` should contain only values safe for source control:

```json
{
  "$schema": "https://www.schemastore.org/claude-code-settings.json",
  "includeGitInstructions": false,
  "fastModePerSessionOptIn": true,
  "plansDirectory": "./plans",
  "permissions": {},
  "hooks": {},
  "statusLine": {
    "type": "command",
    "command": ".oal/hooks/status-line.mjs"
  }
}
```

Rules:

- `includeGitInstructions = false` when OAL supplies git workflow skills/hooks.
- `fastModePerSessionOptIn = true` if OAL touches Fast mode settings at all.
- `plansDirectory = "./plans"` aligns Claude plan artifacts with OAL plan docs.
- `statusLine` should be concise and deterministic.
- `permissions` and `hooks` are emitted from policy records, not prose.

## User/global Claude baseline

User/global settings may carry personal defaults:

```json
{
  "$schema": "https://www.schemastore.org/claude-code-settings.json",
  "model": "opusplan",
  "effortLevel": "medium",
  "availableModels": ["haiku", "sonnet", "opus", "opusplan"],
  "env": {
    "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet"
  },
  "autoMemoryDirectory": true,
  "cleanupPeriodDays": 30
}
```

OAL should not write user/global settings during project install. It may render a recommended file or write it only during explicit global install.

## Model and subscription defaults

Claude Code now centers subscription behavior around Max plans for OAL use:

| OAL subscription profile | Default main route | Planning route | Helper route | Notes |
| ------------------------ | ------------------ | -------------- | ------------ | ----- |
| `claude-max-5`           | `sonnet`           | `opusplan`     | `haiku`      | Use Opus sparingly; subagents default to Sonnet/Haiku. |
| `claude-max-20`          | `opusplan`         | `opus`         | `haiku`      | Stronger planning allowance; still route helpers cheaply. |
| long-context route       | explicit `[1m]`    | explicit `[1m]`| `haiku`      | Use only when task needs giant context. |

Alias behavior to encode in OAL docs and source records:

- `haiku`: simple tasks, summaries, background work.
- `sonnet`: daily implementation and normal subagent execution.
- `opus`: complex reasoning.
- `opusplan`: Opus during plan mode, Sonnet during execution.
- `opus[1m]` and `sonnet[1m]`: long-context aliases for supported accounts.

Exact model ID rules:

- Use `claude-opus-4-7` when OAL wants current Opus behavior by exact ID.
- Use `claude-sonnet-4-6` when OAL wants current Sonnet behavior by exact ID.
- Use `claude-opus-4-6` only when OAL intentionally pins Opus 4.6.
- Use `claude-opus-4-6[1m]` only for routes that need the 1M context version.

## Effort defaults

Claude `effortLevel` controls reasoning budget. OAL defaults:

| Route kind        | Max 5 default | Max 20 default | Notes |
| ----------------- | ------------- | -------------- | ----- |
| planning          | `medium`      | `high`         | Architecture, migrations, source decisions. |
| implementation    | `medium`      | `medium`       | Main code/doc work. |
| review            | `medium`      | `high`         | Risk-heavy review may use higher effort. |
| validation        | `low`         | `medium`       | Use higher only for flaky failures. |
| summaries/helpers | `low`         | `low`          | Prefer Haiku. |

Do not use maximum effort by default. OAL may route maximum effort only through explicit high-stakes acceptance gates.

## Available models

Use `availableModels` to keep user picker and OAL routes aligned:

```json
{
  "availableModels": ["haiku", "sonnet", "opus", "opusplan", "sonnet[1m]", "opus[1m]"]
}
```

Placement:

- project-shared: only when project truly requires a narrow model set;
- user/global: normal OAL recommendation;
- managed: only organization policy.

Arrays merge and deduplicate at normal settings levels. Managed policy is required for a strict allowlist.

## Environment model pins

OAL may recommend exact alias pins through `env`:

```json
{
  "env": {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-6",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5",
    "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet"
  }
}
```

Placement:

- user/global or managed only;
- project-shared only if the project has a documented route requirement and no secrets.

Do not emit environment secrets in project files.

## Permissions defaults

Project-shared baseline should use explicit allow/ask/deny rules:

```json
{
  "permissions": {
    "allow": [
      "Read(./**)",
      "Grep",
      "Glob",
      "LS"
    ],
    "ask": [
      "Bash(*)",
      "Edit",
      "Write",
      "MultiEdit"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)"
    ]
  }
}
```

OAL route contract expands this baseline:

- test/build commands may be allowed exactly;
- destructive shell commands ask or deny by route;
- secret paths deny read by default;
- MCP tools require explicit source records.

## Hook defaults

OAL should prefer command hooks:

| Event              | Default use                                      | Handler |
| ------------------ | ------------------------------------------------ | ------- |
| `UserPromptSubmit` | route context injection                          | command |
| `SessionStart`     | OAL runtime health and plan directory check      | command |
| `PreToolUse`       | destructive action guard                         | command |
| `PostToolUse`      | generated artifact drift checks                  | command |
| `Stop`             | validation gate and handoff enforcement          | command |

HTTP hooks:

- require `allowedHttpHookUrls`;
- require `httpHookAllowedEnvVars` if headers interpolate environment values;
- should not be emitted by default.

Prompt/agent hooks:

- useful for review policies;
- must name model and timeout if OAL needs deterministic budget.

## UI/noise defaults

User-owned settings:

| Key                    | OAL recommendation                    | Placement |
| ---------------------- | ------------------------------------- | --------- |
| `awaySummaryEnabled`   | true for long tasks                   | user/global |
| `showThinkingSummaries`| concise summaries                     | user/global |
| `spinnerTipsEnabled`   | false for experienced users           | user/global |
| `prefersReducedMotion` | user accessibility choice             | user/global |
| `viewMode`             | user preference                       | user/global |
| `tui`                  | user terminal preference              | user/global |

Project-safe setting:

- `statusLine`: OAL may emit command-backed status because it reflects route state, not user theme.

## Planning defaults

`plansDirectory` should be project-shared:

```json
{
  "plansDirectory": "./plans"
}
```

OAL uses this so Claude, Codex, OpenCode, and generated docs share one plan corpus.

## Plugin and marketplace defaults

Project-shared OAL may emit:

```json
{
  "enabledPlugins": [],
  "extraKnownMarketplaces": []
}
```

Only populate when source graph names a plugin or marketplace. Organization policy keys such as strict marketplace allowlists belong in managed settings.

## Managed-only notes

Normal OAL install does not write managed settings. OAL docs may describe:

- `allowedChannelPlugins`;
- `allowedMcpServers`;
- `allowManagedHooksOnly`;
- `allowManagedMcpServersOnly`;
- `allowManagedPermissionRulesOnly`;
- strict marketplace policy.

These are policy-owner concerns, not default project generation.

## Do-not-emit defaults

OAL should not emit:

- personal subscription choices in shared project settings;
- API keys or auth environment values;
- broad `Bash(*)` allow rules;
- HTTP hooks without URL allowlists;
- maximum effort defaults;
- `availableModels` in project scope unless the project needs it;
- managed policy files during normal install.

## Progress checklist

- [x] Sealed — Claude settings precedence captured.
- [x] Sealed — Project/user/global setting placement defined.
- [x] Sealed — Max 5/20 model routing defaults defined.
- [x] Sealed — `haiku`, `opus`, `opusplan`, exact ID, and `[1m]` rules captured.
- [x] Sealed — Hooks, permissions, UI/noise, and managed-only settings separated.
