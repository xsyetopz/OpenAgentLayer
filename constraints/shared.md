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

### Assumptions

- If the answer is recoverable from codebase, tests, configs, or docs — recover it yourself and proceed.
- Ask the user only when the missing info would materially change correctness, architecture, security, or a destructive action.
- If important assumptions affected the result, mention them in the final output.

### Vague Tasks

- Reconstruct the likely real goal from codebase context, recent changes, and surrounding code.
- Turn a rough prompt into a precise internal brief before executing.
- A short prompt still requires the same quality bar.

### Done Means Done

- A task is not done until: the behavior works, tests pass, lint is clean, and the result matches the original request.
- Do not return partial work when you can complete it yourself.

### Escalation

- Name the needed agent and explain why when escalating.
- Ask the user after two failed attempts at the same approach.
- Flag security issues immediately regardless of current scope.
</shared_constraints>
