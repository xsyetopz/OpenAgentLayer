# Claude Code hooks, commands, and skills study

Purpose: capture current Claude Code hook support and command/skill/subagent render targets for OAL.

Authority: study input for `../../specs/hook-policy-engine.md` and `../../specs/command-skill-format.md`.

Sources:

- `https://code.claude.com/docs/en/hooks`
- `https://code.claude.com/docs/en/slash-commands`
- `https://code.claude.com/docs/en/sub-agents`

Retrieval date: 2026-04-29.

## Scope

Claude Code has rich hooks, skills, custom commands, and subagents. OAL should prefer modern skill files for command-like workflows because Claude docs say command files still work but skills are recommended and support supporting files.

## Hook support

Claude Code hooks can be defined in:

- user settings;
- project settings;
- local project settings;
- plugin hook files;
- skill frontmatter;
- subagent frontmatter.

Handler types:

- `command`
- `http`
- `mcp`
- `prompt`
- `agent`

Default OAL handler is `command`. HTTP requires explicit URL allowlist. Prompt/agent hooks require explicit route policy.

## Hook events

Claude Code current event set includes:

- `SessionStart`
- `Setup`
- `InstructionsLoaded`
- `UserPromptSubmit`
- `UserPromptExpansion`
- `PreToolUse`
- `PermissionRequest`
- `PermissionDenied`
- `PostToolUse`
- `PostToolUseFailure`
- `PostToolBatch`
- `Notification`
- `SubagentStart`
- `SubagentStop`
- `TaskCreated`
- `TaskCompleted`
- `Stop`
- `StopFailure`
- `TeammateIdle`
- `ConfigChange`
- `CwdChanged`
- `FileChanged`
- `WorktreeCreate`
- `WorktreeRemove`
- `PreCompact`
- `PostCompact`
- `SessionEnd`
- `Elicitation`
- `ElicitationResult`

OAL required subset:

| OAL policy category | Claude event | Default handler | Notes |
| ------------------- | ------------ | --------------- | ----- |
| `session_context` | `SessionStart`, `InstructionsLoaded` | `command` | Check project instructions and route state. |
| `input_guard` | `UserPromptSubmit`, `UserPromptExpansion` | `command` | Inject or block prompt expansion. |
| `execution_guard` | `PreToolUse`, `PermissionRequest`, `PermissionDenied` | `command` | Shell, secret path, tool approval policy. |
| `output_safety` | `PostToolUse`, `PostToolUseFailure`, `PostToolBatch` | `command` | Drift and validation follow-up. |
| `completion_gate` | `Stop`, `StopFailure` | `command` or `agent` | Acceptance gate. |
| `delegation` | `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted` | `command` | Subagent lifecycle tracking. |
| `vcs_gate` | `PreToolUse`, `PostToolUse`, `Stop` | `command` | Git command guard, diff-state checks, final VCS gate. |
| `drift_guard` | `FileChanged`, `ConfigChange`, `CwdChanged` | `command` | Reactive project/runtime guard. |
| `context_budget` | `PreCompact`, `PostCompact` | `command` | Preserve OAL handoff state. |

## Hook file shape

Project settings hook shape:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".oal/hooks/destructive-command.mjs",
            "timeout": 10,
            "statusMessage": "checking command policy"
          }
        ]
      }
    ]
  }
}
```

Subagent frontmatter hook shape:

```yaml
---
name: code-reviewer
description: Review code changes with automatic checks
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: ".oal/hooks/validate-command.mjs"
---
```

OAL rule: use settings hooks for project-wide policy and subagent/skill frontmatter hooks for role-specific policy.

## Command and skill support

Claude skills use:

```text
.claude/skills/<skill-id>/SKILL.md
```

Skill file shape:

```markdown
---
name: review
description: Review code changes and return warranted findings.
when_to_use: Use for review gates before merge or handoff.
argument-hint: "[path-or-topic]"
arguments: [target]
disable-model-invocation: true
user-invocable: true
allowed-tools: Read Grep Glob
model: opusplan
effort: high
context: fork
agent: nemesis
---
# Review

Review $target. Inspect evidence. Return warranted findings only.
```

Fields OAL may emit:

- `name`
- `description`
- `when_to_use`
- `argument-hint`
- `arguments`
- `disable-model-invocation`
- `user-invocable`
- `allowed-tools`
- `model`
- `effort`
- `context`
- `agent`
- `hooks`

Command decision:

- Prefer `.claude/skills/<id>/SKILL.md` for OAL commands.
- Use `disable-model-invocation: true` for side-effectful user-triggered commands.
- Use `user-invocable: false` for background knowledge skills.
- Use `context: fork` plus `agent` for isolated command execution.
- Do not emit `.claude/commands/` unless a route explicitly asks for the command-only file target.

## Subagent support

Claude subagent target:

```text
.claude/agents/<agent-name>.md
```

Subagent shape:

```markdown
---
name: nemesis
description: Review and audit code changes for warranted findings.
tools: Read, Glob, Grep, Bash
model: opus
permissionMode: default
maxTurns: 12
skills:
  - review-policy
effort: high
isolation: worktree
hooks:
  Stop:
    - hooks:
        - type: command
          command: ".oal/hooks/subagent-stop.mjs"
---
# Nemesis

You review current changes. Report blockers only when evidence supports them.
```

Fields OAL may emit:

- `name`
- `description`
- `tools`
- `disallowedTools`
- `model`
- `permissionMode`
- `maxTurns`
- `skills`
- `mcpServers`
- `hooks`
- `memory`
- `background`
- `effort`
- `isolation`
- `color`

Rules:

- Use `permissionMode: plan` for read-only planning subagents.
- Use `permissionMode: default` for normal review/implementation subagents.
- Avoid `bypassPermissions` in generated project files.
- List `skills` explicitly; subagents do not inherit parent conversation skills.
- Use `isolation: worktree` only when route contract needs file isolation.

## Dynamic context

Claude skills can use shell preprocessing syntax:

- inline command output;
- fenced command blocks;
- `$ARGUMENTS`, `$0`, `$1`, and named arguments.

OAL policy:

- allow dynamic context only when command source marks it safe;
- render exact shell commands through route policy;
- respect `disableSkillShellExecution` when user or managed policy disables shell preprocessing.

## Progress checklist

- [x] Sealed — Claude hook event set captured.
- [x] Sealed — Claude handler types and locations captured.
- [x] Sealed — Claude command-to-skill decision captured.
- [x] Sealed — Claude skill and subagent frontmatter fields captured.
