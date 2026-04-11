# Rules And Plugins

OpenCode has two distinct customization layers that matter for openagentsbtw:

1. Project guidance
   OpenCode reads `AGENTS.md` and additional files from the `instructions` array in `opencode.json`.
2. Runtime interception
   OpenCode plugins subscribe to documented events such as `chat.message`, `command.execute.before`, `tool.execute.before`, `tool.execute.after`, `experimental.session.compacting`, and `experimental.text.complete`.

## openagentsbtw Mapping

- Shared framework rules are generated into `.opencode/instructions/openagentsbtw.md` for project installs and `instructions/openagentsbtw.md` for global installs.
- The installer merges that path into `opencode.json` `instructions` instead of relying on undocumented prompt injection hooks.
- Runtime guardrails, route contracts, compaction context, and final-response completion gates are generated into `opencode/templates/plugins/openagentsbtw.ts`.
- Repo hygiene checks remain generated git hooks under `opencode/templates/hooks/`.
- Native OpenCode agents and continuation surfaces stay enabled; openagentsbtw adds role-specific agents and commands on top of them.

## Current Generated Runtime Rules

- Route classification for `openagents-*` commands, Greek-role agents, native `task` subagents, and built-in OpenCode agent selections
- Dangerous bash command blocking before execution
- RTK enforcement for rewritable bash commands when `rtk` is installed and `RTK.md` is present
- Secret-like path blocking for `read`, `edit`, and `write`
- Production-shaped compaction context that preserves route, blockers, edits, tests, and `task_id` continuity
- Final-response gating that turns invalid implementation/test completions into strict `BLOCKED:` results

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

- We do not treat OpenCode plugins as a one-to-one replacement for Claude or Codex hooks. The runtime layer uses only the subset of documented OpenCode surfaces needed for route tracking, continuity, and completion gating.
- The shared policy source still drives all three systems, but each target only receives the subset that matches its documented interface.
- Context7 support is CLI-only in openagentsbtw (`ctx7` wrapper) and is routed via generated instruction guidance, not a managed OpenCode MCP block.
- OpenCode continuity is native-first: prefer `opencode --continue`, `/sessions`, `/compact`, and `task_id` reuse over handoff-style exports.
