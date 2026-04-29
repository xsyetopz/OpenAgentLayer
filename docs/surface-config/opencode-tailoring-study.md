# OpenCode tailoring study

Purpose: define OpenAgentLayer defaults for generated OpenCode config files.

Authority: study input for `../../specs/surface-config-contract.md` and `../../specs/model-routing.md`.

Sources:

- `https://opencode.ai/docs/config/`
- `https://opencode.ai/config.json`

Retrieval date: 2026-04-29.

## Scope

This file defines how OAL should tailor OpenCode `opencode.json` output. The companion schema study lists keys. This study defines defaults, placement, and route behavior.

OpenCode config is project-friendly: it can define commands, skills, plugins, agents, provider/model settings, permissions, watcher ignores, snapshots, compaction, MCP servers, and instruction files. OAL should generate the smallest config that wires those concepts to the source graph.

## Config locations and precedence

OpenCode supports global and project config. OAL placement:

| Placement                 | Use                                                            |
| ------------------------- | -------------------------------------------------------------- |
| Project `opencode.json`   | commands, skills, plugin wiring, agent records, permissions, instructions, watcher ignores |
| Global config             | personal provider/model defaults, sharing preference, autoupdate preference |
| Route override            | model, agent, command subtask, permission shape                |
| Runtime generated files   | plugin implementation, command templates, skill directories    |

OAL project install should not write provider credentials or personal model keys unless explicitly requested.

## OAL OpenCode baseline

