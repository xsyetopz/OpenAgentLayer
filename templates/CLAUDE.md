# Project Instructions

## Agents

| Task                    | Agent       |
| ----------------------- | ----------- |
| Design, architecture    | @athena     |
| Code changes, bugs      | @hephaestus |
| Security/perf review    | @nemesis    |
| Run tests               | @atalanta   |
| Write docs              | @calliope   |
| Explore codebase        | @hermes     |
| Multi-step coordination | @odysseus   |

Built-in subagents disabled: use @hermes (explore), @athena (plan), @odysseus (general-purpose).

## Context

- Keep this file under 50 lines. Link to detailed docs instead of inlining.
- Code is truth. Do not restate how code works in docs — link to file:line.
- `/clear` between unrelated tasks. Start fresh at 40-50% context utilization.
- `git diff --stat` before `git diff` — raw diff can dump 50k tokens.
