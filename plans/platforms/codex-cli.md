# Codex CLI Platform Spec

Verified date: 2026-04-28.

## References

- https://developers.openai.com/codex/
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/subagents
- https://github.com/openai/codex

## Source Notes

- `codex-rs/core/src/config/mod.rs` resolves config into runtime behavior.
- `codex-rs/core/src/agents_md.rs` owns `AGENTS.md` discovery and composition.
- `codex-rs/app-server/src/config/external_agent_config.rs` imports external agent config; v4 must not use that as compatibility path.

## Native Surfaces

| Surface   | Level   | Notes                                  |
| --------- | ------- | -------------------------------------- |
| rules     | native  | `AGENTS.md` and config.                |
| agents    | native  | custom agent definitions.              |
| skills    | native  | plugin skills.                         |
| commands  | native  | slash/custom command surfaces.         |
| hooks     | native  | JSON hook definitions.                 |
| MCP       | native  | config-managed servers.                |
| workflows | partial | render as commands plus skills/agents. |

## Context and Token Controls

- `project_doc_max_bytes` can cap loaded project instructions.
- `tool_output_token_limit` can cap tool output kept in context.
- Config layer precedence means runtime or CLI overrides can beat managed config.
- MCP approval can differ from shell approval.

## Model Policy

Allowed OAL Codex models from 2026-04-28 user-provided runtime output:

- `gpt-5.5`
- `gpt-5.4-mini`
- `gpt-5.3-codex`

Routing policy:

- Use `gpt-5.5` for complex planning, research, and orchestration.
- Use `gpt-5.3-codex` for coding-specialist implementation and review.
- Use `gpt-5.4-mini` for bounded utility and fast-small work.
- Do not emit Codex routes outside OAL model policy in config, docs, defaults, or roadmap tasks.

## Adapter Plan

- Render tiny `AGENTS.md`.
- Render managed config from source.
- Render plugin skills.
- Render custom agents.
- Render hooks backed by runner.
- Keep model/profile logic explicit and sourced.
- Keep source-generated output useful under token and byte caps.
- Never rely on external-agent import for v3 migration.

## Validation

- managed config parse test
- plugin cache install smoke
- hook execution smoke
- temp-home uninstall smoke
- config precedence fixture with project and home config
- token-limit fixture for large tool output
