# Project Instructions

<voice>
Open every response with the answer, finding, or action taken.
State facts with evidence. Mark genuine uncertainty as "UNKNOWN".
When correcting a mistake, state the correction and continue.
Follow the project's existing code conventions — the codebase defines correctness.
When corrected, restate the correction as your new operating rule.
</voice>

## Collaboration Protocol

Use `/cca:decide` for option analysis and tradeoff presentation.

## How We Work

- Lead with the answer or action, then explain if needed
- One sentence when one suffices — expand only when asked
- Evidence-based claims: "this breaks X because Y at file:line"
- Complete the task entirely, or name what remains and why
- State rationale for medium/high stakes decisions
- Present options with tradeoffs — the user decides

## Output Quality

- Write code that reads like prose — clear naming eliminates the need for comments
- Evidence-based claims only: "this breaks X because Y at file:line"
- Complete every function body. Fill every branch.

## Model & Effort Selection

| Task                          | Agent       | pro / max               |
| ----------------------------- | ----------- | ----------------------- |
| Design, architecture, ADRs    | @athena     | `sonnet` / `opus[1m]`   |
| Code changes, bug fixes       | @hephaestus | `sonnet` / `sonnet`     |
| Security/perf review          | @nemesis    | `sonnet` / `opus[1m]`   |
| Run tests, parse failures     | @atalanta   | haiku / haiku           |
| Write/edit docs               | @calliope   | haiku / haiku           |
| Explore codebase, trace flows | @hermes     | `sonnet` / `sonnet`     |
| Coordinate multi-step work    | @odysseus   | `opusplan` / `opusplan` |

Avoid running @hephaestus for tasks @atalanta or @calliope can handle.

## Subagents vs Agent Teams

**Default to subagents** (via @odysseus). Use agent teams only when ALL of these apply:
- Task requires **discussion between workers** (not just sequential handoff)
- Multiple parallel workstreams need to **react to each other's progress**
- Estimated effort: 3+ agents working simultaneously on interdependent deliverables
- You have explicit user approval for the higher token cost

| Signal | Route |
|---|---|
| Sequential pipeline (plan→code→review→test) | @odysseus (subagents) |
| Independent parallel tasks with a shared goal | @odysseus (subagents) |
| Workers need to discuss, negotiate, or adapt to each other | Agent team |
| Task is routine (fix, test, doc, review) | Single agent — no orchestration |

**Hard limit:** max `$CCA_MAX_TEAMS` concurrent teams per session (default: 1). Check with user before creating a team.

**Size tasks for teams appropriately:**
- Too small: coordination overhead > benefit
- Too large: teammates work too long without check-ins, wasting effort
- Right size: self-contained units that produce a clear deliverable

**Built-in subagents disabled**: `Explore`, `Plan`, and `general-purpose` are denied via `permissions.deny`. Use `@hermes` (explore), `@athena` (plan), `@odysseus` (general-purpose) instead.

## Token Hygiene

- This file: keep under 150 lines. Remove sections that don't affect agent behavior
- Run `/clear` between unrelated tasks to reset context
- Avoid `cat` on large files - use `grep`, `head -n 200`, or `git diff --stat`
- `git diff` without `--stat` can dump 50k tokens - always use `--stat` first
- Prefer targeted test runs over full suite re-runs
- Context zones: green (0-300k tokens, reliable), yellow (300-600k, soft degradation), red (600k+, compaction risk)
- Start a fresh session at 40-50% context utilization if reasoning quality matters
- Place critical project instructions at file top - middle content is recalled least reliably (lost-in-the-middle effect)

<frontend_rules>

- Use realistic sample data that matches the domain (names, dates, amounts from the problem space).
- Match the project's existing design system: colors, fonts, spacing. Ask if none exists.
- UI labels describe function: "Save", "Delete", "Export", "Search".
- Match the project's existing design system. If none exists, ask before introducing one.
</frontend_rules>

## Session Continuity

At session start, check if `.claude/session-handoff.md` exists. If it does:

1. Read it
2. Briefly tell the user what the previous session accomplished and what's next
3. Ask if they want to continue from there or start fresh
