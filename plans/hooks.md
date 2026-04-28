# OAL Hook System

## Goal

Hooks make the harness enforceable. They turn prompt rules into event contracts, command gates, evidence checks, and install validation.

## Events

| OAL Event       | Codex Mapping                | OpenCode Mapping                           | Purpose                                  |
| --------------- | ---------------------------- | ------------------------------------------ | ---------------------------------------- |
| `prompt`        | `UserPromptSubmit`           | native/plugin/config path when proven      | create task contract, attach route       |
| `pre_tool`      | `PreToolUse`                 | permission/plugin gate where available     | require runner, validate dangerous tools |
| `post_tool`     | `PostToolUse` if available   | plugin path when available                 | capture evidence and command metrics     |
| `stop`          | `Stop`                       | stop-equivalent/plugin path when available | validate final response against contract |
| `subagent_stop` | subagent stop when available | agent/mode completion when available       | validate delegated task evidence         |
| `session_start` | session start when available | startup/config load when available         | load manifest and route policy           |

OpenCode hook behavior must be source-backed. Use permissions and local plugin files where available; otherwise document the exact unsupported event.

## Hook Runtime

Platform hook calls:

```text
oal hook <platform> <event> --payload <path-or-stdin>
```

OAL then:

1. parses payload into typed event
2. loads install manifest
3. loads task contract or creates one
4. runs event policy
5. emits platform-native JSON/text result
6. appends local OAL trace record

## Prompt Contract Hook

Responsibilities:

- classify task kind
- detect execution request
- detect explicit advice request
- select route/model profile
- record required evidence
- record allowed final shape
- write task contract to session state

It must avoid long prompt injection. It should inject a short pointer to the contract and let stop hooks enforce the result.

## Pre-Tool Gate

Responsibilities:

- require `oal run --` for shell-adjacent commands where platform allows
- allow read-only tools by policy
- block destructive commands unless platform approval or user request is present
- normalize shell command into structured command plan
- choose output filter and token budget

## Stop Gate

Responsibilities:

- check final response shape
- check required evidence was produced
- reject plan-only completion when execution was requested
- reject advice-only completion when no-advice contract is active
- require blocker format when task cannot be completed

Stop gate must emit exact failure reason, not generic “policy violation”.

## Runner Coupling

Hooks do not implement shell parsing themselves. They call `oal-runner` or shared runner modules. This keeps command parsing in one runtime surface.

## State Files

Session-local OAL state:

- task contract
- route selection
- runner metrics
- evidence ledger
- hook decisions

State must be outside generated prompt files. Install manifest owns its location.

## Tests

Required fixture families:

- prompt classification: code vs plan vs advice request
- no-advice emotional task: direct answer passes, scripts fail
- execution task: edits/tests pass, advice fails
- blocker task: valid blocker passes, vague blocker fails
- command gate: raw supported command rewrites, unsupported command gets safe policy
- malformed payload: clear fail closed message
