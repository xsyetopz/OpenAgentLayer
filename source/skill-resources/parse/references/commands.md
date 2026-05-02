# Parse commands

Use this reference when command text drives policy, hook behavior, RTK routing, or CI output summaries.

## Command parsing sequence

1. Split command segments at shell operators before judging safety.
2. Identify environment assignments, executable, argv, redirection, and substitutions.
3. Treat pipes, `&&`, `||`, semicolons, subshells, and command substitutions as separate policy boundaries.
4. Prefer argv arrays for execution. Use shell strings only when shell syntax is required and policy allows it.
5. Do not infer intent from substrings alone. A quoted string, filename, and executable name are different evidence.

## Output parsing sequence

1. Preserve the original exit code.
2. Extract concrete errors first.
3. Include file path, line, command, and failing assertion when present.
4. Collapse repeated stack frames and duplicate failures.
5. Report warnings only when requested or when they block release quality.

## Deny conditions

- Regex-only command enforcement when shell operators are present.
- Treating command output as proof without the command and exit code.
- Re-running or mutating from an output parser.
- Hiding non-zero exits behind summaries.

## Output contract

- `Command`: parsed segments and executable argv.
- `Exit`: original status.
- `Errors`: concise bullets with path and line when present.
- `Warnings`: only requested or release-blocking warnings.
