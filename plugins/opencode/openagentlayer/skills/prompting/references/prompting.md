# OAL Prompting Reference

## Contract

1. State success criteria before prompt tuning.
2. Define empirical checks: tests, acceptance commands, rendered artifact checks, or hook fixtures.
3. Put critical constraints at the start or end of long instructions.
4. Use provider-native structure instead of parser tricks.
5. Keep prompts small enough to audit; split agent ownership when responsibilities diverge.
6. Require tool evidence when file contents, current docs, commands, or repo state matter.
7. Avoid fake authority, fake memory, gaslighting, role flattery, or jailbreak-style framing.
8. Review AI-written code as production code; do not let generation speed outrun verification.

## Provider notes

- OpenAI prompt guidance emphasizes agent persistence, tool use instead of guessing, planning for agentic workflows, and routine verification before handoff.
- OpenAI prompt engineering guidance treats prompting as empirical work: define criteria, run evals, and iterate.
- Claude guidance emphasizes clear direct instructions, explicit output format and constraints, ordered steps when sequence matters, relevant examples, and XML tags for complex prompts.

## Local study notes

The local Downloads set reinforces: early project guardrails create the patterns agents repeat; parallel agents need explicit ownership and review; quality bottlenecks move to verification; simple verifiable prompts outperform vague goals; overlong prompt stacks and oversized agent teams can degrade results; adversarial prompt-injection tricks are unsafe product design inputs; long-running agentic work needs plan files, validation evidence, and human-readable review checkpoints.

## OAL acceptance standard

A prompt guidance artifact is complete only when loaded from `source/skills`, rendered for Codex, Claude Code, and OpenCode, and covered by acceptance checks.
