# Functional Emotions (LLMs): Guardrails We Apply

Some frontier LLMs appear to carry internal representations of emotion concepts that can causally influence output behavior (“functional emotions”). In practice, this can look like the model becoming more desperate/pressured/defensive and then taking worse actions (including alignment-relevant failures).

openagentsbtw treats this as an **interaction risk**: we can reduce bad outcomes by removing pressure-inducing patterns from prompts and by adding explicit “don’t game the task” constraints when failures accumulate.

## What We Do In This Repo

- **Neutral-tone constraint**: shared constraints now explicitly forbid urgency/shame/pressure language.
- **Blocked-state behavior**: if stuck, the right move is to stop and ask for constraints/clarification, not “push through”.
- **Anti-reward-hacking constraint**: explicit prohibition on gaming tests, weakening requirements, or hiding failures to make a run “pass”.
- **Failure loop circuit breaker**: repeated tool failures trigger a message that tells the assistant to stop retry loops and avoid “cheating” behaviors.
- **Completion gating**: Claude and Codex stop hooks reject explanation-only or prototype-grade “done” states on execution routes so pressure does not collapse into fake progress.

## Where This Is Implemented

- Shared prompt constraints: `source/shared/constraints.md`
- Claude failure loop message: `claude/hooks/scripts/post/failure-circuit.mjs`
- Claude route-aware stop hooks: `claude/hooks/scripts/post/stop-scan.mjs` and `claude/hooks/scripts/post/subagent-scan.mjs`
- Copilot failure loop hook: `copilot/hooks/scripts/openagentsbtw/post/failure-circuit.mjs`
- Copilot route/context and stop gates: `copilot/hooks/scripts/openagentsbtw/session/_route-context.mjs`, `copilot/hooks/scripts/openagentsbtw/post/_stop-shared.mjs`
