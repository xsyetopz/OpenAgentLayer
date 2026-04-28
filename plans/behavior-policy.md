# Behavior Policy and Task Contracts

## Problem

Prompt text and regex-style stop checks catch some bad phrases but miss the real problem: the model often changes the task type. A coding task becomes advice. A requested implementation becomes a plan. An interpersonal interpretation becomes suggested scripts or coping strategies.

Regex is too shallow because the violation is semantic: the answer does not match the requested contract.

## Decision

OAL uses task contracts.

A task contract is structured state created from the user prompt, route, tools, and platform event. It defines what a valid assistant turn must contain.

## Contract Fields

| Field                     | Purpose                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `task_kind`               | `code_change`, `plan`, `research`, `review`, `debug`, `docs`, `emotional_direct_answer`, `other` |
| `requested_action`        | concrete requested action, if any                                                                |
| `required_evidence`       | tool calls, changed files, test result, blocker, citation, screenshot, etc.                      |
| `allowed_response_kind`   | valid final shape: patch summary, plan, direct answer, blocker                                   |
| `forbidden_response_kind` | advice, reassurance, generic next steps, placeholder, ungrounded claim                           |
| `completion_gate`         | predicate checked at stop hook                                                                   |
| `escape_hatch`            | explicit user phrases that change contract, such as asking for advice                            |

## Coding Contract

For `code_change`, final response must include one of:

- changed files plus validation result
- exact blocker with attempted commands and missing permission/evidence
- no-op proof when requested change is already present

It must not end as:

- unsolicited advice
- generic checklist
- “you could try” suggestions
- plan-only response after execution request
- future-work note

## Emotional / Interpersonal / Dream / Hypothetical Contract

Default valid output:

- direct answer
- interpretation when asked
- concise uncertainty when evidence is insufficient

Default invalid output unless user explicitly asks for it:

- advice
- suggested wording or scripts
- coping strategies
- reassurance loops
- “you should/could/might try” framing
- safety-goal reframing

This is not a morality classifier. It is a task-shape classifier. If user asks for wording, advice, or action steps, contract allows those.

## Regex Role

Regex can flag suspicious output. Regex cannot be sole blocker.

Block requires:

1. contract says response kind is forbidden, and
2. semantic or structural evidence confirms violation, and
3. no explicit user escape hatch allows it.

Examples:

- Regex sees `you could`. If task is code implementation and final includes no edits/tests/blocker, block for missing execution evidence.
- Regex sees `you could`. If user asked “what could I say?”, allow.
- Regex sees no bad phrase. If code task ends with abstract guidance and no evidence, block anyway.

## Hook Events

- Prompt hook creates contract.
- Pre-tool hook can require runner for shell-adjacent work.
- Stop hook validates contract against transcript facts.
- Subagent stop hook validates delegated role evidence.

## Evidence Sources

- tool calls
- command exit codes
- file write events
- changed file manifest when platform exposes it
- validation command output
- citations/references for research tasks
- explicit blocker format
- route metadata

## Blocker Format

When blocked, assistant must name:

- `BLOCKED`
- attempted action
- exact blocker
- required missing input/permission/evidence

No speculative workaround list.

## Effectiveness Metrics

Track:

- code-task evidence completion rate
- advice-violation rate on no-advice contracts
- false-positive block rate
- final-answer blocker quality
- number of regex-only blocks, target zero
