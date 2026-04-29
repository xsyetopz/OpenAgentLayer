# Adapter contract

Purpose: define how source graph becomes native surface artifacts.

Authority: normative.

## Adapter interface

Each adapter must implement:

- `id`
- `surface`
- `supports(record)`
- `render(record, context)`
- `renderBundle(graph, context)`
- `validateBundle(bundle)`
- `installPlan(bundle, options)`

## Adapter rules

- Adapter output must be deterministic.
- Adapter output must be native to the target surface.
- Adapter may omit unsupported capabilities only when validation reports the omission.
- Adapter must expose unsupported policy mappings in generated diagnostics.
- Adapter must not mutate source graph.
- Adapter must not read global user config during render.
- Adapter-generated config must pass the surface-specific allowlist from [surface config contract](surface-config-contract.md).

## Required adapters

- Codex adapter
- Claude adapter
- OpenCode adapter
- Copilot adapter
- Optional IDE adapter

## Surface bundle contents

Each surface bundle may contain:

- agents;
- skills;
- commands;
- instructions;
- hooks;
- config fragments;
- plugin files;
- installer metadata;
- validation metadata.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
