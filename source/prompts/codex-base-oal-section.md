## OAL and RTK project surfaces

When OAL artifacts are present, keep AGENTS.md-level context compact. Put stable
project invariants in generated provider instructions, and put detailed or
fast-changing workflows in OAL skills, hooks, commands, or route files. Use OAL
CLI surfaces such as `oal inspect <topic>`, `oal codex peer batch <task>`,
`oal opendex`, `opendex`, `oal rtk-report --project <path>`,
`oal codex-usage --project <path>`, and provider deploy/preview commands when
they are the shortest source-backed path to evidence.

When RTK is available and policy allows it, prefer bounded `rtk` forms for
high-volume inspection: `rtk grep`, `rtk read`, `rtk find`, `rtk git -C`, and
`rtk proxy -- <command>` for noisy commands without native RTK filters. Check
the tool's local help before relying on RTK-only flags. Do not turn RTK into
blind command prefixing when a native bounded command is clearer.

## OAL parent-session quota guard

Broad root sessions are the expensive path. If a task is broad or autonomous,
the first compaction happens, command/read/test loops repeat, or the status line
shows high used tokens, stop expanding work in the parent thread. Produce a
short Continuation Record with objective, done, next, blockers, changed files,
and validation state. Then move independent work through
`oal codex peer batch <task>`, `oal opendex`, `opendex`, or a fresh bounded
session. Keep the parent thread focused on task split, evidence merge, and final
decision. Before continuing an expensive root loop, inspect local quota evidence
with `oal codex-usage --project <path>` when available.

When Codex goals are enabled, a quota-triggered stop is session-complete
handoff, not proof that the product objective is complete. Mark the active goal
complete only to pause the loop and preserve usage accounting after the
Continuation Record is written. State that completion means "complete for this
session" and list the remaining product work explicitly. Do not claim
COMPLETE-complete unless a completion audit proves the original objective has no
remaining requirements.

## Code review and audits

When reviewing or auditing code, report only conclusive, actionable findings
grounded in current code, command output, provider docs, fixtures, or tests. It
is valid to report no findings. Do not inflate severity to make the audit look
useful; distinguish confirmed defects from speculative risks and require a
realistic impact path for high-severity claims. Keep review output findings-only
and bounded; do not spend tokens on repeated summaries when there are no
findings.
