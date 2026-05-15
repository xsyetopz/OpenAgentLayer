# Use the CLI

Run commands from a source checkout with `bun run <script> -- ...`, or use
`oal ...` after installing the shim.

## Safe First Commands

```bash
bun run oal:check
bun run oal:preview -- --provider all
bun run oal:deploy -- --target /path/to/project --scope project --provider all --dry-run
```

Apply deploy only after the dry-run paths match the target you expect.

## Interactive Mode

Run without a command in a TTY, or call `interactive` directly:

```bash
bun packages/cli/src/main.ts
bun packages/cli/src/main.ts interactive
```

Interactive mode is a tiny TUI. It first asks for a category, then asks for the
workflow inside that category:

- Start: setup, repair
- Inspect: status, validate
- Artifacts: preview, deploy
- Extend: official skills, plugin payloads
- Manage: profiles, uninstall

Use Search workflows from the hub to filter by label, action, or hint. Nested
workflow prompts include Back to categories, and the hub includes Quit.

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
bun packages/cli/src/main.ts codex route review-changes --dry-run "audit the current diff"
bun packages/cli/src/main.ts codex peer batch --dry-run "investigate, implement, validate, and review-changes"
```

`agent` runs one generated Codex custom agent. `route` maps an OAL route to its owning generated agent. `peer batch` restores the v3-style coordinated run shape with orchestrator, validate, worker, and review-changes passes, plus a `.openagentlayer/codex-peer/<run-id>/` write-handoff directory. Use `--dry-run` to inspect the plan before launching Codex.

Use `codex-usage` to inspect local Codex state for root-session quota drains before continuing broad autonomous work:

```bash
bun packages/cli/src/main.ts codex-usage --project "$PWD"
bun packages/cli/src/main.ts codex-usage --project "$PWD" --reset 2026-05-12T00:27:00Z --next-reset 2026-05-19T00:27:00Z --weekly-used-percent 45
```

The report groups weekly usage by Codex `thread_source`, model, and reasoning effort, then prints the top draining rollout paths. With reset-window flags, it also prints reserve/deficit pacing and can set a failing exit code through `--fail-at-deficit-percent`. OAL uses this evidence with the generated parent-session quota guard: broad root sessions should stop at compaction, repeated command loops, slash-command goal loops without new evidence, or high used-token counts, write a Continuation Record, and move independent work to native Codex subagents, `oal codex peer batch`, or a fresh bounded session. When Codex goals are enabled, this stop is session-complete write-handoff only; it pauses the loop and preserves usage accounting, but it is not COMPLETE-complete product completion unless the original objective has no remaining requirements.

## Model Plans vs Codex Plan Mode

Use plan flags when rendering subscription-specific model routes:

```bash
bun run oal:preview -- --provider codex --plan pro-20
bun run oal:preview -- --provider claude --plan max-20-long
bun run oal:preview -- --provider opencode --plan opencode-auto
```

Codex Plan mode and non-Plan mode are runtime UI states. OAL `--plan` and
`--codex-plan` are rendered subscription/model-routing presets that control
profile models, reasoning efforts, agent caps, and runtime caps. Default,
`plus`, and `pro-5` parent profiles use `gpt-5.4` for quota-sensitive sustained
work; `pro-20` keeps `gpt-5.5` unless `--codex-profile-model gpt-5.4` is set.
Implementation workers stay on `gpt-5.3-codex`; utility/light profiles use
`gpt-5.4-mini`.
