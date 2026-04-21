# Architecture

openagentsbtw now treats canonical source as small authored catalogs plus per-skill bodies.

## Source Layout

- `source/agents/<agent>/`
  Agent metadata and prompt. One directory per agent.
- `source/skills/<skill>/`
  Skill metadata, body, references, helper scripts, and optional overlays.
- `source/commands/codex/*.json`
- `source/commands/copilot/*.json`
- `source/commands/opencode/*.json`
  One file per generated command surface.
- `source/catalog/loaders.mjs`
  Shared catalog loader primitives.
- `source/catalog/items.mjs`
  Unified catalog entrypoint for agents, skills, commands, hook policies, and guidance.

## Generated Targets

- `optional-ides/`
  Generated optional IDE rules/instructions for Roo Code, Cline, Cursor, Junie, and Antigravity.

## Generator Rule

`scripts/generate.mjs` should stay thin orchestrator.

Heavy logic belongs in focused renderers or loaders. If file becomes grab-bag, split it.

## Upstream Dependencies

- `third_party/caveman` is pinned git submodule reference to upstream caveman.
- `source/caveman.mjs` stores pinned ref metadata used by generation/runtime checks.

## Naming Rule

- public command names should read like actions
- skills should describe one job
- routes should not bundle policy and task into one opaque word

Examples:

- `document` instead of `docs`
- `deslop` instead of old longer name
- `design-polish` instead of meme or vendor-specific name
- modifiers like `--speed fast` or `--runtime long` instead of dedicated one-off routes

## Workflow

Research -> Plan -> Execute -> Review

`orchestrate` coordinates this flow when needed. It is not catch-all delivery bucket.
