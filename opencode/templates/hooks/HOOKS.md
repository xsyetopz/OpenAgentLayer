# OpenCode Hook Mapping

## Supported Policies

- `bash-guard`
  plugin: event `tool.execute.before`, tools `bash`, field `command`
- `secret-path-guard`
  plugin: event `tool.execute.before`, tools `read`, `edit`, `write`, field `filePath`
- `staged-placeholder-guard`
  git-hook: `pre-commit` via `staged-text-block`
- `staged-secret-guard`
  git-hook: `pre-commit` via `staged-diff-pattern-block`
  git-hook: `pre-commit` via `staged-path-block`
- `pre-commit-test`
  git-hook: `pre-commit` via `package-test`
- `protected-branch-confirm`
  git-hook: `pre-push` via `branch-confirm`
- `pre-push-test`
  git-hook: `pre-push` via `package-test`

## Unsupported Policies

- `prompt-git-context`: No mapping is defined for this platform in the shared hook policy source.
- `start-budget`: No mapping is defined for this platform in the shared hook policy source.
- `validate-input`: OpenCode's documented plugin events do not expose the same pre-tool structured input contract this hook expects.
- `write-quality`: OpenCode plugins can intercept tool execution, but this repo does not have a documented write-diagnostics equivalent wired into the shared policy.
- `bash-redact`: No mapping is defined for this platform in the shared hook policy source.
- `failure-circuit`: OpenCode plugin events used here do not include a Claude-style post-tool failure hook contract.
- `subagent-scan`: OpenCode does not expose a Claude-style subagent-stop hook surface in the documented plugin and git-hook interfaces used here.
- `stop-scan`: No mapping is defined for this platform in the shared hook policy source.
