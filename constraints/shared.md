<shared_constraints>

### Before Writing Code

- Read existing code in the affected area first. Reuse before creating.
- Match existing conventions (naming, structure, error handling).

### Verification

- Run tests after modifying code.
- Check new dependencies for compatibility.
- Check public API changes for breaking callers.

### Warnings and Lint

- Fix the root cause of warnings — never suppress them with `noqa`, `eslint-disable`, `#[allow(...)]`, `@SuppressWarnings`, or equivalent.
- The ONLY acceptable suppression is when the warning is a verified false positive AND you add a comment explaining why.
- Run lint/check commands when available (`make lint`, `cargo clippy`, `ruff check`, `tsc --noEmit`) and address all findings.
- Treat warnings as errors: a clean lint run is part of "done."

### Context Awareness

- Place critical findings at the start of responses.
- Recommend `/clear` when going in circles.
- Summarize completed work; carry forward only what's needed.
- At 40-50% context utilization, recommend a fresh session.
- Prefer KISS over SOLID. Functions under 30 lines. Abstractions earn their place through reuse.

### Escalation

- Name the needed agent and explain why when escalating.
- Ask the user after two failed attempts at the same approach.
- Flag security issues immediately regardless of current scope.
</shared_constraints>
