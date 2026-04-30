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
- Model plan: source-owned profile, model, effort, and role assignment plan.
- Surface config: source-owned native config allowlist and default profile contract.
- Adapter: renderer and installer bridge for a target surface.
- Surface: agentic tool or IDE target.

## Required package shape

OAL uses package-module architecture. Each package owns one concept boundary and exposes typed modules through `package.json` exports.

- `packages/types/`: source record, model, surface, route, and policy types.
- `packages/diagnostics/`: diagnostics, coercion, and validation message helpers.
- `packages/source/`: TOML/Markdown source loader, source graph, and source validation.
- `packages/render/`: deterministic render context and write-plan diff.
- `packages/adapter-contract/`: adapter interfaces and bundle contracts.
- `packages/adapters/`: surface adapter package with provider directories for Codex, Claude Code, and OpenCode plus shared pure adapter helpers.
- `packages/runtime/`: self-contained hook/runtime guard library.
- `packages/install/`: managed-file manifest, config merge, install, and uninstall.
- `packages/cli/`: `oal` binary and command wiring only.
- `packages/testkit/`: shared test fixtures and assertions.

CLI code must not own source loading, rendering, adapter, runtime, or installer behavior.

Dependency direction is intentional:

- `types` and `diagnostics` sit at the bottom.
- `source` depends on `types` and `diagnostics`.
- `adapters` depends on `adapter-contract`, `runtime`, and `types`; provider code lives under `packages/adapters/src/providers/<surface>/`.
- adapter providers use shared helpers from `packages/adapters/src/shared/`.
- `render` depends on `source`, `adapters`, and `adapter-contract` for registry orchestration.
- `install` depends on generated bundles and managed-file manifests.
- `cli` depends on package APIs only and must not duplicate package logic.

Rationale: OAL must be extensible by adding or replacing packages. A monolithic package would hide ownership, make adapter growth brittle, and make testing harder. Package boundaries make each surface and compiler stage independently reviewable.

## Module size governance

Package code and package test files must stay below 1500 lines. A file that would cross that threshold must split by ownership: command family, provider surface, validation domain, runtime policy, installer concern, or test scenario group.

## Test package shape

Package tests live outside `src/`:

- `packages/<name>/__tests__/src/**/*.test.ts`
- `packages/<name>/__tests__/_helpers/**/*.ts`

Test paths mirror the package `src/` structure. Shared helpers used by multiple packages move to `packages/testkit/`.

## Required CLI capabilities

- `oal check`
- `oal render --out <dir>`
- `oal install --surface <surface> --scope <scope>`
- `oal uninstall --surface <surface> --scope <scope>`
- `oal doctor`

Installer commands accept `--surface codex|claude|opencode|all`, `--scope project|global`, and optional `--target <dir>`. Global install requires explicit `--target`.

## Links

- [Source model](source-model.md)
- [Adapter contract](adapter-contract.md)
- [Installer runtime](installer-runtime.md)
