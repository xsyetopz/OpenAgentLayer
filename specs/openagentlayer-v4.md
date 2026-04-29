# OpenAgentLayer v4

Purpose: top-level normative spec for OpenAgentLayer v4.

Authority: root spec.

## Definition

OpenAgentLayer is a portable agent behavior layer.

It owns:

- source records for agents, skills, commands, policies, guidance, model routes, and install surfaces;
- compiler pipeline that normalizes source records into a source graph;
- surface adapters that render native files for agentic tools;
- installer/runtime that places managed files and executes runtime guards;
- validation that detects source drift, render drift, policy drift, and documentation drift.

It does not own:

- model provider execution;
- interactive chat loop;
- application code architecture;
- repository business logic;
- user approval policy beyond generated configuration and runtime guard integration.

## Core invariants

- Source graph is canonical.
- Adapters are pure functions over normalized source graph plus render options.
- Runtime guards enforce behavior where surfaces provide hooks.
- Specs define behavior. Docs explain. Plans sequence work.
- Surface-native formats are outputs, not source truth.
- Generated artifacts must be deterministic.
- Install must be reversible through a managed-file manifest.

## Supported source concepts

- Agent: role-specific behavior package.
- Skill: reusable procedural capability package.
- Command: user-facing route into role+skill+contract behavior.
- Policy: enforceable rule with category, event intent, severity, and runtime script.
- Guidance: high-authority instruction body for a surface or project.
- Adapter: renderer and installer bridge for a target surface.
- Surface: agentic tool or IDE target.

## Required package shape

- `packages/oal/src/schema/`
- `packages/oal/src/catalog/`
- `packages/oal/src/render/`
- `packages/oal/src/adapters/`
- `packages/oal/src/runtime/`
- `packages/oal/src/install/`
- `packages/oal/src/cli.ts`

## Required CLI capabilities

- `oal check`
- `oal render --out <dir>`
- `oal install --surface <surface> --scope <scope>`
- `oal uninstall --surface <surface> --scope <scope>`
- `oal doctor`

## Links

- [Source model](source-model.md)
- [Adapter contract](adapter-contract.md)
- [Installer runtime](installer-runtime.md)

