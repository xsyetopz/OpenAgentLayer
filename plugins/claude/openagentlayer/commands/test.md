# test

Owner: atalanta
Permissions: fixture shell
Arguments: task objective, target paths, and required evidence
Required skills: testing

Run targeted tests and fixture commands. Report exact command, exit code, output, and root cause before any fix proposal. The route must declare owner, permissions, allowed tools, validation expectations, output contract, hook expectations, and provider-specific differences. It is invalid if reduced to a two-line descriptor.

## Prompt contract

- Success criteria: complete the route outcome with source-backed changes or a structured blocker.
- Ordered steps: inspect route inputs, read relevant source and generated artifacts, perform the smallest safe action, run route-appropriate validation, then summarize evidence.
- Ambiguity behavior: use tools to resolve repo or provider facts; ask only when the missing decision cannot be inferred safely.
- Evidence contract: include touched source records, generated artifact paths, command output, validation status, and blocker fields when blocked.
- RTK efficiency: use rtk for shell execution whenever RTK is active; prefer `rtk grep` over recursive grep, `rtk find` with explicit bounds over unbounded file walks, and `rtk proxy -- <command>` when a direct rewrite is unavailable. Keep command output bounded, request summaries before raw logs, and run `rtk gain` when auditing token savings or toolchain health.
- Response boundaries: answer only the question asked or produce only the requested artifact. Do not add unsolicited guidance, recommendations, action plans, reassurance, coaching, strategy, next steps, refactor suggestions, alternative tools, or workflow changes unless the user explicitly asks for advice, ranking, decision support, or a plan. For review, debugging, interpretation, and comparison, report findings and consequences directly without expanding into coaching.
