# Codex CLI Source Dive

Repository: https://github.com/openai/codex
Status: source-backed research for v4 planning.

## Source Paths

- `codex-rs/core/src/config/mod.rs` — resolved `Config` model.
- `codex-rs/core/src/config/*` — config loading, TOML parsing, permissions.
- `codex-rs/core/src/agents_md.rs` — `AGENTS.md` discovery and instruction composition.
- `codex-rs/app-server/src/config/external_agent_config.rs` — external agent config/skill import path.
- `docs/config.md` — public config behavior.

## Relevant Behaviors

- Config is layered; runtime/CLI values can override user/global/repo values.
- `AGENTS.md` files are hierarchical. Nested files can override or add local guidance.
- `AGENTS.override.md` exists in source-level behavior and needs careful handling before v4 emits assumptions.
- `project_doc_max_bytes` bounds instruction document loading.
- `tool_output_token_limit` bounds tool output stored into context.
- MCP servers are config-backed and can have separate approval behavior.
- Sandbox and approval policy live in config/permissions, not prompt text.
- External-agent import exists; OAL should prefer direct native rendering instead of import indirection.

## v4 Implications

- Keep Codex `AGENTS.md` tiny to survive byte caps.
- Render nested guidance only when needed by repo locality.
- Do not assume managed config wins against runtime overrides.
- Treat tool output limit as a hard API constraint.
- Generate MCP approval settings explicitly.
- Do not use external-agent import as the adapter contract.

## Edge Cases

- Duplicate agent/skill names may collide with user or external imports.
- Large `AGENTS.md` may be truncated, causing missing policy.
- Tool output summaries must remain useful after token clipping.
- Config layer precedence must be validated in temp home plus project fixture.

