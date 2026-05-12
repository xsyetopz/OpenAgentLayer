# Use the CLI

Run commands from a source checkout with `bun run <script> -- ...`, or use
`oal ...` after installing the shim.

## Safe First Commands

```bash
bun run check
bun run preview -- --provider all
bun run deploy -- --target /path/to/project --scope project --provider all --dry-run
```

Apply deploy only after the dry-run paths match the target you expect.

## Inspect OAL

Use `inspect` for read-only product evidence:

```bash
bun packages/cli/src/main.ts inspect capabilities
bun packages/cli/src/main.ts inspect manifest
bun packages/cli/src/main.ts inspect generated-diff
bun packages/cli/src/main.ts inspect release-witness
```

`oal-inspect` is also available as an OAL-owned MCP server:

```bash
bun packages/cli/src/main.ts mcp serve oal-inspect
```

## Codex delegation

Use `codex` for OAL-managed Codex role runs:

```bash
bun packages/cli/src/main.ts codex agent hermes --dry-run "map runtime hooks"
bun packages/cli/src/main.ts codex route review --dry-run "audit the current diff"
bun packages/cli/src/main.ts codex peer batch --dry-run "investigate, implement, validate, and review"
```

`agent` runs one generated Codex custom agent. `route` maps an OAL route to its owning generated agent. `peer batch` restores the v3-style coordinated run shape with orchestrator, validate, worker, and review passes, plus a `.openagentlayer/codex-peer/<run-id>/` handoff directory. Use `--dry-run` to inspect the plan before launching Codex.

Use `codex-usage` to inspect local Codex state for root-session quota drains before continuing broad autonomous work:

```bash
bun packages/cli/src/main.ts codex-usage --project "$PWD"
```

The report groups weekly usage by Codex `thread_source`, model, and reasoning effort, then prints the top draining rollout paths. OAL uses this evidence with the generated parent-session quota guard: broad root sessions should stop at compaction, repeated command loops, or high used-token counts, write a Continuation Record, and move independent work to `oal codex peer batch`, OpenDex/Symphony, or a fresh bounded session. When Codex goals are enabled, this stop is session-complete handoff only; it pauses the loop and preserves usage accounting, but it is not COMPLETE-complete product completion unless the original objective has no remaining requirements.

## Model Plans

Use plan flags when rendering subscription-specific model routes:

```bash
bun run preview -- --provider codex --plan pro-20
bun run preview -- --provider claude --plan max-20-long
bun run preview -- --provider opencode --plan opencode-auto
```

Codex plan mode and edit mode are separate. OAL renders Codex reasoning values
from `low` through `high`; `minimal` is not a Codex effort value, and `xhigh`
is not emitted. Generated Codex profiles use `gpt-5.5` for orchestration and
semantic planning/observation, while implementation workers stay on
`gpt-5.3-codex` and utility/light subagent profiles use `gpt-5.4-mini`.
