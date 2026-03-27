# Claude Hook Mapping

## Supported Policies

- `prompt-git-context`
  hook: event `UserPromptSubmit`, script `session/prompt-git-context.mjs`
- `start-budget`
  hook: event `SessionStart`, script `session/start-budget.mjs`
- `validate-input`
  hook: event `PreToolUse`, script `pre/validate-input.mjs`
- `bash-guard`
  hook: event `PreToolUse`, matcher `Bash`, script `pre/bash-guard.mjs`
- `write-quality`
  hook: event `PostToolUse`, matcher `Write|Edit`, script `post/write-quality.mjs`
- `bash-redact`
  hook: event `PostToolUse`, matcher `Bash`, script `post/bash-redact.mjs`
- `failure-circuit`
  hook: event `PostToolUseFailure`, script `post/failure-circuit.mjs`
- `subagent-scan`
  hook: event `SubagentStop`, matcher `athena|hephaestus|nemesis|atalanta|calliope|hermes|odysseus`, script `post/subagent-scan.mjs`
- `stop-scan`
  hook: event `Stop`, script `post/stop-scan.mjs`

## Unsupported Policies

- `secret-path-guard`: No mapping is defined for this platform in the shared hook policy source.
- `staged-placeholder-guard`: No mapping is defined for this platform in the shared hook policy source.
- `staged-secret-guard`: No mapping is defined for this platform in the shared hook policy source.
- `pre-commit-test`: No mapping is defined for this platform in the shared hook policy source.
- `protected-branch-confirm`: No mapping is defined for this platform in the shared hook policy source.
- `pre-push-test`: No mapping is defined for this platform in the shared hook policy source.
