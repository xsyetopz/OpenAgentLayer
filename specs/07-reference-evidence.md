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
- provider-specific rendering with explicit capability reports
- installer and deploy workflows that preserve user config
- manifest-backed uninstall
- plugin payload sync that works without mandatory provider CLI activation
- shared inspection so CLI, MCP, and provider tools stay aligned
- acceptance gates that prove end-to-end behavior

## Product-Positive Patterns

OAL stays strongest with these patterns:

- generated agents with operational instructions and acceptance evidence
- source records consumed by renderers
- docs that describe implemented behavior
- current OAL naming
- provider capability reports tied to real surfaces
- package-owned generator logic
- hook behavior expressed as executable runtime decisions
- install scripts that write safe file payloads independently of interactive
  provider CLI activation
- message text that names the contract and next valid action

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

External repositories and third-party ideas MAY inform OAL. They become runtime
dependencies or product claims after:

1. source evidence is inspected
2. the OAL-owned package boundary is named
3. provider impact is specified
4. acceptance evidence is added
5. docs/specs describe current behavior only
