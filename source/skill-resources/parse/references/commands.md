# Command parsing

Parse command strings into structure before policy decisions.

Segments:

1. Split shell operators and control operators: `|`, `&&`, `||`, `;`, subshells.
2. Preserve quoted strings as arguments.
3. Identify environment assignments and redirections.
4. Identify executable and argv per segment.
5. Distinguish quoted strings, filenames, and executable names as separate evidence.

Safety output:

- normalized executable
- argv list
- shell features present
- cwd
- policy decision and reason

Noisy logs:

- capture command and exit code
- extract actionable errors and file paths
- summarize repeated frames
- report warnings when requested or when they affect release quality

Evidence anti-patterns:

- substring-only command classification
- command output proof includes command and exit code
- truncation hiding the first error
