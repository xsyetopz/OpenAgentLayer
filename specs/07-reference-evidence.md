# Reference Evidence

This specification preserves durable conclusions from earlier OAL research
without making old product language part of current behavior.

## Status

This file is reference evidence. It is not an implementation plan and it is not a
roadmap. A conclusion here becomes current product behavior only after source,
renderer, deploy, hook, plugin, MCP, docs, and acceptance surfaces are updated as
needed.

## Preserved Conclusions

OAL requires:

- authored source records that render provider artifacts
- substantial operational agent prompts rather than shallow role cards
- route contracts with permissions, arguments, completion expectations, hook
  expectations, and provider differences
- executable hooks with deterministic fixtures
- provider-specific rendering instead of fake parity
- installer and deploy workflows that preserve user config
- manifest-backed uninstall
- plugin payload sync that works without mandatory provider CLI activation
- shared inspection so CLI, MCP, and provider tools stay aligned
- acceptance gates that prove end-to-end behavior

## Rejected Patterns

OAL MUST avoid:

- generated role cards with generic instructions
- source records that no renderer consumes
- docs that describe behavior not implemented in code
- compatibility naming from old reference material
- provider stubs that imply unsupported capabilities exist
- broad monolithic generator logic without package ownership
- hook behavior expressed only as prompt text
- install scripts that require interactive provider CLIs for safe file payload
  writes
- message text that hides the contract or lacks the next valid action

## Provider Research Summary

Codex, Claude Code, and OpenCode expose different native surfaces. OAL should
use the richest stable surface each provider supports, then validate that
surface with fixtures or installed-state checks.

Key provider evidence categories:

- Codex config schema, agent TOML behavior, `AGENTS.md`, plugin marketplace, and
  hook behavior
- Claude Code settings, hooks, skills, subagents, slash commands, plugins, and
  MCP registration behavior
- OpenCode config schema, tools, custom tools, agents, commands, plugins, JSONC,
  and MCP config

When provider behavior is uncertain, inspect current official docs or schemas
before changing renderer behavior.

## Future-Input Rule

External repositories and third-party ideas MAY inform OAL, but they MUST NOT
enter runtime dependencies or product claims until:

1. source evidence is inspected
2. the OAL-owned package boundary is named
3. provider impact is specified
4. acceptance evidence is added
5. docs/specs describe current behavior only
