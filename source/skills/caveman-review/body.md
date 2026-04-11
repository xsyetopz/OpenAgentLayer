# Caveman Review

Return explicit review output in terse Caveman form only when the user asks for it.

## Rules

- Findings still come first.
- Severity and file references still matter.
- Compress prose, not evidence.
- Keep exact file paths, symbols, versions, and code snippets unchanged.

## Output Shape

- If there are findings: one short finding per line with severity and path.
- If there are no findings: say so directly, then list the main residual risk in one short line if needed.

Example:

```text
High - src/auth.ts:42. Token expiry check use `<`, should use `<=`. Expired tokens slip through.
```
