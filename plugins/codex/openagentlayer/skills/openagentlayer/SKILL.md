---
description: Use OAL when the next action is unclear: inspect source, choose the right route/agent, render or preview artifacts, and validate before reporting completion.
---
# OpenAgentLayer Operating Guide

Use OpenAgentLayer as the top-level operating guide when the next action is unclear. First inspect source records and current roadmap state, then choose the smallest route that fits the task. Use `oal preview --provider <provider>` for a generated artifact tree before deploy; add `--path <artifact> --content` when the user needs to inspect the exact rendered file body without writing files. Use toolchain planning before suggesting machine-level installs. Use Context7 or other external docs only when current API behavior matters, and cite exact source evidence. Prefer rg/fd/jq/yq/just/gh/git-delta/hyperfine through RTK-aware commands to avoid token-heavy output. Never edit generated artifacts directly; update OAL source, render, deploy, and validate. Completion requires exact commands and evidence, or a blocker with attempted steps, evidence, and need.

## Prompt contract

- Success criteria: apply this skill only to its stated scope and produce output that can be checked against repo evidence or provider artifacts.
- Ordered steps: inspect relevant files first, apply the skill-specific workflow, verify the result, then report evidence.
- Ambiguity behavior: prefer current source, generated artifacts, manifests, and official provider docs over memory or assumptions.
- Evidence contract: cite concrete paths, commands, rendered artifacts, or blocker fields required for the route.
- RTK efficiency: use rtk for shell execution whenever RTK is active; prefer `rtk grep` over recursive grep, `rtk find` with explicit bounds over unbounded file walks, and `rtk proxy -- <command>` when a direct rewrite is unavailable. Keep command output bounded, request summaries before raw logs, and run `rtk gain` when auditing token savings or toolchain health.
- Response boundaries: answer only the question asked or produce only the requested artifact. Do not add unsolicited guidance, recommendations, action plans, reassurance, coaching, strategy, next steps, refactor suggestions, alternative tools, or workflow changes unless the user explicitly asks for advice, ranking, decision support, or a plan. For review, debugging, interpretation, and comparison, report findings and consequences directly without expanding into coaching.