Baseline project config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "snapshot": true,
  "instructions": ["AGENTS.md", "docs/**/*.md", "specs/**/*.md"],
  "skills": {
    "paths": [".oal/opencode/skills"]
  },
  "plugin": [".oal/opencode/plugin.mjs"],
  "default_agent": "odysseus",
  "agent": {},
  "command": {},
  "permission": {
    "read": "allow",
    "edit": "ask",
    "bash": "ask",
    "webfetch": "ask",
    "websearch": "ask"
  },
  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 10000
  },
  "watcher": {
    "ignore": [
      ".git/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".oal/generated/**"
    ]
  }
}
```

Adapter must fill `agent` and `command` from source records.

Project install must not write `share` by default. Sharing preference is user/global unless explicitly selected for generated global output.

## Commands defaults

OpenCode command entries should be generated from OAL command records:

```json
{
  "command": {
    "review": {
      "description": "Run OAL review route",
      "template": "Use Nemesis route. Inspect diff. Return warranted findings only.",
      "agent": "nemesis",
      "subtask": true
    }
  }
}
```

Defaults:

- every command has `template`;
- command names match OAL source IDs;
- `agent` is required when route has an owner role;
- `model` appears only for route-specific override;
- `subtask = true` when command should isolate work from primary thread.

## Skills defaults

Project install:

```json
{
  "skills": {
    "paths": [".oal/opencode/skills"]
  }
}
```

Global install:

```json
{
  "skills": {
    "paths": ["~/.config/oal/opencode/skills"]
  }
}
```

Remote skill URLs require explicit source graph entries. OAL should not add remote URLs by default.

## Plugin defaults

OAL should prefer one generated plugin entry:

```json
{
  "plugin": [".oal/opencode/plugin.mjs"]
}
```

Plugin owns:

- route detection;
- hook bridge;
- destructive command policy;
- generated command helpers;
- validation/status integration.

Plugin options may be emitted when source graph declares them:

```json
{
  "plugin": [
    [".oal/opencode/plugin.mjs", { "profile": "oal" }]
  ]
}
```

## Agent defaults

OAL maps Greek role records to OpenCode agents:

```json
{
  "default_agent": "odysseus",
  "agent": {
    "odysseus": {
      "description": "Coordinator for packet-driven multi-step work",
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-6"
    },
    "nemesis": {
      "description": "Review and audit agent",
      "mode": "subagent"
    }
  }
}
```

Rules:

- `default_agent` must point at a primary agent.
- Subagents must be callable by commands and route policies.
- Model values come from `../../specs/model-routing.md`.
- Agent prompt content comes from OAL source files, not inline ad hoc config.

## Model/provider defaults

OpenCode model settings:

| Key                  | OAL use                                    | Placement |
| -------------------- | ------------------------------------------ | --------- |
| `model`              | default main model                         | global or route |
| `small_model`        | helper/summarizer model                    | global or route |
| `provider`           | provider definitions                       | global or explicit project |
| `enabled_providers`  | strict provider set                        | global or explicit project |
| `disabled_providers` | prevent auto-loaded providers              | global or explicit project |

OAL should not emit provider secrets. If provider config requires credentials, use environment or provider-native auth.

Suggested defaults by route:

- main implementation: Sonnet or GPT-class implementation model depending provider;
- planning: Opus or GPT planning model;
- helpers: Haiku or mini model;
- review: stronger reasoning model than implementation when usage budget permits.

## Permissions defaults

Project baseline:

```json
{
  "permission": {
    "read": "allow",
    "glob": "allow",
    "grep": "allow",
    "list": "allow",
    "edit": "ask",
    "bash": "ask",
    "task": "ask",
    "external_directory": "ask",
    "webfetch": "ask",
    "websearch": "ask",
    "skill": "ask"
  }
}
```

Policy rules:

- destructive bash patterns require plugin guard;
- external directory access asks by default;
- web access asks unless route explicitly requires research;
- task/subagent creation follows route budget.

## Compaction defaults

OpenCode docs expose:

```json
{
  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 10000
  }
}
```

OAL baseline:

- `auto = true`;
- `prune = true`;
- `reserved = 10000` for normal routes;
- `reserved = 20000` for long planning/review routes;
- compacted state must preserve route, changed files, validation evidence, blockers, and source URLs.

## Watcher defaults

OAL should ignore noisy trees:

```json
{
  "watcher": {
    "ignore": [
      ".git/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".oal/generated/**",
      ".turbo/**",
      ".next/**",
      "target/**"
    ]
  }
}
```

Adapter can add ecosystem-specific paths from detected package manifests, but must not ignore source directories.

## Snapshot defaults

```json
{
  "snapshot": true
}
```

OAL should enable snapshots by default because AI-agent work needs recoverable change tracking. Disable only by explicit user config.

## Sharing and update defaults

```json
{
  "share": "manual",
  "autoupdate": "notify"
}
```

OAL recommendation:

- `share = "manual"` for user-controlled session sharing;
- `share = "disabled"` for sensitive repos;
- `autoupdate = "notify"` or user preference;
- no automatic sharing default.
- project install must not write `share` unless user explicitly selects global/user-owned output.

## Tool output defaults

Use `tool_output` to avoid giant logs in context:

```json
{
  "tool_output": {
    "max_lines": 1200,
    "max_chars": 120000
  }
}
```

If schema shape differs, adapter must use the schema-known field names and keep this intent: validation evidence enough, repeated log floods trimmed.

## MCP defaults

OAL emits MCP entries only from source graph:

```json
{
  "mcp": {}
}
```

Rules:

- local MCP needs command, args, env, enabled, timeout;
- remote MCP needs URL/header/auth policy, enabled, timeout;
- secrets never live in generated project config.

## Do-not-emit defaults

OAL should not emit:

- provider credentials;
- automatic sharing for all sessions;
- remote skill URLs without source records;
- provider allow/deny lists unless model policy requires them;
- experimental keys as adapter baseline;
- broad always-allow bash policy;
- watcher ignores that hide source trees.

## Progress checklist

- [x] Sealed — OpenCode project baseline defined.
- [x] Sealed — Command, skill, plugin, agent defaults mapped.
- [x] Sealed — Permission, compaction, watcher, snapshot defaults defined.
- [x] Sealed — Sharing/update/provider/MCP placement separated.
