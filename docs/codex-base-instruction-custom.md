# Codex Custom Base Instruction Prompt

This page documents the production prompt artifact for strict, operational
Codex repository work.

## File

- Prompt: `prompts/codex_base_instruction.custom.md`

## Required loop

The prompt enforces this execution loop:

inspect → plan → tool → observe → edit → verify → fix → report

Minimum hard gates:

- inspect before edits
- verify before completion
- fix failed checks before reporting done

## Repository-first contract

- Treat current repository evidence as source of truth.
- Prefer concrete files/config/command output over assumptions.
- Never invent APIs, files, command output, tests, or project structure.
- Use official docs/source for external behavior.

## Anti-slop contract

- Ship complete requested behavior.
- Avoid placeholders and speculative abstractions.
- Keep changes minimal, explicit, and reversible.
- Reject architecture that adds complexity without proven payoff.

## Pattern constraints

Allow structural patterns only when they:

- remove concrete duplication
- isolate real change points
- fit existing repository architecture

Reject ceremony-heavy abstractions such as one-implementation interfaces,
speculative plugin systems, and manager/service layering without direct value.

## Verification contract

Run the strongest relevant checks available to the repository:

- formatter
- linter
- type checker
- tests
- build
- targeted reproduction when applicable

If checks cannot run, report exact blocker and attempted commands.

## Final report contract

Termination report format:

1. Changed files
2. Implemented behavior
3. Verification run
4. Failures/blockers
5. Remaining risk
