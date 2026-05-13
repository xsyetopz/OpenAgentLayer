# Prompt design

Good operational prompts define:

- source of truth
- allowed edit set
- ordered workflow
- ambiguity/blocker path
- validation gate
- output contract
- high-risk shortcuts as named blocker signals

Skill prompts should stay lean and locally relevant. Use external skill catalogs as discovery inputs, then author OAL skills only when a project need, validation path, and reuse case are clear.

Use affirmative target states and balanced mechanical gates: enough structure to route work, short enough to preserve task context. For current-state cleanup, say what the artifact should become and how the final diff is checked.

Corrections and examples are evidence for the requested result. They approve only the requested result; compatibility aliases, parser fallbacks, extra behavior, guardrails, adjacent cleanup, and docs enter scope when the user says them out loud or controlling source requires them.

For edits, prefer `apply_patch` for focused manual changes. Use bounded `python3` rewrites for broad mechanical changes when many patch hunks would be fragile; constrain paths first and inspect the final diff.

For broad implementation prompts, include a delegation check. Use subagents or an orchestration route when work can split by owner, provider, package, test tier, or investigation path. Narrow single-owner edits begin with a recorded solo ownership reason.
