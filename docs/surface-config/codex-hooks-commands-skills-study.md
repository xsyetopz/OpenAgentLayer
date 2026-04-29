# Codex hooks, commands, and skills study

Purpose: capture current Codex hook support and practical command/skill render targets for OAL.

Authority: study input for `../../specs/hook-policy-engine.md` and `../../specs/command-skill-format.md`.

Sources:

- `https://raw.githubusercontent.com/openai/codex/refs/heads/main/codex-rs/core/config.schema.json`
- `https://openai.com/academy/codex-plugins-and-skills/`

Retrieval date: 2026-04-29.

## Scope

Codex exposes hooks through `config.toml`, agents through `[agents]`, and skills through plugin skill folders. OAL should not invent a separate Codex command file format unless upstream adds one. OAL command records render as Codex-invocable skills or plugin-driven route prompts.

## Hook support

Codex schema lists this hook event set:

- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `Stop`
- `PermissionRequest`

Hook group shape:

```toml
[[hooks.PreToolUse]]
matcher = "shell_command"

[[hooks.PreToolUse.hooks]]
type = "command"
command = "~/.codex/openagentlayer/hooks/destructive-command.mjs"
timeout = 10
async = false
statusMessage = "checking command policy"
```

Handler types:

- `command`: OAL default. Runs a command, supports `command`, `timeout`, `async`, `statusMessage`.
- `prompt`: use only for explicit review/rewrite policy.
- `agent`: use only for explicit delegated review policy.

OAL render rules:

- Runtime hook scripts are `.mjs`.
- Installed hook scripts must be self-contained.
- `matcher` should be narrow for tool events and omitted only for lifecycle events.
- Blocking hooks return structured output when the surface supports it; otherwise they use documented exit behavior from the Codex runtime.
- OAL must enable `features.codex_hooks = true` in Codex profiles that emit hooks.

## OAL event mapping

| OAL policy category | Codex event | Default handler | Notes |
| ------------------- | ----------- | --------------- | ----- |
| `session_context` | `SessionStart` | `command` | Verify profile, runtime paths, project docs. |
| `input_guard` | `UserPromptSubmit` | `command` | Inject OAL route context and prompt policy. |
| `execution_guard` | `PreToolUse` | `command` | Destructive shell, RTK, secret read, network policy. |
| `output_safety` | `PostToolUse` | `command` | Generated drift and artifact checks. |
| `completion_gate` | `Stop` | `command` or `agent` | Validation and acceptance gate. |
| `delegation` | `PermissionRequest` | `command` or `agent` | Approval summary and risk classification. |
| `vcs_gate` | `PreToolUse`, `PostToolUse`, `Stop` | `command` | Git command guard, diff-state checks, final VCS gate. |

## Command support

Codex Academy describes skill invocation with `$skill-name` in a thread. Current public sources do not define a standalone project command file format equivalent to OpenCode `.opencode/commands/*.md` or Claude `.claude/skills/*.md` slash commands.

OAL decision:

- Render OAL command records to Codex skills.
- Command aliases become skill trigger text and generated route examples.
- Command arguments render as argument prose in `SKILL.md`; Codex-specific runtime may parse the first prompt line when a route needs structured args.
- Built-in Codex routes such as review remain surface-owned; OAL references them only when the route contract explicitly calls for native behavior.

## Skill support

Codex plugin shape observed from installed plugin examples:

```text
<plugin>/
├── .codex-plugin/
│   └── plugin.json
└── skills/
    └── <skill-id>/
        └── SKILL.md
```

Plugin manifest shape used by OAL:

```json
{
  "name": "openagentlayer",
  "version": "4.0.0",
  "description": "OpenAgentLayer routes, skills, and hook defaults for Codex",
  "skills": "./skills/",
  "interface": {
    "displayName": "OpenAgentLayer",
    "shortDescription": "Portable agent behavior layer for Codex",
    "capabilities": ["Read", "Write", "Bash", "Search"]
  }
}
```

Codex skill markdown shape used by OAL:

```markdown
---
name: review
description: Review current changes with warranted findings and validation gates.
user-invocable: true
---
# Review

Use the Nemesis role. Inspect current changes. Return only warranted findings.
```

OAL rule: shared skill body comes from OAL source markdown. Surface metadata is adapter output.

## File targets

Project install:

- `.codex-plugin/plugin.json` only inside generated Codex plugin package.
- `skills/<id>/SKILL.md` inside generated Codex plugin package.
- `~/.codex/config.toml` profile entries only for explicit global install.
- Project-facing `AGENTS.md` remains normal instruction source.

Global install:

- plugin package under Codex plugin location chosen by installer;
- `config.toml` profile with hook paths and agent role files;
- hook runtime under `~/.codex/openagentlayer/hooks/`.

## Do-not-emit decisions

OAL should not emit:

- standalone Codex command files without upstream proof;
- hook commands that rely on repo-relative imports after install;
- broad `PreToolUse` matchers where a narrow matcher exists;
- prompt/agent hooks for deterministic checks that can be command hooks;
- plugin manifest fields not used by Codex plugin loader.

## Progress checklist

- [x] Sealed — Codex hook event set captured.
- [x] Sealed — Codex hook handler types captured.
- [x] Sealed — Codex commands mapped to skills/plugin route prompts.
- [x] Sealed — Codex skill/plugin file target documented.
