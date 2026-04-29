# OpenCode hooks, commands, and skills study

Purpose: capture current OpenCode plugin-event support and command/skill/agent render targets for OAL.

Authority: study input for `../../specs/hook-policy-engine.md` and `../../specs/command-skill-format.md`.

Sources:

- `https://opencode.ai/docs/plugins/`
- `https://opencode.ai/docs/commands/`
- `https://opencode.ai/docs/skills`
- `https://opencode.ai/docs/agents/`
- `https://opencode.ai/docs/permissions/`

Retrieval date: 2026-04-29.

## Scope

OpenCode uses plugin events, command files/config entries, skill folders, agent records, and permissions. OAL should implement hook-like policy through a generated OpenCode plugin plus permission config.

## Plugin support

Project plugin target:

```text
.opencode/plugins/openagentlayer.ts
```

Plugin config:

```json
{
  "plugin": [".opencode/plugins/openagentlayer.ts"]
}
```

Plugin function shape:

```ts
import type { Plugin } from "@opencode-ai/plugin";

export const OpenAgentLayerPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        // OAL execution guard.
      }
    },
  };
};
```

Plugin context includes:

- `project`
- `directory`
- `worktree`
- `client`
- `$` Bun shell API

OAL should use TypeScript plugin output because repo baseline uses Bun + TypeScript.

## Plugin events

OpenCode plugin event categories:

- Command: `command.executed`
- File: `file.edited`, `file.watcher.updated`
- Installation: `installation.updated`
- LSP: `lsp.client.diagnostics`, `lsp.updated`
- Message: `message.part.removed`, `message.part.updated`, `message.removed`, `message.updated`
- Permission: `permission.asked`, `permission.replied`
- Server: `server.connected`
- Session: `session.created`, `session.compacted`, `session.deleted`, `session.diff`, `session.error`, `session.idle`, `session.status`, `session.updated`
- Todo: `todo.updated`
- Shell: `shell.env`
- Tool: `tool.execute.after`, `tool.execute.before`
- TUI: `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`

OAL event mapping:

| OAL policy category | OpenCode event | Default implementation |
| ------------------- | -------------- | ---------------------- |
| `session_context` | `session.created`, `session.updated`, `server.connected` | plugin event handler |
| `input_guard` | `tui.prompt.append`, `tui.command.execute` | plugin event handler |
| `execution_guard` | `tool.execute.before`, `permission.asked` | plugin event handler + `permission` config |
| `output_safety` | `tool.execute.after`, `file.edited`, `lsp.client.diagnostics` | plugin event handler |
| `completion_gate` | `session.idle`, `session.error`, `session.status` | plugin event handler |
| `delegation` | `command.executed`, `todo.updated` | plugin event handler |
| `vcs_gate` | `tool.execute.before`, `tool.execute.after`, `session.diff` | plugin event handler |
| `drift_guard` | `file.watcher.updated`, `session.diff` | plugin event handler |
| `context_budget` | `session.compacted` | plugin event handler |

Do not use event names outside the current OpenCode plugin event list.

## Command support

OpenCode supports two command render targets:

1. config object:

```json
{
  "command": {
    "review": {
      "template": "Review current changes. Return warranted findings only.",
      "description": "Review current changes",
      "agent": "nemesis",
      "subtask": true,
      "model": "anthropic/claude-sonnet-4-6"
    }
  }
}
```

2. markdown file:

```text
.opencode/commands/review.md
```

```markdown
---
description: Review current changes
agent: nemesis
subtask: true
model: anthropic/claude-sonnet-4-6
---
Review current changes. Return warranted findings only.
```

Command prompt syntax:

- `$ARGUMENTS` for all command args;
- `$1`, `$2`, `$3` for positional args;
- command output injection;
- `@path` file reference injection.

OAL decision:

- Use markdown command files for body-heavy OAL commands.
- Use config `command` entries for short generated routes or when installer wants one-file config.
- Always emit `description`.
- Emit `agent`, `subtask`, and `model` only when source route declares them.
- Prevent command names that override built-ins unless source record explicitly allows override.

## Skill support

OpenCode skill target:

```text
.opencode/skills/<skill-name>/SKILL.md
```

OpenCode also discovers skill files under `.claude/skills/` and `.agents/skills/`. OAL should render native `.opencode/skills/` for OpenCode and may reuse shared OAL source markdown before adapter conversion.

Skill shape:

```markdown
---
name: review-policy
description: Review policy for warranted findings and validation gates.
license: MIT
metadata:
  owner: openagentlayer
---
# Review Policy

Return findings only when evidence supports them.
```

OpenCode recognized frontmatter fields:

- `name`
- `description`
- `license`
- `metadata`

Rules:

- `name` must match the directory name.
- `name` uses lowercase alphanumeric words separated by single hyphens.
- `description` should be short but specific.
- Unknown fields are ignored by OpenCode; OAL should not emit ignored fields.
- Skill access is controlled through `permission.skill`.

## Agent and permission coupling

OpenCode commands may target agents. OAL must ensure:

- `default_agent` names a primary agent;
- command `agent` references an existing agent;
- `subtask: true` is used for isolated command runs;
- permission defaults allow skill loading only where policy allows it;
- destructive shell remains guarded by both `permission.bash` and plugin `tool.execute.before`.

Permission baseline for OAL command/skill support:

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
    "skill": {
      "*": "ask",
      "review-policy": "allow"
    }
  }
}
```

## Progress checklist

- [x] Sealed — OpenCode plugin events captured.
- [x] Sealed — OpenCode command config and markdown targets captured.
- [x] Sealed — OpenCode skill target and frontmatter captured.
- [x] Sealed — OpenCode agent/permission coupling captured.
