# Caveman Commit

Draft a terse commit message only when the user explicitly asks for Caveman-style commit wording.

## Rules

- Do not run `git commit`.
- Do not stage files.
- Return one primary commit message draft and, if useful, one shorter variant.
- Preserve exact scope/module names from the repo.
- Stay concise, but keep the message unambiguous.

## Format

Prefer Conventional Commits when the repo is already using them:

```text
type(scope): short caveman summary
```

Example:

```text
fix(codex): gate explain-only completions
```
