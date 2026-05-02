# Hook Capability Matrix

OAL hooks must be executable runtime behavior, not descriptions. Runtime hook scripts should remain `.mjs` unless a provider requires a different wrapper.

## Codex hooks

Supported observed events:

- `PreToolUse`
- `PermissionRequest`
- `PostToolUse`
- `SessionStart`
- `UserPromptSubmit`
- `Stop`

Reliable handler type in observed implementation:

- command hooks.

Do not rely on prompt/agent hooks or async hooks until installed Codex support proves them runnable.

OAL Codex hook surfaces to exploit:

| Event               | OAL use                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| `SessionStart`      | project/git/model context                                                   |
| `UserPromptSubmit`  | route context, prompt guard, deferred queue if implemented safely           |
| `PreToolUse`        | destructive command guard, secret/env read guard, generated-file edit guard |
| `PermissionRequest` | risk/approval context                                                       |
| `PostToolUse`       | changed-file tracking, failure signals                                      |
| `Stop`              | completion/validation/no-placeholder/no-demo gate                           |

## Claude Code hooks

Claude Code supports a larger lifecycle. OAL should use it heavily.

Important events:

- `SessionStart`
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
- `PreCompact`
- `PostCompact`
- `SessionEnd`

Claude events can support richer hook types than Codex, but OAL should keep command `.mjs` hooks as the baseline for portability and explicit runtime testing.

OAL Claude hook surfaces to exploit:

| Event                      | OAL use                                                 |
| -------------------------- | ------------------------------------------------------- |
| `SessionStart`             | initial context and OAL state                           |
| `UserPromptSubmit`         | prompt guard, route context, external context injection |
| `SubagentStart`            | route/subagent context injection                        |
| `PreToolUse`               | destructive commands, secret reads, generated edits     |
| `PermissionRequest`        | structured approval guidance                            |
| `PostToolUseFailure`       | retry-loop/failure-circuit                              |
| `Stop`                     | main completion gate                                    |
| `SubagentStop`             | subagent completion gate                                |
| `PreCompact`/`PostCompact` | continuation/handoff safety                             |
| `SessionEnd`               | handoff and cleanup                                     |

## OpenCode hooks/plugins

OpenCode uses plugins/events, not Claude-style settings hooks. Useful events:

- `tool.execute.before`
- `tool.execute.after`
- `permission.asked`
- `permission.replied`
- `session.created`
- `session.compacted`
- `session.error`
- `session.idle`
- `session.status`
- `session.updated`
- `session.diff`
- `message.updated`
- `message.part.updated`
- `file.edited`
- `shell.env`
- `tui.prompt.append`
- `tui.toast.show`

OAL OpenCode plugin behaviors to exploit:

| Event                 | OAL use                                   |
| --------------------- | ----------------------------------------- |
| `tool.execute.before` | destructive/env/generated-file guards     |
| `tool.execute.after`  | failure capture, generated drift tracking |
| `permission.asked`    | approval policy hints                     |
| `session.idle`        | completion gate                           |
| `session.compacted`   | continuation context                      |
| `shell.env`           | OAL env context                           |
| `tui.prompt.append`   | optional UX, only when intentional        |

## Hook output standard

Every OAL hook must have fixture tests. For every hook:

- allowed input fixture.
- blocked input fixture.
- malformed input fixture.
- provider-specific output fixture.
- deployed-path execution test.

A hook metadata file without executable behavior is invalid.
