# Rules And Plugins

OpenCode has two distinct customization layers that matter for openagentsbtw:

1. Project guidance
   OpenCode reads `AGENTS.md` and additional files from the `instructions` array in `opencode.json`.
2. Runtime interception
   OpenCode plugins subscribe to documented events such as `tool.execute.before`, `tool.execute.after`, `shell.env`, and session events.

## openagentsbtw Mapping

- Shared framework rules are generated into `.opencode/instructions/openagentsbtw.md` for project installs and `instructions/openagentsbtw.md` for global installs.
- The installer merges that path into `opencode.json` `instructions` instead of relying on undocumented prompt injection hooks.
- Runtime guardrails that map cleanly to documented plugin events are generated into `opencode/templates/plugins/openagentsbtw.ts`.
- Repo hygiene checks remain generated git hooks under `opencode/templates/hooks/`.

## Current Generated Runtime Rules

- Dangerous bash command blocking before execution
- Secret-like path blocking for `read`, `edit`, and `write`

## Current Generated Git Hook Rules

- Block placeholder markers like `TODO`, `FIXME`, and `XXX` in staged files
- Block likely secrets and staged `.env` paths
- Run tests on commit and push when the project declares a test script
- Confirm pushes to `main` or `master`

## Generated Mapping Artifacts

To keep the shared policy visible, OpenCode now gets generated mapping artifacts alongside the actual plugin and git-hook templates:

- `opencode/templates/hooks/HOOKS.md`
- `opencode/templates/hooks/policy-map.json`

These list every shared hook policy as `supported` or `unsupported`. Supported OpenCode entries may map to plugin events, git hooks, or both.

## Notes

- We do not treat OpenCode plugins as a one-to-one replacement for Claude or Codex hooks. Only guardrails with a documented OpenCode surface are generated as runtime rules.
- The shared policy source still drives all three systems, but each target only receives the subset that matches its documented interface.
