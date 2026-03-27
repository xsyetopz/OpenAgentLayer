# Codex Hooks Port

Codex supports project and user hook config files at `.codex/hooks.json` and `~/.codex/hooks.json`. The documented hook events relevant to this port are `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, and `Stop`. Source: <https://developers.openai.com/codex/hooks>

## openagentsbtw Hook Set

The Codex port keeps only the Claude hook behavior that maps onto documented Codex events:

- `session/start-budget.mjs`
  Checks `AGENTS.md` size and warns if Fast mode appears enabled in active config.
- `session/prompt-git-context.mjs`
  Injects lightweight git context at prompt submit time.
- `pre/bash-guard.mjs`
  Blocks broad `rm -rf`, blanket `git add`, noisy shell commands, and unsafe DNS-style checks.
- `post/bash-redact.mjs`
  Warns when Bash output appears to contain secrets or PII.
- `post/stop-scan.mjs`
  Scans modified files for placeholder code before final completion.

## Hooks We Did Not Port

The Claude package has more hook coverage, but several pieces are Claude-specific or rely on tools/events that Codex does not document in the same way:

- `pre/validate-input.mjs`
  Claude had richer multi-tool input shapes. Codex docs focus on `Bash` tool matching in hooks, so this does not carry over cleanly.
- `post/write-quality.mjs`
  Claude’s file-edit hook path could auto-format and inspect write payloads directly. Codex’s documented hook surface does not provide an equivalent file-edit event contract.
- `post/failure-circuit.mjs`
  The Claude implementation depends on a failure event path that is not part of the core Codex hook flow we verified.
- `post/subagent-scan.mjs`
  Codex has custom agents and multi-agent support, but not the same Claude `SubagentStop` hook contract in the docs we used.

## Merge Strategy

The installer copies openagentsbtw hook scripts into `~/.codex/openagentsbtw/hooks/` and merges the hook groups into `~/.codex/hooks.json`. On uninstall, it removes only entries that point at the openagentsbtw hook path.

The shared policy source now drives Claude, Codex, and OpenCode generation, but the Codex renderer still emits only the documented Codex subset above. That keeps Codex policy parity without pretending unsupported Claude-only hooks exist in Codex.

To make that difference explicit in generated artifacts, Codex now also gets:

- `codex/hooks/HOOKS.md`
- `codex/hooks/policy-map.json`

Those files list every shared policy entry as supported or unsupported for Codex, with unsupported reasons attached for the Claude-only policies that do not port cleanly.
