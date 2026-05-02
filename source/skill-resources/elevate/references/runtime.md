# Elevate runtime

Use privileged execution only when ordinary sandboxed shell execution cannot run a required host command.

## Required sequence

1. State the blocked command and why normal shell execution is insufficient.
2. Convert the command to argv. Do not pass shell strings.
3. Confirm the executable is allowlisted by the OAL privileged runtime.
4. Confirm `cwd` is inside the repo or target root.
5. Run dry-run first and inspect the returned argv and cwd.
6. Run the real command only after dry-run evidence matches intent.
7. Report command, cwd, exit code, and output evidence.

## Deny conditions

- The command requires a shell pipeline, redirection, command substitution, glob expansion, or compound statement.
- The cwd escapes the allowed root.
- The executable is not in the runtime allowlist.
- The request deletes files, changes git history, publishes, or signs artifacts without explicit user intent.
- The task can be completed with normal guarded shell execution.

## Output contract

- `Attempted`: normal command and privileged dry-run command.
- `Evidence`: argv, cwd, allowlist match, and dry-run result.
- `Result`: real command exit code and relevant output, or a blocker.
