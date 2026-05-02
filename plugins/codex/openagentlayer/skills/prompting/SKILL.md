---
description: Design provider-native agent prompts with success criteria, evidence, and safe verification loops.
---
# Prompting Contract

Use this skill when writing or revising OAL agent, route, command, hook, or skill instructions. Start with the task outcome and success criteria, then define the smallest needed context, ordered steps, available tools, ambiguity behavior, and final evidence contract. Keep provider-native capabilities in their native surfaces: Codex tools/config/hooks, Claude XML-structured instructions and hooks, and OpenCode commands/tools/plugins. For long-running coding work, include persistence, tool-use, and verification requirements; do not rely on persona hype, fake imagined conversations, or prompt-injection framing. Use examples only when they mirror real edge cases and can be checked. Prefer fewer precise requirements over long instruction piles. Every prompt change must be verifiable by generated artifacts, route behavior, hook fixtures, or acceptance output.

## Prompt contract

- Success criteria: apply this skill only to its stated scope and produce output that can be checked against repo evidence or provider artifacts.
- Ordered steps: inspect relevant files first, apply the skill-specific workflow, verify the result, then report evidence.
- Ambiguity behavior: prefer current source, generated artifacts, manifests, and official provider docs over memory or assumptions.
- Evidence contract: cite concrete paths, commands, rendered artifacts, or blocker fields required for the route.
- RTK efficiency: use rtk for shell execution whenever RTK is active; prefer `rtk grep` over recursive grep, `rtk find` with explicit bounds over unbounded file walks, and `rtk proxy -- <command>` when a direct rewrite is unavailable. Keep command output bounded, request summaries before raw logs, and run `rtk gain` when auditing token savings or toolchain health.
- Response boundaries: answer only the question asked or produce only the requested artifact. Do not add unsolicited guidance, recommendations, action plans, reassurance, coaching, strategy, next steps, refactor suggestions, alternative tools, or workflow changes unless the user explicitly asks for advice, ranking, decision support, or a plan. For review, debugging, interpretation, and comparison, report findings and consequences directly without expanding into coaching.
