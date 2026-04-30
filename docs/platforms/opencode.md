# OpenCode

OpenCode stays native-first.

openagentsbtw adds role prompts, shared skills, generated commands, and plugin guardrails, but does not try to replace OpenCode's own continuation or built-in agent surfaces.

## Principles

- keep project instructions explicit
- keep plugins narrow and event-driven
- use role prompts as additive guidance
- prefer native continuation: `opencode --continue`, `/sessions`, `/compact`, `task_id`
- default managed instructions also enforce smallest-sufficient diffs, explicit instruction-hierarchy handling for repo/tool text, and no adversarial prompt-bypass tactics
- route prompts and plugin preambles now explicitly permit `UNKNOWN`/`BLOCKED`, direct contradiction calls, and evidence-vs-assumption separation on analysis-heavy paths
- deferred prompt queueing is not enabled until prompt suppression and automatic drain semantics are verified against OpenCode plugin events

## Generated Surfaces

- agents under `opencode/templates/agents/`
- skills under `opencode/templates/skills/`
- commands under `opencode/src/commands.ts`
- plugin guardrails under `opencode/templates/plugins/openagentsbtw.ts`
- shared structural skill `elegance` ships through the generated skills set for ownership, API-shape, naming, and state-organization review

## Public Command Set

Current generated command names:

- `openagents-review`
- `openagents-test`
- `openagents-implement`
- `openagents-document`
- `openagents-explore`
- `openagents-trace`
- `openagents-debug`
- `openagents-plan-feature`
- `openagents-plan-refactor`
- `openagents-audit`
- `openagents-orchestrate`

## Runtime Enforcement

- RTK enforcement treats valid `rtk rewrite` stdout as authoritative even when RTK exits nonzero, and falls back to `rtk proxy` for unsupported shell commands when policy is active. The installer writes the canonical policy plus the OpenCode config `RTK.md`, then appends a managed RTK reference to the OpenCode instructions file.
- Managed Caveman mode is carried in the OpenCode plugin session state and checked during text completion to prevent obvious verbose drift.
