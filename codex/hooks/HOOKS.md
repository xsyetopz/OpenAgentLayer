# Codex Hook Mapping

## Supported Policies

- `prompt-git-context`
  hook: event `UserPromptSubmit`, script `session/prompt-git-context.mjs`
- `start-budget`
  hook: event `SessionStart`, matcher `startup|resume`, script `session/start-budget.mjs`
- `bash-guard`
  hook: event `PreToolUse`, matcher `Bash`, script `pre/bash-guard.mjs`
- `bash-redact`
  hook: event `PostToolUse`, matcher `Bash`, script `post/bash-redact.mjs`
- `stop-scan`
  hook: event `Stop`, script `post/stop-scan.mjs`

## Unsupported Policies

- `validate-input`: Codex PreToolUse currently intercepts Bash only; Claude's richer multi-tool input validation does not map cleanly.
- `write-quality`: Codex PostToolUse is currently Bash-only, so there is no documented file-write hook payload for this policy.
- `failure-circuit`: Codex does not document a PostToolUseFailure event in the verified hook flow used by this repo.
- `subagent-scan`: Codex has multi-agent support, but the documented hook surface used here does not expose Claude's SubagentStop event contract.
- `secret-path-guard`: No mapping is defined for this platform in the shared hook policy source.
- `staged-placeholder-guard`: No mapping is defined for this platform in the shared hook policy source.
- `staged-secret-guard`: No mapping is defined for this platform in the shared hook policy source.
- `pre-commit-test`: No mapping is defined for this platform in the shared hook policy source.
- `protected-branch-confirm`: No mapping is defined for this platform in the shared hook policy source.
- `pre-push-test`: No mapping is defined for this platform in the shared hook policy source.
