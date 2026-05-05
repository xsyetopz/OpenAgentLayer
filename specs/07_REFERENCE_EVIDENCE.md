# Reference Evidence

This file keeps useful conclusions from older research without making old
product language part of current docs.

## Preserve

The reference system proved that OAL needs:

- authored source records that render provider artifacts
- substantial operational agent prompts
- route contracts with permissions and completion expectations
- executable hooks with fixtures
- provider-specific rendering instead of fake parity
- installer and deploy workflows that preserve user config
- acceptance gates that prove end-to-end behavior

## Avoid

OAL must avoid:

- generated role cards with shallow instructions
- source records that no renderer consumes
- docs that describe behavior not implemented in code
- compatibility naming from old reference material
- provider stubs that imply unsupported capabilities exist
- broad monolithic generator logic without package ownership

## Provider Research Summary

Codex, Claude Code, and OpenCode expose different native surfaces. OAL should
use the richest stable surface each provider supports, then validate that surface
with fixtures or installed-state checks.

Key provider references:

- Codex config schema and `AGENTS.md` documentation
- Claude Code settings, hooks, skills, subagents, slash commands, and plugins
- OpenCode config schema, tools, custom tools, agents, commands, plugins, and MCP

When provider behavior is uncertain, inspect current official docs or schemas
before changing renderer behavior.
