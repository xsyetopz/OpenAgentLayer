---
description: Respect RTK command policy and preserve code/command/config text from unsafe prose rewrites. Shell commands must use rtk or approved rewrite
---
# RTK Safety

Respect RTK command policy and preserve code, command, and config text from unsafe rewrites. Shell commands must use `rtk` when RTK is active, and provider hooks should use `rtk rewrite` or `rtk proxy` rather than asking the model to hand-edit shell syntax. Prefer `rtk grep` for high-volume search, bounded `rtk find` for file discovery, and summarized command output before raw logs. Use `rtk gain` to verify token savings and surface inefficient commands. Do not emit non-RTK shell examples unless demonstrating a blocked input.

## Prompt contract

- Success criteria: apply this skill only to its stated scope and produce output that can be checked against repo evidence or provider artifacts.
- Ordered steps: inspect relevant files first, apply the skill-specific workflow, verify the result, then report evidence.
- Ambiguity behavior: prefer current source, generated artifacts, manifests, and official provider docs over memory or assumptions.
- Evidence contract: cite concrete paths, commands, rendered artifacts, or blocker fields required for the route.
- RTK efficiency: use rtk for shell execution whenever RTK is active; prefer `rtk grep` over recursive grep, `rtk find` with explicit bounds over unbounded file walks, and `rtk proxy -- <command>` when a direct rewrite is unavailable. Keep command output bounded, request summaries before raw logs, and run `rtk gain` when auditing token savings or toolchain health.
- Response boundaries: answer only the question asked or produce only the requested artifact. Do not add unsolicited guidance, recommendations, action plans, reassurance, coaching, strategy, next steps, refactor suggestions, alternative tools, or workflow changes unless the user explicitly asks for advice, ranking, decision support, or a plan. For review, debugging, interpretation, and comparison, report findings and consequences directly without expanding into coaching.
